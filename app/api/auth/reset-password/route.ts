import { NextRequest, NextResponse } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import type { DocumentReference, DocumentData } from 'firebase-admin/firestore'
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin'
import { apiError, apiLog } from '@/utils/debugLogger'

interface PasswordResetRecord {
    userId: string
    email?: string | null
    expiresAt?: number
    userRef: DocumentReference<DocumentData>
    data: DocumentData
}

function validatePassword(password: string): string | null {
    if (!password || password.trim().length < 8) {
        return 'Password must be at least 8 characters long.'
    }

    if (password.length > 256) {
        return 'Password is too long.'
    }

    return null
}

async function findUserByResetToken(token: string): Promise<PasswordResetRecord | null> {
    const db = getAdminDb()
    const snapshot = await db
        .collection('users')
        .where('passwordResetToken', '==', token)
        .limit(1)
        .get()

    if (snapshot.empty) {
        return null
    }

    const doc = snapshot.docs[0]
    const data = doc.data()

    return {
        userId: doc.id,
        email: data?.profile?.email || data?.email || null,
        expiresAt: data?.passwordResetTokenExpiry,
        userRef: doc.ref,
        data,
    }
}

export async function GET(request: NextRequest) {
    try {
        const token = request.nextUrl.searchParams.get('token')

        if (!token) {
            return NextResponse.json({ error: 'Missing token' }, { status: 400 })
        }

        const record = await findUserByResetToken(token)

        if (!record) {
            return NextResponse.json(
                { valid: false, reason: 'invalid_token', message: 'Reset link is invalid.' },
                { status: 404 }
            )
        }

        if (!record.expiresAt || record.expiresAt < Date.now()) {
            return NextResponse.json(
                { valid: false, reason: 'expired', message: 'Reset link has expired.' },
                { status: 400 }
            )
        }

        return NextResponse.json({
            valid: true,
            email: record.email,
            expiresAt: record.expiresAt,
        })
    } catch (error) {
        apiError('[Auth] Failed to validate password reset token:', error)
        return NextResponse.json({ error: 'Unable to validate token' }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { token, password } = body || {}

        if (!token || !password) {
            return NextResponse.json({ error: 'Token and password are required.' }, { status: 400 })
        }

        const passwordError = validatePassword(password)
        if (passwordError) {
            return NextResponse.json({ error: passwordError }, { status: 400 })
        }

        const record = await findUserByResetToken(token)

        if (!record) {
            return NextResponse.json(
                { error: 'Reset link is invalid or has already been used.' },
                { status: 404 }
            )
        }

        if (!record.expiresAt || record.expiresAt < Date.now()) {
            return NextResponse.json(
                { error: 'Reset link has expired. Please request a new one.' },
                { status: 400 }
            )
        }

        const auth = getAdminAuth()
        await auth.updateUser(record.userId, { password })

        await record.userRef.update({
            passwordResetToken: FieldValue.delete(),
            passwordResetTokenExpiry: FieldValue.delete(),
            lastPasswordResetAt: Date.now(),
        })

        apiLog('[Auth] Password reset completed for user', record.userId)

        return NextResponse.json({
            success: true,
            message: 'Password updated successfully.',
        })
    } catch (error) {
        apiError('[Auth] Failed to reset password:', error)
        return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 })
    }
}

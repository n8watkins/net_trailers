import { NextRequest, NextResponse } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import type { DocumentReference, DocumentData } from 'firebase-admin/firestore'
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin'
import { apiError, apiLog } from '@/utils/debugLogger'
import { applyCsrfProtection } from '@/lib/csrfProtection'

interface VerificationRecord {
    userId: string
    userRef: DocumentReference<DocumentData>
    profileRef: DocumentReference<DocumentData>
    data: DocumentData
    expiresAt?: number
    pendingEmail?: string | null
}

async function findUserByVerificationToken(token: string): Promise<VerificationRecord | null> {
    const db = getAdminDb()
    const snapshot = await db
        .collection('users')
        .where('emailVerificationToken', '==', token)
        .limit(1)
        .get()

    if (snapshot.empty) {
        return null
    }

    const doc = snapshot.docs[0]
    const data = doc.data()

    return {
        userId: doc.id,
        userRef: doc.ref,
        profileRef: db.collection('profiles').doc(doc.id),
        data,
        expiresAt: data?.emailVerificationTokenExpiry,
        pendingEmail: data?.pendingEmailVerification || data?.profile?.email || data?.email || null,
    }
}

export async function POST(request: NextRequest) {
    // Apply CSRF protection
    const csrfResponse = applyCsrfProtection(request)
    if (csrfResponse) return csrfResponse

    try {
        const body = await request.json()
        const { token } = body || {}

        if (!token) {
            return NextResponse.json({ error: 'Missing verification token.' }, { status: 400 })
        }

        const record = await findUserByVerificationToken(token)

        if (!record) {
            return NextResponse.json(
                { error: 'Verification link is invalid or has already been used.' },
                { status: 404 }
            )
        }

        if (!record.expiresAt || record.expiresAt < Date.now()) {
            return NextResponse.json(
                { error: 'Verification link has expired. Please request a new one.' },
                { status: 400 }
            )
        }

        const auth = getAdminAuth()
        const updatePayload: { emailVerified: boolean; email?: string } = {
            emailVerified: true,
        }

        if (record.pendingEmail) {
            updatePayload.email = record.pendingEmail
        }

        await auth.updateUser(record.userId, updatePayload)

        const updates: Record<string, unknown> = {
            emailVerificationToken: FieldValue.delete(),
            emailVerificationTokenExpiry: FieldValue.delete(),
            pendingEmailVerification: FieldValue.delete(),
            emailVerifiedAt: Date.now(),
        }

        if (record.pendingEmail) {
            updates['profile.email'] = record.pendingEmail
        }

        await record.userRef.update(updates)

        if (record.pendingEmail) {
            await record.profileRef.set(
                {
                    email: record.pendingEmail,
                    updatedAt: Date.now(),
                },
                { merge: true }
            )
        }

        apiLog('[Auth] Email verified for user', record.userId)

        return NextResponse.json({
            success: true,
            email: record.pendingEmail,
            message: 'Email verified successfully.',
        })
    } catch (error) {
        apiError('[Auth] Failed to verify email:', error)
        return NextResponse.json({ error: 'Failed to verify email' }, { status: 500 })
    }
}

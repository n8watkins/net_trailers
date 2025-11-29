/**
 * Send Password Reset Email
 * POST /api/auth/send-password-reset
 *
 * Sends a custom branded password reset email via Resend
 * Alternative to Firebase's default password reset email
 */

import { NextRequest, NextResponse } from 'next/server'
import { EmailService } from '@/lib/email/email-service'
import { apiError, apiLog, apiWarn } from '@/utils/debugLogger'
import crypto from 'crypto'
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin'
import type { UserRecord } from 'firebase-admin/auth'

// Rate limiting: Max 3 password reset emails per email address per hour
const rateLimitCache = new Map<string, { count: number; resetAt: number }>()
const MAX_REQUESTS_PER_HOUR = 3
const RATE_LIMIT_WINDOW = 60 * 60 * 1000 // 1 hour

function enforceRateLimit(email: string) {
    const now = Date.now()
    const entry = rateLimitCache.get(email)

    if (!entry || now > entry.resetAt) {
        rateLimitCache.set(email, { count: 1, resetAt: now + RATE_LIMIT_WINDOW })
        return
    }

    if (entry.count >= MAX_REQUESTS_PER_HOUR) {
        throw new Error('Rate limit exceeded. Please try again later.')
    }

    entry.count += 1
    rateLimitCache.set(email, entry)
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const rawEmail = typeof body?.email === 'string' ? body.email.trim() : ''
        const normalizedEmail = rawEmail.toLowerCase()

        if (!rawEmail) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 })
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(rawEmail)) {
            return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
        }

        // Enforce rate limiting
        try {
            enforceRateLimit(normalizedEmail)
        } catch (rateLimitError) {
            return NextResponse.json(
                { error: 'Too many password reset requests. Please try again later.' },
                { status: 429 }
            )
        }

        const db = getAdminDb()
        const auth = getAdminAuth()

        let userRecord: UserRecord
        try {
            userRecord = await auth.getUserByEmail(normalizedEmail)
        } catch (authError: any) {
            if (authError?.code === 'auth/user-not-found') {
                apiLog(`Password reset requested for non-existent email: ${normalizedEmail}`)
                return NextResponse.json({
                    success: true,
                    message:
                        'If an account exists with this email, you will receive a password reset link.',
                })
            }

            apiError('Error fetching user by email:', authError)
            return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
        }

        const userRef = db.collection('users').doc(userRecord.uid)
        const userDocSnapshot = await userRef.get()

        if (!userDocSnapshot.exists) {
            apiWarn(`Password reset requested but no user doc found for UID: ${userRecord.uid}`)
            return NextResponse.json({
                success: true,
                message:
                    'If an account exists with this email, you will receive a password reset link.',
            })
        }

        const userData = userDocSnapshot.data()
        const username = userData?.profile?.username || 'User'

        const isPasswordUser = userRecord.providerData.some(
            (provider) => provider.providerId === 'password'
        )

        if (!isPasswordUser) {
            // User signed up with Google - they don't have a password to reset
            apiLog(`Password reset denied for OAuth account: ${normalizedEmail}`)
            // Return success message anyway (security: don't reveal auth method)
            return NextResponse.json({
                success: true,
                message:
                    'If an account exists with this email, you will receive a password reset link.',
            })
        }

        // Generate password reset token (expires in 1 hour)
        const resetToken = crypto.randomBytes(32).toString('hex')
        const expiresAt = Date.now() + 60 * 60 * 1000 // 1 hour

        // Store reset token in Firestore
        await userRef.update({
            passwordResetToken: resetToken,
            passwordResetTokenExpiry: expiresAt,
        })

        // Generate reset URL
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
        const resetUrl = `${appUrl}/auth/reset-password?token=${resetToken}`

        // Send email via EmailService
        const emailResult = await EmailService.sendPasswordReset({
            to: rawEmail,
            userName: username,
            resetUrl,
            expiresIn: 1, // 1 hour
        })

        if (!emailResult) {
            apiWarn('[Auth] Password reset email skipped - email service unavailable')
        } else if (emailResult.error) {
            apiError('Error sending password reset email:', emailResult.error)
            return NextResponse.json(
                { error: 'Failed to send password reset email' },
                { status: 500 }
            )
        }

        apiLog(
            `Password reset email ${emailResult ? 'sent' : 'skipped'} for ${rawEmail}`,
            emailResult?.data?.id ? { emailId: emailResult.data.id } : undefined
        )

        return NextResponse.json({
            success: true,
            message: emailResult
                ? 'Password reset email sent successfully'
                : 'Email service unavailable; password reset email skipped',
            emailSent: Boolean(emailResult),
        })
    } catch (error) {
        apiError('Error in send-password-reset route:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

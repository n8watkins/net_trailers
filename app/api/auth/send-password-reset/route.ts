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
        const { email } = body

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 })
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(email)) {
            return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
        }

        // Enforce rate limiting
        try {
            enforceRateLimit(email.toLowerCase())
        } catch (rateLimitError) {
            return NextResponse.json(
                { error: 'Too many password reset requests. Please try again later.' },
                { status: 429 }
            )
        }

        // Check if user exists in Firestore
        const db = getAdminDb()
        const usersSnapshot = await db
            .collection('users')
            .where('profile.email', '==', email)
            .limit(1)
            .get()

        if (usersSnapshot.empty) {
            // For security, don't reveal whether email exists
            apiLog(`Password reset requested for non-existent email: ${email}`)
            return NextResponse.json({
                success: true,
                message:
                    'If an account exists with this email, you will receive a password reset link.',
            })
        }

        const userDoc = usersSnapshot.docs[0]
        const userData = userDoc.data()
        const username = userData?.profile?.username || 'User'

        // Check if user has password authentication (not just OAuth)
        const auth = getAdminAuth()
        try {
            const userRecord = await auth.getUser(userDoc.id)
            const hasPasswordProvider = userRecord.providerData.some(
                (provider) => provider.providerId === 'password'
            )

            if (!hasPasswordProvider) {
                // User only has OAuth providers (Google, etc.) - no password to reset
                apiLog(`Password reset denied for OAuth-only account: ${email}`)
                // Return success message anyway (security: don't reveal auth method)
                return NextResponse.json({
                    success: true,
                    message:
                        'If an account exists with this email, you will receive a password reset link.',
                })
            }
        } catch (authError) {
            apiError('Error checking user auth providers:', authError)
            // Continue anyway - don't block legitimate requests due to API errors
        }

        // Generate password reset token (expires in 1 hour)
        const resetToken = crypto.randomBytes(32).toString('hex')
        const expiresAt = Date.now() + 60 * 60 * 1000 // 1 hour

        // Store reset token in Firestore
        await db.collection('users').doc(userDoc.id).update({
            passwordResetToken: resetToken,
            passwordResetTokenExpiry: expiresAt,
        })

        // Generate reset URL
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
        const resetUrl = `${appUrl}/auth/reset-password?token=${resetToken}`

        // Send email via EmailService
        const emailResult = await EmailService.sendPasswordReset({
            to: email,
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
            `Password reset email ${emailResult ? 'sent' : 'skipped'} for ${email}`,
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

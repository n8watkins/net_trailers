/**
 * Send Email Verification
 * POST /api/auth/send-email-verification
 *
 * Sends a custom branded email verification email via Resend
 * Used for new signups or email changes
 */

import { NextRequest, NextResponse } from 'next/server'
import { EmailService } from '@/lib/email/email-service'
import { withAuth } from '@/lib/auth-middleware'
import { apiError, apiLog, apiWarn } from '@/utils/debugLogger'
import crypto from 'crypto'
import { getAdminDb } from '@/lib/firebase-admin'

// Rate limiting: Max 5 verification emails per user per hour
const rateLimitCache = new Map<string, { count: number; resetAt: number }>()
const MAX_REQUESTS_PER_HOUR = 5
const RATE_LIMIT_WINDOW = 60 * 60 * 1000 // 1 hour

function enforceRateLimit(userId: string) {
    const now = Date.now()
    const entry = rateLimitCache.get(userId)

    if (!entry || now > entry.resetAt) {
        rateLimitCache.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW })
        return
    }

    if (entry.count >= MAX_REQUESTS_PER_HOUR) {
        throw new Error('Rate limit exceeded. Please try again later.')
    }

    entry.count += 1
    rateLimitCache.set(userId, entry)
}

async function handleSendVerification(request: NextRequest, userId: string): Promise<NextResponse> {
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
            enforceRateLimit(userId)
        } catch (rateLimitError) {
            return NextResponse.json(
                { error: 'Too many verification requests. Please try again later.' },
                { status: 429 }
            )
        }

        // Get user data from Firestore
        const db = getAdminDb()
        const userDoc = await db.collection('users').doc(userId).get()

        if (!userDoc.exists) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        const userData = userDoc.data()
        const username = userData?.profile?.username || 'User'

        // Generate verification token (expires in 24 hours)
        const verificationToken = crypto.randomBytes(32).toString('hex')
        const expiresAt = Date.now() + 24 * 60 * 60 * 1000 // 24 hours

        // Store verification token in Firestore
        await db.collection('users').doc(userId).update({
            emailVerificationToken: verificationToken,
            emailVerificationTokenExpiry: expiresAt,
            pendingEmailVerification: email,
        })

        // Generate verification URL
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
        const verificationUrl = `${appUrl}/auth/verify-email?token=${verificationToken}`

        // Send email via EmailService
        const emailResult = await EmailService.sendEmailVerification({
            to: email,
            userName: username,
            verificationUrl,
        })

        if (!emailResult) {
            apiWarn('[Auth] Email verification skipped - email service unavailable')
        } else if (emailResult.error) {
            apiError('Error sending email verification:', emailResult.error)
            return NextResponse.json(
                { error: 'Failed to send verification email' },
                { status: 500 }
            )
        }

        apiLog(
            `Email verification ${emailResult ? 'sent' : 'skipped'} for ${email}`,
            emailResult?.data?.id ? { emailId: emailResult.data.id } : undefined
        )

        return NextResponse.json({
            success: true,
            message: emailResult
                ? 'Verification email sent successfully'
                : 'Email service unavailable; verification email skipped',
            emailSent: Boolean(emailResult),
        })
    } catch (error) {
        apiError('Error in send-email-verification route:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export const POST = withAuth(handleSendVerification)

/**
 * Email Unsubscribe Handler
 *
 * GET /api/email/unsubscribe?token=xxx
 *   - Redirects to confirmation page (does NOT perform unsubscribe)
 *   - This prevents email scanners/link previews from unsubscribing users
 *
 * POST /api/email/unsubscribe
 *   - Performs actual unsubscribe (CSRF protected by proxy.ts)
 *   - Body: { token: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb } from '@/lib/firebase-admin'
import { apiLog, apiError } from '@/utils/debugLogger'
import crypto from 'crypto'

/**
 * GET: Redirect to confirmation page
 * This is safe from CSRF because it doesn't perform state changes
 */
export async function GET(request: NextRequest) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const token = request.nextUrl.searchParams.get('token')

    if (!token) {
        return NextResponse.redirect(`${appUrl}/unsubscribe?error=missing-token`)
    }

    // Redirect to confirmation page - user must click button to unsubscribe
    return NextResponse.redirect(`${appUrl}/unsubscribe?token=${token}`)
}

/**
 * POST: Perform actual unsubscribe
 * Protected by proxy.ts CSRF validation (Origin/Referer header check)
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { token } = body

        if (!token) {
            return NextResponse.json({ error: 'Missing unsubscribe token' }, { status: 400 })
        }

        const db = getAdminDb()

        // Find user by unsubscribe token
        const usersSnapshot = await db
            .collection('users')
            .where('unsubscribeToken', '==', token)
            .limit(1)
            .get()

        if (usersSnapshot.empty) {
            return NextResponse.json(
                { error: 'Invalid or expired unsubscribe link' },
                { status: 404 }
            )
        }

        const userDoc = usersSnapshot.docs[0]
        const userId = userDoc.id

        // Disable email notifications
        await db.collection('users').doc(userId).update({
            'notificationPreferences.email': false,
            'notificationPreferences.emailDigest': 'never',
            unsubscribedAt: Date.now(),
        })

        apiLog(`[Unsubscribe] User ${userId} unsubscribed from email notifications`)

        return NextResponse.json({ success: true })
    } catch (error) {
        apiError('[Unsubscribe] Error:', error)
        return NextResponse.json({ error: 'Failed to unsubscribe' }, { status: 500 })
    }
}

/**
 * Generate unsubscribe token for a user
 * Call this when creating/updating user accounts
 */
export async function generateUnsubscribeToken(userId: string): Promise<string> {
    try {
        const db = getAdminDb()

        // Check if user already has a token
        const userDoc = await db.collection('users').doc(userId).get()
        const userData = userDoc.data()

        if (userData?.unsubscribeToken) {
            return userData.unsubscribeToken
        }

        // Generate new token
        const token = crypto.randomBytes(32).toString('hex')

        // Store token
        await db.collection('users').doc(userId).update({
            unsubscribeToken: token,
        })

        return token
    } catch (error) {
        apiError('[Unsubscribe] Error generating token:', error)
        throw error
    }
}

/**
 * Get unsubscribe URL for a user
 */
export function getUnsubscribeUrl(token: string): string {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    return `${appUrl}/api/email/unsubscribe?token=${token}`
}

/**
 * Email Unsubscribe Handler
 *
 * GET /api/email/unsubscribe?token=xxx
 *   - Redirects to confirmation page (does NOT perform unsubscribe)
 *   - Prevents email scanners from silently unsubscribing users.
 *
 * POST /api/email/unsubscribe
 *   - Performs actual unsubscribe (CSRF-protected by proxy.ts origin check).
 *   - Body: { token: string }
 *
 * Token lookup: tokens live in `userPreferences.data.unsubscribeToken` (stored
 * there by lib/email/unsubscribe-token.ts — no schema column needed).
 */

import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/db'
import { userPreferences } from '@/db/schema'
import { apiError, apiLog } from '@/utils/debugLogger'

/**
 * GET: Redirect to confirmation page.
 * Safe from CSRF because it performs no state change.
 */
export async function GET(request: NextRequest) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const token = request.nextUrl.searchParams.get('token')

    if (!token) {
        return NextResponse.redirect(`${appUrl}/unsubscribe?error=missing-token`)
    }

    return NextResponse.redirect(`${appUrl}/unsubscribe?token=${token}`)
}

/**
 * POST: Perform actual unsubscribe.
 * Protected by proxy.ts CSRF validation (Origin/Referer header check).
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { token } = body

        if (!token) {
            return NextResponse.json({ error: 'Missing unsubscribe token' }, { status: 400 })
        }

        // Scan userPreferences.data JSON blobs for the matching token.
        // SQLite doesn't support WHERE on JSON fields without a generated column,
        // so we fetch all rows and find the match in JS.  The table is small
        // (one row per user) so this is acceptable.
        const rows = await db
            .select({ userId: userPreferences.userId, data: userPreferences.data })
            .from(userPreferences)

        const match = rows.find((r) => (r.data as any)?.unsubscribeToken === token)

        if (!match) {
            return NextResponse.json(
                { error: 'Invalid or expired unsubscribe link' },
                { status: 404 }
            )
        }

        const { userId, data: currentData } = match
        const now = Date.now()

        // Merge unsubscribe flags into the existing prefs blob.
        const updatedData = {
            ...(currentData as Record<string, unknown>),
            notificationPreferences: {
                ...((currentData as any)?.notificationPreferences ?? {}),
                email: false,
                emailDigest: 'never',
            },
            unsubscribedAt: now,
        }

        await db
            .update(userPreferences)
            .set({ data: updatedData as any, updatedAt: now })
            .where((await import('drizzle-orm')).eq(userPreferences.userId, userId))

        apiLog(`[Unsubscribe] User ${userId} unsubscribed from email notifications`)

        return NextResponse.json({ success: true })
    } catch (error) {
        apiError('[Unsubscribe] Error:', error)
        return NextResponse.json({ error: 'Failed to unsubscribe' }, { status: 500 })
    }
}

/**
 * Get unsubscribe URL for a token.
 */
export function getUnsubscribeUrl(token: string): string {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    return `${appUrl}/api/email/unsubscribe?token=${token}`
}

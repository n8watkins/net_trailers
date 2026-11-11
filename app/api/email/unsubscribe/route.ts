/**
 * Email Unsubscribe Handler
 *
 * GET /api/email/unsubscribe?token=xxx
 *   - Redirects to confirmation page (does NOT perform unsubscribe)
 *   - Prevents email scanners from silently unsubscribing users.
 *
 * POST /api/email/unsubscribe
 *   - Performs actual unsubscribe.
 *   - The confirm page sends JSON { token } with its Origin (checked by proxy.ts).
 *   - A mail client's one-click button (RFC 8058, List-Unsubscribe-Post) sends
 *     the body "List-Unsubscribe=One-Click" with the token in the query and no
 *     Origin; proxy.ts exempts exactly that request, since the token is the proof.
 *
 * Token lookup: tokens live in `userPreferences.data.unsubscribeToken` (stored
 * there by lib/email/unsubscribe-token.ts - no schema column needed).
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
    // Same site the link was opened on (not a configured URL that may point
    // at an old host), and the token passed on encoded.
    const page = new URL('/unsubscribe', request.nextUrl.origin)
    const token = request.nextUrl.searchParams.get('token')
    if (token) page.searchParams.set('token', token)
    else page.searchParams.set('error', 'missing-token')
    return NextResponse.redirect(page)
}

/** The token from the query (one-click) or, failing that, the JSON body (confirm page). */
async function readToken(request: NextRequest): Promise<unknown> {
    const fromQuery = request.nextUrl.searchParams.get('token')
    if (fromQuery) return fromQuery
    return (await request.json().catch(() => null))?.token
}

/** POST: Perform actual unsubscribe. */
export async function POST(request: NextRequest) {
    try {
        const token = await readToken(request)

        if (typeof token !== 'string' || !token) {
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

        // Turn email off where every sender reads it (notifications.email: the
        // digests, the trending email and forum replies all check it). The
        // old notificationPreferences key is kept for history only.
        const current = currentData as unknown as Record<string, any>
        const updatedData = {
            ...current,
            notifications: { ...(current?.notifications ?? {}), email: false },
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

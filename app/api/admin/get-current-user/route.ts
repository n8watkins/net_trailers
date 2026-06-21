/**
 * Admin API: Get Current User ID (dev-only debugging helper)
 *
 * Returns the current session's user ID and email from the Auth.js session.
 * GET /api/admin/get-current-user
 */

import { NextResponse } from 'next/server'

import { verifyAuthentication } from '@/lib/auth-middleware'

export async function GET() {
    // Only allow in development
    if (process.env.NODE_ENV !== 'development') {
        return NextResponse.json({ error: 'Only available in development' }, { status: 403 })
    }

    try {
        const result = await verifyAuthentication()

        if (!result.authenticated || !result.userId) {
            return NextResponse.json(
                { error: 'Not signed in. Please sign in first.' },
                { status: 401 }
            )
        }

        // Fetch email from DB to match old response shape.
        const { db } = await import('@/db')
        const { users } = await import('@/db/schema')
        const { eq } = await import('drizzle-orm')

        const rows = await db
            .select({ id: users.id, email: users.email })
            .from(users)
            .where(eq(users.id, result.userId))
            .limit(1)

        return NextResponse.json({
            userId: result.userId,
            email: rows[0]?.email ?? null,
        })
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to get user' },
            { status: 500 }
        )
    }
}

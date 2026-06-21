/**
 * Trending Stats API Route
 *
 * Returns a lightweight summary of the last cron run for the admin dashboard.
 * The old Firestore `system/trending` document no longer exists; we derive the
 * same metrics from the `notifications` table instead.
 */

import { and, count, eq, gte, max } from 'drizzle-orm'
import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/db'
import { notifications } from '@/db/schema'
import {
    createForbiddenResponse,
    createUnauthorizedResponse,
    validateAdminRequest,
} from '@/utils/adminMiddleware'

export async function GET(req: NextRequest) {
    try {
        const authResult = await validateAdminRequest(req)
        if (!authResult.authorized) {
            return authResult.error?.includes('not an administrator')
                ? createForbiddenResponse(authResult.error)
                : createUnauthorizedResponse(authResult.error)
        }

        // "Trending" notifications are those with type = 'trending_update'.
        const [stats] = await db
            .select({
                totalNotifications: count(notifications.id),
                lastRun: max(notifications.createdAt),
            })
            .from(notifications)
            .where(eq(notifications.type, 'trending_update'))

        return NextResponse.json({
            lastRun: stats?.lastRun ?? null,
            totalNotifications: stats?.totalNotifications ?? 0,
            // lastNewItems and snapshot counts are not separately tracked in the
            // new schema; return 0 to maintain API shape without breaking the UI.
            lastNewItems: 0,
            moviesSnapshot: 0,
            tvSnapshot: 0,
        })
    } catch (error) {
        console.error('Trending stats error:', error)
        return NextResponse.json({ error: 'Failed to get stats' }, { status: 500 })
    }
}

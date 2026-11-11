/**
 * Activity Tracking API Route
 *
 * GET  – returns activity events from the `user_activity` table (admin only).
 * POST – records a new activity event. Accepts both authenticated and guest
 *        events; the userId FK is null for guests.
 */

import { and, desc, eq, gte, inArray } from 'drizzle-orm'
import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/db'
import { userActivity, users } from '@/db/schema'
import { currentUserId } from '@/db/queries/_helpers'
import { consumeLimits, tooManyRequests } from '@/lib/durableLimit'
import { badRequest, requireAdmin, serverError } from '@/lib/admin/guard'
import { activityQuery } from '@/lib/admin/schemas'

export async function GET(request: NextRequest) {
    const guard = await requireAdmin()
    if (!guard.ok) return guard.response

    const query = activityQuery.safeParse(Object.fromEntries(new URL(request.url).searchParams))
    if (!query.success) return badRequest('Invalid activity query')
    const { type, period, userId: filterUserId } = query.data

    try {
        const now = Date.now()
        let periodStart: number

        if (period === 'week') {
            const date = new Date(now)
            const day = date.getUTCDay()
            const diff = date.getUTCDate() - day + (day === 0 ? -6 : 1)
            date.setUTCDate(diff)
            date.setUTCHours(0, 0, 0, 0)
            periodStart = date.getTime()
        } else {
            const date = new Date(now)
            date.setUTCDate(1)
            date.setUTCHours(0, 0, 0, 0)
            periodStart = date.getTime()
        }

        const conditions = [gte(userActivity.timestamp, periodStart)]
        if (type !== 'all') conditions.push(eq(userActivity.type, type))
        if (filterUserId) conditions.push(eq(userActivity.userId, filterUserId))

        const rows = await db
            .select()
            .from(userActivity)
            .where(and(...conditions))
            .orderBy(desc(userActivity.timestamp))
            .limit(1000)

        // Build email lookup for display.
        const uniqueUserIds = [...new Set(rows.map((r) => r.userId).filter(Boolean))] as string[]
        const emailMap = new Map<string, string>()
        if (uniqueUserIds.length > 0) {
            const userRows = await db
                .select({ id: users.id, email: users.email })
                .from(users)
                .where(inArray(users.id, uniqueUserIds))
            userRows.forEach((u) => {
                if (u.email) emailMap.set(u.id, u.email)
            })
        }

        const activities = rows.map((row) => ({
            id: row.id,
            type: row.type,
            userId: row.userId ?? null,
            guestId: row.userId ? null : (row.referenceId ?? null),
            userEmail: row.userId ? (emailMap.get(row.userId) ?? null) : null,
            page: row.referenceType === 'page' ? (row.referenceId ?? null) : null,
            timestamp: row.timestamp,
        }))

        const activityByDay: Record<string, typeof activities> = {}
        activities.forEach((activity) => {
            const day = new Date(activity.timestamp).toLocaleDateString()
            if (!activityByDay[day]) activityByDay[day] = []
            activityByDay[day].push(activity)
        })

        const uniqueUsers = new Set(activities.filter((a) => a.userId).map((a) => a.userId)).size
        const uniqueGuests = new Set(activities.filter((a) => a.guestId).map((a) => a.guestId)).size
        const activeDays = Object.keys(activityByDay).length

        return NextResponse.json({
            activities,
            activityByDay,
            stats: {
                total: activities.length,
                uniqueUsers,
                uniqueGuests,
                activeDays,
                avgPerDay: activeDays > 0 ? activities.length / activeDays : 0,
            },
        })
    } catch (error) {
        console.error('Admin activity GET error:', error)
        return serverError('Failed to fetch activity')
    }
}

/**
 * Record a signed-in user's page view or login. The user is the session's,
 * never one named in the request (anyone could otherwise write activity rows,
 * with any email, for any user). Guests' views are accepted and not stored.
 * Limited durably to 30 a minute per user.
 */
export async function POST(request: NextRequest) {
    try {
        const userId = await currentUserId()
        if (!userId) {
            return NextResponse.json({ success: true, stored: false })
        }

        const limited = await consumeLimits([
            { key: `activity:user:${userId}`, limit: 30, window: { ms: 60_000 } },
        ])
        if (!limited.allowed) return tooManyRequests(limited)

        const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
        const type = body?.type
        const page = body?.page
        const userAgent = body?.userAgent

        if (type !== 'login' && type !== 'view') {
            return NextResponse.json({ error: 'Invalid activity type' }, { status: 400 })
        }
        if (page !== undefined && (typeof page !== 'string' || !page.startsWith('/'))) {
            return NextResponse.json({ error: 'Invalid page format' }, { status: 400 })
        }

        const sanitizedUserAgent = typeof userAgent === 'string' ? userAgent.slice(0, 500) : null

        // Store in user_activity: referenceId = page, referenceType = 'page'.
        await db.insert(userActivity).values({
            userId,
            type,
            timestamp: Date.now(),
            referenceId: typeof page === 'string' ? page.slice(0, 500) : null,
            referenceType: 'page',
            preview: sanitizedUserAgent ? { userAgent: sanitizedUserAgent, userEmail: null } : null,
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Activity POST error:', error)
        return NextResponse.json({ error: 'Failed to record activity' }, { status: 500 })
    }
}

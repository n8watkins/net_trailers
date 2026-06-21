/**
 * Activity Tracking API Route
 *
 * GET  – returns activity events from the `user_activity` table (admin only).
 * POST – records a new activity event. Accepts both authenticated and guest
 *        events; the userId FK is null for guests.
 */

import { and, desc, eq, gte } from 'drizzle-orm'
import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/db'
import { userActivity, users } from '@/db/schema'
import {
    createForbiddenResponse,
    createUnauthorizedResponse,
    validateAdminRequest,
} from '@/utils/adminMiddleware'

export async function GET(request: NextRequest) {
    try {
        const authResult = await validateAdminRequest(request)
        if (!authResult.authorized) {
            return authResult.error?.includes('not an administrator')
                ? createForbiddenResponse(authResult.error)
                : createUnauthorizedResponse(authResult.error)
        }

        const url = new URL(request.url)
        const type = url.searchParams.get('type') || 'all'
        const period = url.searchParams.get('period') || 'month'
        const filterUserId = url.searchParams.get('userId') ?? undefined

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
            const userRows = await db.select({ id: users.id, email: users.email }).from(users)
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
        return NextResponse.json(
            {
                error: 'Failed to fetch activity',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        )
    }
}

/**
 * Record activity (login or page view).
 *
 * Intentionally public — no admin check needed. Includes validation and
 * in-memory rate limiting to prevent abuse.
 */

// Global declaration so the rate-limit map survives hot-reloads in dev.
declare global {
    var activityRateLimits: Map<string, { count: number; windowStart: number }> | undefined
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { type, userId, guestId, userEmail, page, userAgent } = body

        if (!type || (!userId && !guestId)) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }
        if (type !== 'login' && type !== 'view') {
            return NextResponse.json({ error: 'Invalid activity type' }, { status: 400 })
        }
        if (userId && typeof userId !== 'string') {
            return NextResponse.json({ error: 'Invalid userId format' }, { status: 400 })
        }
        if (guestId && typeof guestId !== 'string') {
            return NextResponse.json({ error: 'Invalid guestId format' }, { status: 400 })
        }
        if (userEmail) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
            if (typeof userEmail !== 'string' || !emailRegex.test(userEmail)) {
                return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
            }
        }
        if (page && (typeof page !== 'string' || !page.startsWith('/'))) {
            return NextResponse.json({ error: 'Invalid page format' }, { status: 400 })
        }

        const sanitizedUserAgent = userAgent ? String(userAgent).slice(0, 500) : null
        const ip =
            request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
        const rateLimitKey = `activity:${ip}`
        const now = Date.now()

        if (!global.activityRateLimits) {
            global.activityRateLimits = new Map()
        }

        const ipData = global.activityRateLimits.get(rateLimitKey)
        if (ipData) {
            const { count, windowStart } = ipData
            if (now - windowStart < 60_000) {
                if (count >= 30) {
                    return NextResponse.json(
                        { error: 'Rate limit exceeded. Please try again later.' },
                        { status: 429 }
                    )
                }
                global.activityRateLimits.set(rateLimitKey, {
                    count: count + 1,
                    windowStart,
                })
            } else {
                global.activityRateLimits.set(rateLimitKey, { count: 1, windowStart: now })
            }
        } else {
            global.activityRateLimits.set(rateLimitKey, { count: 1, windowStart: now })
        }

        if (global.activityRateLimits.size > 100) {
            for (const [key, value] of global.activityRateLimits.entries()) {
                if (now - value.windowStart > 60_000) global.activityRateLimits.delete(key)
            }
        }

        // Store in user_activity.
        // For authenticated users: referenceId = page, referenceType = 'page'.
        // For guests: referenceId = guestId, referenceType = 'guest'.
        await db.insert(userActivity).values({
            userId: userId ?? null,
            type,
            timestamp: now,
            referenceId: userId ? (page ?? null) : (guestId ?? null),
            referenceType: userId ? 'page' : 'guest',
            preview:
                sanitizedUserAgent || userEmail
                    ? { userAgent: sanitizedUserAgent, userEmail: userEmail ?? null }
                    : null,
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Activity POST error:', error)
        return NextResponse.json(
            {
                error: 'Failed to record activity',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        )
    }
}

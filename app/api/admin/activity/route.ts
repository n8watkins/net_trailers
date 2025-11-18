/**
 * Activity Tracking API Route
 *
 * Get login activity and page view statistics
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb } from '@/lib/firebase-admin'
import {
    validateAdminRequest,
    createUnauthorizedResponse,
    createForbiddenResponse,
} from '@/utils/adminMiddleware'

export async function GET(request: NextRequest) {
    try {
        // Validate admin access via Firebase Auth
        const authResult = await validateAdminRequest(request)
        if (!authResult.authorized) {
            return authResult.error?.includes('not an administrator')
                ? createForbiddenResponse(authResult.error)
                : createUnauthorizedResponse(authResult.error)
        }

        const db = getAdminDb()
        const url = new URL(request.url)
        const type = url.searchParams.get('type') || 'all' // 'logins', 'views', 'all'
        const period = url.searchParams.get('period') || 'month' // 'week', 'month'
        const userId = url.searchParams.get('userId') // Optional user filter

        // Calculate period boundaries
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

        // Fetch activity data
        const activityRef = db.collection('activity')
        const snapshot = await activityRef
            .where('timestamp', '>=', periodStart)
            .orderBy('timestamp', 'desc')
            .limit(1000)
            .get()

        const activities = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }))

        // Filter by type if specified
        let filteredActivities = activities
        if (type !== 'all') {
            filteredActivities = activities.filter((a: any) => a.type === type)
        }

        // Filter by userId if specified
        if (userId) {
            filteredActivities = filteredActivities.filter((a: any) => a.userId === userId)
        }

        // Group by day for statistics
        const activityByDay: Record<string, any[]> = {}
        filteredActivities.forEach((activity: any) => {
            const day = new Date(activity.timestamp).toLocaleDateString()
            if (!activityByDay[day]) {
                activityByDay[day] = []
            }
            activityByDay[day].push(activity)
        })

        // Count unique users
        const uniqueUsers = new Set(
            filteredActivities.filter((a: any) => a.userId).map((a: any) => a.userId)
        ).size

        const uniqueGuests = new Set(
            filteredActivities.filter((a: any) => a.guestId).map((a: any) => a.guestId)
        ).size

        return NextResponse.json({
            activities: filteredActivities,
            activityByDay,
            stats: {
                total: filteredActivities.length,
                uniqueUsers,
                uniqueGuests,
                activeDays: Object.keys(activityByDay).length,
                avgPerDay:
                    Object.keys(activityByDay).length > 0
                        ? filteredActivities.length / Object.keys(activityByDay).length
                        : 0,
            },
        })
    } catch (error) {
        console.error('Error fetching activity:', error)
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
 * Record activity (login or page view)
 *
 * NOTE: This endpoint is intentionally public to allow client-side activity tracking.
 * However, it includes validation and sanitization to prevent abuse.
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { type, userId, guestId, userEmail, page, userAgent } = body

        // Validate required fields
        if (!type || (!userId && !guestId)) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        // Validate activity type (only allow 'login' or 'view')
        if (type !== 'login' && type !== 'view') {
            return NextResponse.json({ error: 'Invalid activity type' }, { status: 400 })
        }

        // Validate and sanitize userId/guestId format (prevent injection)
        if (userId && typeof userId !== 'string') {
            return NextResponse.json({ error: 'Invalid userId format' }, { status: 400 })
        }
        if (guestId && typeof guestId !== 'string') {
            return NextResponse.json({ error: 'Invalid guestId format' }, { status: 400 })
        }

        // Validate email format if provided
        if (userEmail) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
            if (typeof userEmail !== 'string' || !emailRegex.test(userEmail)) {
                return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
            }
        }

        // Validate page URL (must start with /)
        if (page && (typeof page !== 'string' || !page.startsWith('/'))) {
            return NextResponse.json({ error: 'Invalid page format' }, { status: 400 })
        }

        // Sanitize and truncate user agent (prevent large payloads)
        const sanitizedUserAgent = userAgent
            ? String(userAgent).slice(0, 500) // Limit to 500 chars
            : null

        // Rate limiting check: prevent spam from same IP
        const ip =
            request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'

        // Simple in-memory rate limiting (per IP)
        const rateLimitKey = `activity:${ip}`
        const now = Date.now()

        // Allow max 30 requests per minute per IP
        if (!global.activityRateLimits) {
            global.activityRateLimits = new Map()
        }

        const ipData = global.activityRateLimits.get(rateLimitKey)
        if (ipData) {
            const { count, windowStart } = ipData
            const windowDuration = 60 * 1000 // 1 minute

            if (now - windowStart < windowDuration) {
                if (count >= 30) {
                    return NextResponse.json(
                        { error: 'Rate limit exceeded. Please try again later.' },
                        { status: 429 }
                    )
                }
                global.activityRateLimits.set(rateLimitKey, { count: count + 1, windowStart })
            } else {
                // Reset window
                global.activityRateLimits.set(rateLimitKey, { count: 1, windowStart: now })
            }
        } else {
            global.activityRateLimits.set(rateLimitKey, { count: 1, windowStart: now })
        }

        // Cleanup old entries every 100 requests
        if (global.activityRateLimits.size > 100) {
            for (const [key, value] of global.activityRateLimits.entries()) {
                if (now - value.windowStart > 60 * 1000) {
                    global.activityRateLimits.delete(key)
                }
            }
        }

        const db = getAdminDb()
        const activityRef = db.collection('activity')

        // Write sanitized data
        await activityRef.add({
            type, // 'login' or 'view'
            userId: userId || null,
            guestId: guestId || null,
            userEmail: userEmail || null,
            page: page || null,
            userAgent: sanitizedUserAgent,
            timestamp: now,
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error recording activity:', error)
        return NextResponse.json(
            {
                error: 'Failed to record activity',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        )
    }
}

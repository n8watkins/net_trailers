/**
 * Activity Tracking API Route
 *
 * Get login activity and page view statistics
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb } from '@/lib/firebase-admin'

// Admin authorization
const ADMIN_TOKEN = process.env.NEXT_PUBLIC_ADMIN_TOKEN || 'your-secret-admin-token'

export async function GET(request: NextRequest) {
    try {
        // Verify admin authorization
        const authHeader = request.headers.get('authorization')
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const token = authHeader.substring(7)
        if (token !== ADMIN_TOKEN) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const db = getAdminDb()
        const url = new URL(request.url)
        const type = url.searchParams.get('type') || 'all' // 'logins', 'views', 'all'
        const period = url.searchParams.get('period') || 'month' // 'week', 'month'

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
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { type, userId, guestId, userEmail, page, userAgent } = body

        if (!type || (!userId && !guestId)) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        const db = getAdminDb()
        const activityRef = db.collection('activity')

        await activityRef.add({
            type, // 'login' or 'view'
            userId: userId || null,
            guestId: guestId || null,
            userEmail: userEmail || null,
            page: page || null,
            userAgent: userAgent || null,
            timestamp: Date.now(),
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

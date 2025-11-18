/**
 * Daily Stats Reset Cron Job
 *
 * Resets daily, weekly, and monthly signup counters at appropriate boundaries
 * Runs daily at midnight UTC via Vercel cron
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb } from '@/lib/firebase-admin'

const CRON_SECRET = process.env.CRON_SECRET
const ADMIN_TOKEN = process.env.NEXT_PUBLIC_ADMIN_TOKEN

export async function GET(request: NextRequest) {
    try {
        // Verify authorization (support both CRON_SECRET and ADMIN_TOKEN)
        const authHeader = request.headers.get('authorization')
        const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : authHeader

        if (token !== CRON_SECRET && token !== ADMIN_TOKEN) {
            console.error('Unauthorized reset-stats attempt')
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const db = getAdminDb()
        const systemStatsRef = db.doc('system/stats')
        const now = Date.now()

        // Get current stats to check boundaries
        const statsDoc = await systemStatsRef.get()
        const currentStats = statsDoc.data() || {}

        const updates: any = {
            lastDailyReset: now,
        }

        // Always reset daily counter
        updates.signupsToday = 0
        console.log('✅ Reset signupsToday counter')

        // Check if we need to reset weekly counter
        const currentWeekStart = getWeekStart(now)
        if (!currentStats.currentWeekStart || currentStats.currentWeekStart < currentWeekStart) {
            updates.signupsThisWeek = 0
            updates.currentWeekStart = currentWeekStart
            console.log('✅ Reset signupsThisWeek counter (new week started)')
        }

        // Check if we need to reset monthly counter
        const currentMonthStart = getMonthStart(now)
        if (!currentStats.currentMonthStart || currentStats.currentMonthStart < currentMonthStart) {
            updates.signupsThisMonth = 0
            updates.currentMonthStart = currentMonthStart
            console.log('✅ Reset signupsThisMonth counter (new month started)')
        }

        // Apply updates
        await systemStatsRef.update(updates)

        console.log('✅ Stats reset complete:', updates)

        return NextResponse.json({
            success: true,
            message: 'Stats reset successfully',
            reset: {
                daily: true,
                weekly: !!updates.signupsThisWeek,
                monthly: !!updates.signupsThisMonth,
            },
            timestamp: now,
        })
    } catch (error) {
        console.error('Error resetting stats:', error)
        return NextResponse.json(
            {
                error: 'Failed to reset stats',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        )
    }
}

/**
 * Get the start of the current week (Monday at 00:00:00 UTC)
 */
function getWeekStart(timestamp: number): number {
    const date = new Date(timestamp)
    const day = date.getUTCDay()
    const diff = date.getUTCDate() - day + (day === 0 ? -6 : 1) // Adjust when day is Sunday
    date.setUTCDate(diff)
    date.setUTCHours(0, 0, 0, 0)
    return date.getTime()
}

/**
 * Get the start of the current month (1st at 00:00:00 UTC)
 */
function getMonthStart(timestamp: number): number {
    const date = new Date(timestamp)
    date.setUTCDate(1)
    date.setUTCHours(0, 0, 0, 0)
    return date.getTime()
}

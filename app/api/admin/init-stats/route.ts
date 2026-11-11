/**
 * Initialize Account Statistics API Route
 *
 * Admin-only endpoint that counts existing users from the `user` and
 * `signup_log` tables (Drizzle/Turso).  No longer writes to a Firestore
 * `system/stats` document - statistics are derived on-the-fly from the DB.
 */

import { count, gte, max, sql } from 'drizzle-orm'
import { NextResponse } from 'next/server'

import { db } from '@/db'
import { signupLog, users } from '@/db/schema'
import { requireAdmin, serverError } from '@/lib/admin/guard'

function getWeekStart(timestamp: number): number {
    const date = new Date(timestamp)
    const day = date.getUTCDay()
    const diff = date.getUTCDate() - day + (day === 0 ? -6 : 1)
    date.setUTCDate(diff)
    date.setUTCHours(0, 0, 0, 0)
    return date.getTime()
}

function getMonthStart(timestamp: number): number {
    const date = new Date(timestamp)
    date.setUTCDate(1)
    date.setUTCHours(0, 0, 0, 0)
    return date.getTime()
}

export async function POST() {
    const guard = await requireAdmin()
    if (!guard.ok) return guard.response

    try {
        const now = Date.now()
        const currentWeekStart = getWeekStart(now)
        const currentMonthStart = getMonthStart(now)

        // Total registered users.
        const [{ userCount }] = await db.select({ userCount: count(users.id) }).from(users)

        // Weekly / monthly signups from the signup_log table.
        const [{ signupsThisWeek }] = await db
            .select({ signupsThisWeek: count(signupLog.id) })
            .from(signupLog)
            .where(gte(signupLog.timestamp, currentWeekStart))

        const [{ signupsThisMonth }] = await db
            .select({ signupsThisMonth: count(signupLog.id) })
            .from(signupLog)
            .where(gte(signupLog.timestamp, currentMonthStart))

        const dayStart = new Date(now)
        dayStart.setUTCHours(0, 0, 0, 0)
        const [{ signupsToday, lastSignup }] = await db
            .select({
                signupsToday: sql<number>`count(case when ${signupLog.timestamp} >= ${dayStart.getTime()} then 1 end)`,
                lastSignup: max(signupLog.timestamp),
            })
            .from(signupLog)

        return NextResponse.json({
            success: true,
            userCount,
            signupsThisWeek,
            signupsThisMonth,
            signupsToday: Number(signupsToday ?? 0),
            lastSignup: lastSignup ?? null,
        })
    } catch (error) {
        console.error('Admin init-stats error:', error)
        return serverError('Failed to load account stats')
    }
}

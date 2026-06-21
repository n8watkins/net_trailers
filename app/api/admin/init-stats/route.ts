/**
 * Initialize Account Statistics API Route
 *
 * Admin-only endpoint that counts existing users from the `user` and
 * `signup_log` tables (Drizzle/Turso).  No longer writes to a Firestore
 * `system/stats` document — statistics are derived on-the-fly from the DB.
 */

import { count, gte } from 'drizzle-orm'
import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/db'
import { signupLog, users } from '@/db/schema'
import {
    createForbiddenResponse,
    createUnauthorizedResponse,
    validateAdminRequest,
} from '@/utils/adminMiddleware'

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

export async function POST(request: NextRequest) {
    try {
        const authResult = await validateAdminRequest(request)
        if (!authResult.authorized) {
            return authResult.error?.includes('not an administrator')
                ? createForbiddenResponse(authResult.error)
                : createUnauthorizedResponse(authResult.error)
        }

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

        console.log(
            `Admin init-stats: ${userCount} users, ${signupsThisWeek} this week, ${signupsThisMonth} this month`
        )

        return NextResponse.json({
            success: true,
            userCount,
            previousCount: userCount, // no delta tracking in the new schema
            signupsThisWeek,
            signupsThisMonth,
            lastSignup: null, // not surfaced from signup_log to avoid PII
            message: `Account statistics computed. Found ${userCount} users (${signupsThisWeek} this week, ${signupsThisMonth} this month).`,
        })
    } catch (error) {
        console.error('Admin init-stats error:', error)
        return NextResponse.json(
            {
                error: 'Failed to initialize account stats',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        )
    }
}

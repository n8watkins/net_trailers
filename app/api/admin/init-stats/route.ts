/**
 * Initialize Account Statistics API Route
 *
 * Admin-only endpoint to count existing users and initialize system/stats
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin'
import {
    validateAdminRequest,
    createUnauthorizedResponse,
    createForbiddenResponse,
} from '@/utils/adminMiddleware'
import { applyCsrfProtection } from '@/lib/csrfProtection'

/**
 * Get the start of the current week (Monday at 00:00:00)
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
 * Get the start of the current month (1st at 00:00:00)
 */
function getMonthStart(timestamp: number): number {
    const date = new Date(timestamp)
    date.setUTCDate(1)
    date.setUTCHours(0, 0, 0, 0)
    return date.getTime()
}

/**
 * Count users created within a time period
 */
function countUsersInPeriod(users: Array<{ createdAt: string }>, periodStart: number): number {
    return users.filter((user) => new Date(user.createdAt).getTime() >= periodStart).length
}

export async function POST(request: NextRequest) {
    try {
        // Apply CSRF protection
        const csrfResponse = applyCsrfProtection(request)
        if (csrfResponse) {
            return csrfResponse
        }

        // Validate admin access via Firebase Auth
        const authResult = await validateAdminRequest(request)
        if (!authResult.authorized) {
            return authResult.error?.includes('not an administrator')
                ? createForbiddenResponse(authResult.error)
                : createUnauthorizedResponse(authResult.error)
        }

        console.log('🔍 Counting existing Firebase Auth users...')

        // Get Firebase Admin instances
        const auth = getAdminAuth()
        const db = getAdminDb()

        // List all users
        let userCount = 0
        let pageToken: string | undefined
        const users: Array<{ uid: string; email: string | undefined; createdAt: string }> = []

        do {
            const listUsersResult = await auth.listUsers(1000, pageToken)
            userCount += listUsersResult.users.length

            // Collect user info
            listUsersResult.users.forEach((user) => {
                users.push({
                    uid: user.uid,
                    email: user.email,
                    createdAt: user.metadata.creationTime,
                })
            })

            pageToken = listUsersResult.pageToken
            console.log(`   Found ${listUsersResult.users.length} users in this batch...`)
        } while (pageToken)

        console.log(`✅ Total users in Firebase Auth: ${userCount}`)

        // Update system/stats document
        console.log('💾 Updating system/stats document in Firestore...')

        const systemStatsRef = db.doc('system/stats')
        const existingDoc = await systemStatsRef.get()

        const previousCount = existingDoc.exists ? existingDoc.data()?.totalAccounts || 0 : 0

        // Calculate time periods
        const now = Date.now()
        const currentWeekStart = getWeekStart(now)
        const currentMonthStart = getMonthStart(now)

        // Count signups in current week and month
        const signupsThisWeek = countUsersInPeriod(users, currentWeekStart)
        const signupsThisMonth = countUsersInPeriod(users, currentMonthStart)

        // Find the most recent signup
        const sortedUsers = users.sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
        const lastSignup =
            sortedUsers.length > 0 ? new Date(sortedUsers[0].createdAt).getTime() : null

        await systemStatsRef.set(
            {
                totalAccounts: userCount,
                signupsThisWeek,
                signupsThisMonth,
                lastSignup,
                lastReset: now,
                updatedAt: now,
                currentWeekStart,
                currentMonthStart,
            },
            { merge: true }
        )

        console.log(`✅ Updated system/stats:`)
        console.log(`   Total accounts: ${userCount}`)
        console.log(`   Signups this week: ${signupsThisWeek}`)
        console.log(`   Signups this month: ${signupsThisMonth}`)

        return NextResponse.json({
            success: true,
            userCount,
            previousCount,
            signupsThisWeek,
            signupsThisMonth,
            lastSignup: lastSignup ? new Date(lastSignup).toISOString() : null,
            message: `Account statistics initialized. Found ${userCount} users (${signupsThisWeek} this week, ${signupsThisMonth} this month).`,
        })
    } catch (error) {
        console.error('Error initializing account stats:', error)
        return NextResponse.json(
            {
                error: 'Failed to initialize account stats',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        )
    }
}

/**
 * Record Account Creation API Route
 *
 * Called after successful Firebase Auth signup to track account creation in system/stats
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'

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

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { userId, email } = body

        if (!userId || !email) {
            return NextResponse.json({ error: 'Missing userId or email' }, { status: 400 })
        }

        // Verify the user exists in Firebase Auth
        const auth = getAdminAuth()
        const db = getAdminDb()

        try {
            await auth.getUser(userId)
        } catch (error) {
            console.error('User not found in Firebase Auth:', userId)
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        // Calculate time periods
        const now = Date.now()
        const currentWeekStart = getWeekStart(now)
        const currentMonthStart = getMonthStart(now)

        // Update system stats with weekly/monthly tracking
        const systemStatsRef = db.doc('system/stats')
        await systemStatsRef.set(
            {
                totalAccounts: FieldValue.increment(1),
                signupsThisWeek: FieldValue.increment(1),
                signupsThisMonth: FieldValue.increment(1),
                lastSignup: now,
                lastSignupEmail: email,
                currentWeekStart,
                currentMonthStart,
            },
            { merge: true }
        )

        // Log the signup
        await db.collection('signupLog').doc(userId).set({
            userId,
            email,
            createdAt: Date.now(),
        })

        console.log('✅ Account creation recorded:', { userId, email })

        return NextResponse.json({
            success: true,
            message: 'Account creation recorded',
        })
    } catch (error) {
        console.error('Error recording account creation:', error)
        return NextResponse.json(
            {
                error: 'Failed to record account creation',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        )
    }
}

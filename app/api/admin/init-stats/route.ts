/**
 * Initialize Account Statistics API Route
 *
 * Admin-only endpoint to count existing users and initialize system/stats
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin'

// Admin authorization
const ADMIN_TOKEN = process.env.NEXT_PUBLIC_ADMIN_TOKEN || 'your-secret-admin-token'

export async function POST(request: NextRequest) {
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

        // Find the most recent signup
        const sortedUsers = users.sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
        const lastSignup =
            sortedUsers.length > 0 ? new Date(sortedUsers[0].createdAt).getTime() : null

        await systemStatsRef.set(
            {
                totalAccounts: userCount,
                signupsToday: 0, // Reset daily count
                lastSignup,
                lastReset: Date.now(),
                updatedAt: Date.now(),
            },
            { merge: true }
        )

        console.log(`✅ Updated system/stats with totalAccounts: ${userCount}`)

        return NextResponse.json({
            success: true,
            userCount,
            previousCount,
            lastSignup: lastSignup ? new Date(lastSignup).toISOString() : null,
            message: `Account statistics initialized. Found ${userCount} users.`,
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

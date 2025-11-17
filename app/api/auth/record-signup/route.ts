/**
 * Record Account Creation API Route
 *
 * Called after successful Firebase Auth signup to track account creation in system/stats
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'

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

        // Update system stats
        const systemStatsRef = db.doc('system/stats')
        await systemStatsRef.set(
            {
                totalAccounts: FieldValue.increment(1),
                signupsToday: FieldValue.increment(1),
                lastSignup: Date.now(),
                lastSignupEmail: email,
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

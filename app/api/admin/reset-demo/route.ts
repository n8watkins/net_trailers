import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin'
import {
    validateAdminRequest,
    createUnauthorizedResponse,
    createForbiddenResponse,
} from '@/utils/adminMiddleware'

export async function POST(req: NextRequest) {
    try {
        // Validate admin access via Firebase Auth
        const authResult = await validateAdminRequest(req)
        if (!authResult.authorized) {
            return authResult.error?.includes('not an administrator')
                ? createForbiddenResponse(authResult.error)
                : createUnauthorizedResponse(authResult.error)
        }

        const adminAuth = getAdminAuth()
        const adminDb = getAdminDb()

        // Get all users
        const userList = await adminAuth.listUsers(1000)

        // Sort by creation time and keep first 5
        const sortedUsers = userList.users.sort(
            (a, b) =>
                new Date(a.metadata.creationTime).getTime() -
                new Date(b.metadata.creationTime).getTime()
        )

        const usersToDelete = sortedUsers.slice(5)
        const usersToKeep = sortedUsers.slice(0, 5)

        // Delete extra users
        let deleteCount = 0
        for (const user of usersToDelete) {
            try {
                await adminAuth.deleteUser(user.uid)
                // Also delete from signupLog
                await adminDb.collection('signupLog').doc(user.uid).delete()
                deleteCount++
            } catch (error) {
                console.error(`Failed to delete user ${user.uid}:`, error)
            }
        }

        // Update account count
        await adminDb.doc('system/stats').set(
            {
                totalAccounts: usersToKeep.length,
                signupsToday: 0,
                lastReset: Date.now(),
            },
            { merge: true }
        )

        return NextResponse.json({
            success: true,
            deleted: deleteCount,
            remaining: usersToKeep.length,
        })
    } catch (error) {
        console.error('Error resetting demo accounts:', error)
        return NextResponse.json({ error: 'Failed to reset' }, { status: 500 })
    }
}

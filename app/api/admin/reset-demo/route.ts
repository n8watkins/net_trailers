/**
 * Reset Demo Accounts
 *
 * Keeps the 5 oldest registered users and deletes the rest (plus their
 * cascade-deleted data via FK ON DELETE CASCADE in the schema).
 *
 * NOTE: In the Auth.js/Turso model there is no Firebase Admin Auth to call;
 * deleting from the `user` table cascades to all child rows via the FK
 * constraints defined in db/schema.ts.
 */

import { asc } from 'drizzle-orm'
import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/db'
import { profiles, signupLog, users } from '@/db/schema'
import {
    createForbiddenResponse,
    createUnauthorizedResponse,
    validateAdminRequest,
} from '@/utils/adminMiddleware'

export async function POST(req: NextRequest) {
    try {
        const authResult = await validateAdminRequest(req)
        if (!authResult.authorized) {
            return authResult.error?.includes('not an administrator')
                ? createForbiddenResponse(authResult.error)
                : createUnauthorizedResponse(authResult.error)
        }

        // Fetch all users sorted by profile.createdAt asc (oldest first).
        const profileRows = await db
            .select({ userId: profiles.userId })
            .from(profiles)
            .orderBy(asc(profiles.createdAt))

        const usersToKeepIds = new Set(profileRows.slice(0, 5).map((p) => p.userId))
        const usersToDeleteIds = profileRows.slice(5).map((p) => p.userId)

        let deleteCount = 0
        for (const userId of usersToDeleteIds) {
            try {
                // Cascade deletion: deleting from `user` removes all FK-linked rows.
                const { eq } = await import('drizzle-orm')
                await db.delete(users).where(eq(users.id, userId))
                deleteCount++
            } catch (error) {
                console.error(`Failed to delete user ${userId}:`, error)
            }
        }

        return NextResponse.json({
            success: true,
            deleted: deleteCount,
            remaining: usersToKeepIds.size,
        })
    } catch (error) {
        console.error('Admin reset-demo error:', error)
        return NextResponse.json({ error: 'Failed to reset' }, { status: 500 })
    }
}

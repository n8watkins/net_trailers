/**
 * Admin Users List API Route
 *
 * Returns all registered users from the Turso/Drizzle `user` and `profiles`
 * tables.  The response shape is intentionally kept close to what the old
 * Firebase Admin SDK returned so the existing client components need no
 * changes.
 */

import { desc, eq } from 'drizzle-orm'
import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/db'
import { profiles, users } from '@/db/schema'
import {
    createForbiddenResponse,
    createUnauthorizedResponse,
    validateAdminRequest,
} from '@/utils/adminMiddleware'

export async function GET(request: NextRequest) {
    try {
        const authResult = await validateAdminRequest(request)
        if (!authResult.authorized) {
            return authResult.error?.includes('not an administrator')
                ? createForbiddenResponse(authResult.error)
                : createUnauthorizedResponse(authResult.error)
        }

        // Fetch all users from the Auth.js `user` table.
        const userRows = await db
            .select({
                id: users.id,
                name: users.name,
                email: users.email,
                image: users.image,
                githubLogin: users.githubLogin,
            })
            .from(users)

        // Fetch all profiles (one per user when created).
        const profileRows = await db
            .select({
                userId: profiles.userId,
                displayName: profiles.displayName,
                avatarUrl: profiles.avatarUrl,
                createdAt: profiles.createdAt,
                lastLoginAt: profiles.lastLoginAt,
            })
            .from(profiles)

        // Build a lookup map: userId -> profile.
        const profileMap = new Map(profileRows.map((p) => [p.userId, p]))

        const userList = userRows
            .map((u) => {
                const profile = profileMap.get(u.id)
                const createdAtMs = profile?.createdAt ?? 0
                const lastLoginMs = profile?.lastLoginAt ?? createdAtMs
                return {
                    uid: u.id,
                    email: u.email ?? 'No email',
                    displayName:
                        profile?.displayName ?? u.name ?? u.email?.split('@')[0] ?? 'Anonymous',
                    photoURL: profile?.avatarUrl ?? u.image ?? null,
                    // GitHub OAuth always verifies the email; we don't store
                    // emailVerified separately in the new schema.
                    emailVerified: true,
                    disabled: false,
                    // Keep ISO-string shape expected by the UI.
                    createdAt: createdAtMs
                        ? new Date(createdAtMs).toISOString()
                        : new Date(0).toISOString(),
                    lastSignInAt: lastLoginMs
                        ? new Date(lastLoginMs).toISOString()
                        : new Date(createdAtMs).toISOString(),
                    providerData: u.githubLogin
                        ? [{ providerId: 'github.com', uid: u.githubLogin }]
                        : [{ providerId: 'unknown', uid: u.id }],
                }
            })
            // Newest first.
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

        return NextResponse.json({
            users: userList,
            totalCount: userList.length,
        })
    } catch (error) {
        console.error('Admin users list error:', error)
        return NextResponse.json(
            {
                error: 'Failed to fetch users',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        )
    }
}

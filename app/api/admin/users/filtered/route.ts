import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/db'
import { profiles, userPreferences, users } from '@/db/schema'
import {
    createForbiddenResponse,
    createUnauthorizedResponse,
    validateAdminRequest,
} from '@/utils/adminMiddleware'

/**
 * GET /api/admin/users/filtered
 *
 * Returns a list of authenticated users for email targeting (ADMIN ONLY).
 *
 * Filter values:
 *   all      – every user that has an email address
 *   recent   – last-login within 7 days  (uses profiles.lastLoginAt)
 *   inactive – last-login older than 30 days
 *   trending / social – users with those notification preferences enabled
 *                       (stored in the userPreferences JSON blob)
 *
 * Guest-user targeting: guests are not persisted in the DB, so a "guest"
 * filter always returns an empty list with a note in the response.
 */
export async function GET(request: NextRequest) {
    try {
        const authResult = await validateAdminRequest(request)
        if (!authResult.authorized) {
            return authResult.error?.includes('not an administrator')
                ? createForbiddenResponse(authResult.error)
                : createUnauthorizedResponse(authResult.error)
        }

        const { searchParams } = new URL(request.url)
        const filter = searchParams.get('filter') || 'all'

        console.log(`[AdminUsersFiltered] Fetching users with filter: ${filter}`)

        // Fetch users + profiles + preferences in three queries, then merge in JS.
        const userRows = await db
            .select({
                id: users.id,
                name: users.name,
                email: users.email,
            })
            .from(users)

        const profileRows = await db
            .select({
                userId: profiles.userId,
                displayName: profiles.displayName,
                createdAt: profiles.createdAt,
                lastLoginAt: profiles.lastLoginAt,
            })
            .from(profiles)

        const prefRows = await db
            .select({
                userId: userPreferences.userId,
                data: userPreferences.data,
            })
            .from(userPreferences)

        const profileMap = new Map(profileRows.map((p) => [p.userId, p]))
        const prefMap = new Map(prefRows.map((p) => [p.userId, p.data]))

        interface FilteredUser {
            userId: string
            email: string
            displayName?: string
            createdAt: number
            lastActive: number
            emailNotifications: { trending: boolean; social: boolean }
        }

        const allUsers: FilteredUser[] = userRows
            .filter((u) => Boolean(u.email))
            .map((u) => {
                const profile = profileMap.get(u.id)
                const prefs = prefMap.get(u.id)

                // emailNotifications lives inside the UserPreferences JSON blob.
                const emailNotif = (prefs as any)?.emailNotifications ?? {}

                return {
                    userId: u.id,
                    email: u.email!,
                    displayName: profile?.displayName ?? u.name ?? undefined,
                    createdAt: profile?.createdAt ?? 0,
                    lastActive: profile?.lastLoginAt ?? profile?.createdAt ?? 0,
                    emailNotifications: {
                        trending: Boolean(emailNotif.trending),
                        social: Boolean(emailNotif.social),
                    },
                }
            })

        const now = Date.now()
        let filteredUsers: FilteredUser[]

        switch (filter) {
            case 'trending':
                filteredUsers = allUsers.filter((u) => u.emailNotifications.trending)
                break
            case 'social':
                filteredUsers = allUsers.filter((u) => u.emailNotifications.social)
                break
            case 'recent': {
                const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000
                filteredUsers = allUsers.filter((u) => u.lastActive > sevenDaysAgo)
                break
            }
            case 'inactive': {
                const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000
                filteredUsers = allUsers.filter((u) => u.lastActive < thirtyDaysAgo)
                break
            }
            case 'all':
            default:
                filteredUsers = allUsers
                break
        }

        filteredUsers.sort((a, b) => b.lastActive - a.lastActive)

        console.log(
            `[AdminUsersFiltered] Returning ${filteredUsers.length} users (filter: ${filter})`
        )

        return NextResponse.json({
            success: true,
            users: filteredUsers,
            totalUsers: allUsers.length,
            filter,
            note:
                filter === 'all'
                    ? 'Guest users are not stored in the database and are not included in email targeting.'
                    : undefined,
        })
    } catch (error) {
        console.error('[AdminUsersFiltered] Error:', error)
        return NextResponse.json(
            {
                error: 'Failed to fetch users',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        )
    }
}

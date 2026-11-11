import { eq } from 'drizzle-orm'
import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/db'
import { profiles, userPreferences, users } from '@/db/schema'
import { badRequest, requireAdmin, serverError } from '@/lib/admin/guard'
import { canReceiveAdminEmail } from '@/lib/admin/recipients'
import { recipientFilter } from '@/lib/admin/schemas'

/**
 * GET /api/admin/users/filtered?filter=all|trending|social|recent|inactive
 *
 * The recipient list for the email composer (admin only). Every user comes
 * back with `canReceiveEmail`: false for anyone with email off, including
 * everyone who unsubscribed. The composer shows them disabled and the send
 * route skips them anyway.
 *
 *   recent   - signed in within 7 days (user.lastLoginAt)
 *   inactive - no sign-in for 30 days (or never recorded)
 */
export async function GET(request: NextRequest) {
    const guard = await requireAdmin()
    if (!guard.ok) return guard.response

    const parsed = recipientFilter.safeParse(
        new URL(request.url).searchParams.get('filter') ?? undefined
    )
    if (!parsed.success) return badRequest('Unknown filter')
    const filter = parsed.data

    try {
        const rows = await db
            .select({
                id: users.id,
                name: users.name,
                email: users.email,
                createdAt: users.createdAt,
                lastLoginAt: users.lastLoginAt,
                displayName: profiles.displayName,
                profileCreatedAt: profiles.createdAt,
                prefs: userPreferences.data,
            })
            .from(users)
            .leftJoin(profiles, eq(profiles.userId, users.id))
            .leftJoin(userPreferences, eq(userPreferences.userId, users.id))

        const allUsers = rows
            .filter((row) => Boolean(row.email))
            .map((row) => {
                const types = (row.prefs as { notifications?: { types?: Record<string, unknown> } })
                    ?.notifications?.types
                return {
                    userId: row.id,
                    email: row.email!,
                    displayName: row.displayName ?? row.name ?? null,
                    createdAt: row.createdAt ?? row.profileCreatedAt ?? null,
                    lastActive: row.lastLoginAt ?? null,
                    canReceiveEmail: canReceiveAdminEmail(row.prefs),
                    emailNotifications: {
                        trending: types?.trending_update === true,
                        social: types?.system !== false,
                    },
                }
            })

        const now = Date.now()
        const day = 24 * 60 * 60 * 1000
        const filtered = allUsers.filter((u) => {
            switch (filter) {
                case 'trending':
                    return u.canReceiveEmail && u.emailNotifications.trending
                case 'social':
                    return u.canReceiveEmail && u.emailNotifications.social
                case 'recent':
                    return (u.lastActive ?? 0) > now - 7 * day
                case 'inactive':
                    return (u.lastActive ?? 0) < now - 30 * day
                default:
                    return true
            }
        })
        filtered.sort((a, b) => (b.lastActive ?? 0) - (a.lastActive ?? 0))

        return NextResponse.json({
            success: true,
            users: filtered,
            totalUsers: allUsers.length,
            optedOut: allUsers.filter((u) => !u.canReceiveEmail).length,
            filter,
        })
    } catch (error) {
        console.error('[AdminUsersFiltered] Error:', error)
        return serverError('Failed to fetch users')
    }
}

/**
 * GET /api/admin/users (admin only): every account for the Accounts and
 * Sign-ups pages. Dates are epoch-ms based ISO strings, or null when unknown
 * (accounts made before the dates were recorded and without a profile).
 */

import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'

import { db } from '@/db'
import { accounts, profiles, users } from '@/db/schema'
import { requireAdmin, serverError } from '@/lib/admin/guard'

const iso = (ms: number | null | undefined) => (ms ? new Date(ms).toISOString() : null)

export async function GET() {
    const guard = await requireAdmin()
    if (!guard.ok) return guard.response

    try {
        const rows = await db
            .select({
                id: users.id,
                name: users.name,
                email: users.email,
                image: users.image,
                emailVerified: users.emailVerified,
                createdAt: users.createdAt,
                lastLoginAt: users.lastLoginAt,
                displayName: profiles.displayName,
                avatarUrl: profiles.avatarUrl,
                profileCreatedAt: profiles.createdAt,
                profileLastLoginAt: profiles.lastLoginAt,
            })
            .from(users)
            .leftJoin(profiles, eq(profiles.userId, users.id))

        // OAuth accounts (GitHub); an account without one signs in by email.
        const linked = await db
            .select({ userId: accounts.userId, provider: accounts.provider })
            .from(accounts)
        const providersByUser = new Map<string, string[]>()
        for (const { userId, provider } of linked) {
            providersByUser.set(userId, [...(providersByUser.get(userId) ?? []), provider])
        }

        const userList = rows
            .map((u) => ({
                uid: u.id,
                email: u.email ?? 'No email',
                displayName: u.displayName ?? u.name ?? u.email?.split('@')[0] ?? 'No name',
                photoURL: u.avatarUrl ?? u.image ?? null,
                emailVerified: u.emailVerified !== null,
                createdAt: iso(u.createdAt ?? u.profileCreatedAt),
                lastSignInAt: iso(u.lastLoginAt ?? u.profileLastLoginAt),
                providers: providersByUser.get(u.id) ?? ['email'],
            }))
            .sort(
                (a, b) =>
                    (b.createdAt ? Date.parse(b.createdAt) : 0) -
                    (a.createdAt ? Date.parse(a.createdAt) : 0)
            )

        return NextResponse.json({ users: userList, totalCount: userList.length })
    } catch (error) {
        console.error('Admin users list error:', error)
        return serverError('Failed to fetch users')
    }
}

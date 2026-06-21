/**
 * Shared helpers for the Drizzle query layer (server-only).
 *
 * All `db/queries/*` modules run on the server and are invoked from API routes.
 * Ownership is enforced by deriving the user id from the Auth.js session
 * (`currentUserId`) rather than trusting a client-supplied id.
 */

import { sql } from 'drizzle-orm'

import { auth } from '@/auth'
import { db } from '@/db'
import { users } from '@/db/schema'

/** Epoch-millisecond timestamp (matches the app's `number` timestamp fields). */
export const now = (): number => Date.now()

/** The authenticated user's id from the Auth.js session, or null when signed out. */
export async function currentUserId(): Promise<string | null> {
    const session = await auth()
    return session?.user?.id ?? null
}

/** Whether the current session belongs to an admin (ADMIN_GITHUB_LOGIN). */
export async function isCurrentUserAdmin(): Promise<boolean> {
    const session = await auth()
    return Boolean(session?.user?.isAdmin)
}

/**
 * Resolve the admin's Turso user id from `ADMIN_GITHUB_LOGIN` (matched
 * case-insensitively against the persisted `users.githubLogin`). Returns null
 * when the env var is unset or the admin has not signed in yet. Replaces the
 * removed `ADMIN_UID` env var used by cron/test email routes.
 */
export async function getAdminUserId(): Promise<string | null> {
    const login = process.env.ADMIN_GITHUB_LOGIN?.toLowerCase()
    if (!login) return null

    const rows = await db
        .select({ id: users.id })
        .from(users)
        .where(sql`lower(${users.githubLogin}) = ${login}`)
        .limit(1)

    return rows[0]?.id ?? null
}

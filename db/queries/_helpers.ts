/**
 * Shared helpers for the Drizzle query layer (server-only).
 *
 * All `db/queries/*` modules run on the server and are invoked from API routes.
 * Ownership is enforced by deriving the user id from the Auth.js session
 * (`currentUserId`) rather than trusting a client-supplied id.
 */

import { auth } from '@/auth'

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

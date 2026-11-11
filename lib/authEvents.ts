/**
 * Auth.js events (auth.ts `events`): what a sign-up and a sign-in leave in the
 * database, for the admin pages. Works the same for every provider.
 *
 *  - sign-up: a `signup_log` row (user id only, no address) for the sign-up counts;
 *  - sign-in: `user.lastLoginAt` and a `login` row in `user_activity`.
 *
 * Neither may break a sign-in, so failures are logged and swallowed.
 */

import { eq } from 'drizzle-orm'

import { db } from '@/db'
import { signupLog, userActivity, users } from '@/db/schema'

/** Auth.js `events.createUser`: count the sign-up. */
export async function recordSignUp(userId: string | undefined, now = Date.now()): Promise<void> {
    if (!userId) return
    try {
        await db.insert(signupLog).values({ userId, timestamp: now })
    } catch (error) {
        console.error('[authEvents] signup_log write failed:', error)
    }
}

/** Auth.js `events.signIn`: stamp the last sign-in and record a login event. */
export async function recordSignIn(
    userId: string | undefined,
    provider: string | undefined,
    now = Date.now()
): Promise<void> {
    if (!userId) return
    try {
        await db.update(users).set({ lastLoginAt: now }).where(eq(users.id, userId))
        await db.insert(userActivity).values({
            userId,
            type: 'login',
            timestamp: now,
            referenceId: null,
            referenceType: provider ?? null,
            preview: null,
        })
    } catch (error) {
        console.error('[authEvents] sign-in record failed:', error)
    }
}

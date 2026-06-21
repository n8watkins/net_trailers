/**
 * User preferences queries (the former `users/{userId}` Firestore document).
 *
 * The entire UserPreferences blob is stored as a single JSON column keyed by
 * user id. This mirrors the previous single-document model.
 */

import { eq } from 'drizzle-orm'

import { db } from '@/db'
import { userPreferences } from '@/db/schema'
import { defaultAuthSession, type UserPreferences } from '@/types/shared'

/** A fresh copy of the default preferences (with a current lastActive). */
function defaultPreferences(): UserPreferences {
    return { ...structuredClone(defaultAuthSession.preferences), lastActive: Date.now() }
}

/**
 * Load a user's preferences. Creates a default row on first access so the
 * caller always gets a valid object (matching the old auto-create behaviour).
 */
export async function loadUserPreferences(userId: string): Promise<UserPreferences> {
    const rows = await db
        .select()
        .from(userPreferences)
        .where(eq(userPreferences.userId, userId))
        .limit(1)

    if (rows.length > 0) {
        return rows[0].data
    }

    const data = defaultPreferences()
    await db
        .insert(userPreferences)
        .values({ userId, data, updatedAt: Date.now() })
        .onConflictDoNothing()
    return data
}

/** Upsert a user's preferences (stamps lastActive/updatedAt). */
export async function saveUserPreferences(
    userId: string,
    preferences: UserPreferences
): Promise<void> {
    const data: UserPreferences = { ...preferences, lastActive: Date.now() }
    const ts = Date.now()
    await db
        .insert(userPreferences)
        .values({ userId, data, updatedAt: ts })
        .onConflictDoUpdate({
            target: userPreferences.userId,
            set: { data, updatedAt: ts },
        })
}

/** Reset a user's preferences to defaults and return them. */
export async function clearUserPreferences(userId: string): Promise<UserPreferences> {
    const data = defaultPreferences()
    await saveUserPreferences(userId, data)
    return data
}

/** Permanently delete a user's preferences row. */
export async function deleteUserPreferences(userId: string): Promise<void> {
    await db.delete(userPreferences).where(eq(userPreferences.userId, userId))
}

/** Whether a preferences row exists for the user. */
export async function userPreferencesExist(userId: string): Promise<boolean> {
    const rows = await db
        .select({ userId: userPreferences.userId })
        .from(userPreferences)
        .where(eq(userPreferences.userId, userId))
        .limit(1)
    return rows.length > 0
}

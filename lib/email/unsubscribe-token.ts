/**
 * Unsubscribe Token Management
 *
 * Generates and manages unique tokens for one-click unsubscribe (CAN-SPAM
 * compliance).  Tokens are stored inside the `userPreferences.data` JSON blob
 * under the key `unsubscribeToken`.
 *
 * Storage rationale: db/schema.ts cannot be modified (project constraint).
 * The `userPreferences.data` column is an open JSON blob keyed by userId.
 * Storing the token there avoids adding a new column while keeping all
 * user-preference data in one document — the same mental model as the former
 * Firestore approach.
 */

import crypto from 'crypto'
import { eq } from 'drizzle-orm'

import { db } from '@/db'
import { userPreferences } from '@/db/schema'

/** Read the token embedded in userPreferences.data for a single user. */
async function getStoredToken(userId: string): Promise<string | null> {
    const rows = await db
        .select({ data: userPreferences.data })
        .from(userPreferences)
        .where(eq(userPreferences.userId, userId))
        .limit(1)

    if (rows.length === 0) return null
    return (rows[0].data as any)?.unsubscribeToken ?? null
}

/** Merge the token into userPreferences.data, upserting the row. */
async function storeToken(userId: string, token: string): Promise<void> {
    const ts = Date.now()

    const existing = await db
        .select({ data: userPreferences.data })
        .from(userPreferences)
        .where(eq(userPreferences.userId, userId))
        .limit(1)

    const currentData: Record<string, unknown> =
        existing.length > 0 ? (existing[0].data as unknown as Record<string, unknown>) : {}

    const updatedData = {
        ...currentData,
        unsubscribeToken: token,
        unsubscribeTokenCreatedAt: ts,
    }

    await db
        .insert(userPreferences)
        .values({ userId, data: updatedData as any, updatedAt: ts })
        .onConflictDoUpdate({
            target: userPreferences.userId,
            set: { data: updatedData as any, updatedAt: ts },
        })
}

/**
 * Ensure a user has an unsubscribe token, generating one if needed.
 * @returns The token for this user.
 */
export async function ensureUnsubscribeToken(userId: string): Promise<string> {
    const existing = await getStoredToken(userId)
    if (existing) return existing

    const token = crypto.randomBytes(32).toString('hex')
    await storeToken(userId, token)
    console.log(`[UnsubscribeToken] Generated token for user ${userId}`)
    return token
}

/**
 * Batch-ensure unsubscribe tokens for multiple users.
 * Single SELECT reads all existing tokens; writes only the missing ones.
 * @returns Map of userId → token
 */
export async function batchEnsureUnsubscribeTokens(
    userIds: string[]
): Promise<Map<string, string>> {
    const tokens = new Map<string, string>()

    if (userIds.length === 0) return tokens

    try {
        // One query for all preference rows.
        const rows = await db
            .select({ userId: userPreferences.userId, data: userPreferences.data })
            .from(userPreferences)

        const prefMap = new Map(rows.map((r) => [r.userId, r.data as any]))

        const usersNeedingTokens: string[] = []

        for (const uid of userIds) {
            const existing = prefMap.get(uid)?.unsubscribeToken as string | undefined
            if (existing) {
                tokens.set(uid, existing)
            } else {
                const token = crypto.randomBytes(32).toString('hex')
                tokens.set(uid, token)
                usersNeedingTokens.push(uid)
            }
        }

        // Write tokens for users that didn't have one.
        for (const uid of usersNeedingTokens) {
            await storeToken(uid, tokens.get(uid)!)
        }

        if (usersNeedingTokens.length > 0) {
            console.log(`[UnsubscribeToken] Generated ${usersNeedingTokens.length} new tokens`)
        }

        return tokens
    } catch (error) {
        console.error('[UnsubscribeToken] Batch operation failed:', error)
        throw error
    }
}

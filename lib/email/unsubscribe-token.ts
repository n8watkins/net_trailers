import crypto from 'crypto'
import { getAdminDb } from '../firebase-admin'

/**
 * Unsubscribe Token Management
 *
 * Generates and manages unique tokens for one-click unsubscribe (CAN-SPAM compliance)
 * Tokens are stored in Firestore user documents for verification
 */

/**
 * Ensure user has an unsubscribe token, generating one if needed
 * Uses Firestore transaction to prevent race conditions
 * @param userId - Firebase UID of the user
 * @returns Unsubscribe token for the user
 */
export async function ensureUnsubscribeToken(userId: string): Promise<string> {
    const db = getAdminDb()
    const userRef = db.collection('users').doc(userId)

    // Use transaction to prevent race condition where multiple concurrent
    // requests generate different tokens for the same user
    return await db.runTransaction(async (transaction) => {
        const userDoc = await transaction.get(userRef)

        if (!userDoc.exists) {
            throw new Error(`User ${userId} not found`)
        }

        const userData = userDoc.data()

        // Return existing token if present
        if (userData?.unsubscribeToken) {
            return userData.unsubscribeToken
        }

        // Generate new cryptographically secure token
        const token = crypto.randomBytes(32).toString('hex')

        // Store token in user document (atomic operation)
        transaction.update(userRef, {
            unsubscribeToken: token,
            unsubscribeTokenCreatedAt: Date.now(),
        })

        console.log(`[UnsubscribeToken] Generated token for user ${userId}`)

        return token
    })
}

/**
 * Batch generate unsubscribe tokens for multiple users
 * Uses batched Firestore reads to avoid N+1 queries
 * @param userIds - Array of Firebase UIDs
 * @returns Map of userId => token
 */
export async function batchEnsureUnsubscribeTokens(
    userIds: string[]
): Promise<Map<string, string>> {
    const tokens = new Map<string, string>()
    const db = getAdminDb()

    if (userIds.length === 0) {
        return tokens
    }

    try {
        // Batch read all user documents (single multi-get operation)
        const userRefs = userIds.map((uid) => db.collection('users').doc(uid))
        const userDocs = await db.getAll(...userRefs)

        // Identify users needing new tokens
        const usersNeedingTokens: string[] = []
        const newTokens: Map<string, string> = new Map()

        for (const userDoc of userDocs) {
            if (!userDoc.exists) {
                console.warn(`[UnsubscribeToken] User not found: ${userDoc.id}`)
                continue
            }

            const userData = userDoc.data()

            // Use existing token if present
            if (userData?.unsubscribeToken) {
                tokens.set(userDoc.id, userData.unsubscribeToken)
            } else {
                // Generate new token
                usersNeedingTokens.push(userDoc.id)
                const token = crypto.randomBytes(32).toString('hex')
                newTokens.set(userDoc.id, token)
                tokens.set(userDoc.id, token)
            }
        }

        // Batch write new tokens (up to 500 per batch, Firestore limit)
        if (usersNeedingTokens.length > 0) {
            const batchSize = 500
            for (let i = 0; i < usersNeedingTokens.length; i += batchSize) {
                const batch = db.batch()
                const batchUserIds = usersNeedingTokens.slice(i, i + batchSize)

                for (const userId of batchUserIds) {
                    const token = newTokens.get(userId)!
                    const userRef = db.collection('users').doc(userId)

                    batch.update(userRef, {
                        unsubscribeToken: token,
                        unsubscribeTokenCreatedAt: Date.now(),
                    })
                }

                await batch.commit()
                console.log(
                    `[UnsubscribeToken] Generated ${batchUserIds.length} tokens (batch ${Math.floor(i / batchSize) + 1})`
                )
            }
        }

        return tokens
    } catch (error) {
        console.error('[UnsubscribeToken] Batch operation failed:', error)
        throw error
    }
}

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
 * @param userId - Firebase UID of the user
 * @returns Unsubscribe token for the user
 */
export async function ensureUnsubscribeToken(userId: string): Promise<string> {
    const db = getAdminDb()
    const userDoc = await db.collection('users').doc(userId).get()

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

    // Store token in user document
    await db.collection('users').doc(userId).update({
        unsubscribeToken: token,
        unsubscribeTokenCreatedAt: Date.now(),
    })

    console.log(`[UnsubscribeToken] Generated token for user ${userId}`)

    return token
}

/**
 * Batch generate unsubscribe tokens for multiple users
 * @param userIds - Array of Firebase UIDs
 * @returns Map of userId => token
 */
export async function batchEnsureUnsubscribeTokens(
    userIds: string[]
): Promise<Map<string, string>> {
    const tokens = new Map<string, string>()

    // Process in parallel for performance
    await Promise.all(
        userIds.map(async (userId) => {
            try {
                const token = await ensureUnsubscribeToken(userId)
                tokens.set(userId, token)
            } catch (error) {
                console.error(`[UnsubscribeToken] Failed to generate token for ${userId}:`, error)
            }
        })
    )

    return tokens
}

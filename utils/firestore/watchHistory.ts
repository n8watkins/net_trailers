/**
 * Firestore Utilities for Watch History
 *
 * Functions for persisting watch history to Firestore
 */

import { doc, getDoc, setDoc, runTransaction } from 'firebase/firestore'
import { db } from '../../firebase'
import { WatchHistoryEntry, WatchHistoryDocument } from '../../types/watchHistory'
import { watchHistoryLog, watchHistoryError } from '../debugLogger'

const removeUndefinedValues = <T>(value: T): T => {
    if (Array.isArray(value)) {
        return value.map((item) => removeUndefinedValues(item)) as unknown as T
    }

    if (value !== null && typeof value === 'object') {
        const cleaned: Record<string, unknown> = {}
        for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
            if (val !== undefined) {
                cleaned[key] = removeUndefinedValues(val)
            }
        }
        return cleaned as T
    }

    return value
}

/**
 * Get watch history from Firestore
 */
export async function getWatchHistory(userId: string): Promise<WatchHistoryEntry[] | null> {
    watchHistoryLog('[Firestore Watch History] 🔍 Fetching watch history for user:', userId)
    try {
        const docRef = doc(db, 'users', userId, 'data', 'watchHistory')
        const docSnap = await getDoc(docRef)

        if (docSnap.exists()) {
            const data = docSnap.data() as WatchHistoryDocument
            watchHistoryLog(
                '[Firestore Watch History] 📥 Found',
                data.history?.length || 0,
                'entries in Firestore'
            )
            return data.history || []
        }

        watchHistoryLog('[Firestore Watch History] ⚠️ No document found in Firestore')
        return null
    } catch (error) {
        watchHistoryError('[Firestore Watch History] ❌ Error fetching:', error)
        // Silently fail - permissions error may occur if auth isn't ready yet
        return null
    }
}

/**
 * Save watch history to Firestore
 */
export async function saveWatchHistory(
    userId: string,
    history: WatchHistoryEntry[]
): Promise<void> {
    watchHistoryLog(
        '[Firestore Watch History] 💾 Saving',
        history.length,
        'entries for user:',
        userId
    )
    try {
        const docRef = doc(db, 'users', userId, 'data', 'watchHistory')

        const data: WatchHistoryDocument = removeUndefinedValues({
            history,
            updatedAt: Date.now(),
        })

        await setDoc(docRef, data, { merge: true })
        watchHistoryLog('[Firestore Watch History] ✅ Successfully saved to Firestore')
    } catch (error) {
        watchHistoryError('[Firestore Watch History] ❌ Failed to save:', error)
        throw error // Re-throw so seeding knows it failed
    }
}

/**
 * Delete all watch history from Firestore
 */
export async function deleteWatchHistory(userId: string): Promise<void> {
    watchHistoryLog('[Firestore Watch History] 🗑️ Deleting watch history for user:', userId)
    try {
        const docRef = doc(db, 'users', userId, 'data', 'watchHistory')

        // Set history to empty array rather than deleting the document
        // This preserves the document structure and updatedAt timestamp
        const data: WatchHistoryDocument = {
            history: [],
            updatedAt: Date.now(),
        }

        await setDoc(docRef, data)
        watchHistoryLog('[Firestore Watch History] ✅ Successfully deleted watch history')
    } catch (error) {
        watchHistoryError('[Firestore Watch History] ❌ Failed to delete:', error)
        throw error
    }
}

/**
 * Add a single watch entry to Firestore using transaction
 * Prevents race conditions and ensures atomic updates
 */
export async function addWatchEntryToFirestore(
    userId: string,
    entry: WatchHistoryEntry
): Promise<void> {
    try {
        const docRef = doc(db, 'users', userId, 'data', 'watchHistory')

        await runTransaction(db, async (transaction) => {
            // Read current history
            const docSnap = await transaction.get(docRef)
            const existingHistory = docSnap.exists()
                ? (docSnap.data() as WatchHistoryDocument).history || []
                : []

            // Check if entry already exists
            const existingIndex = existingHistory.findIndex(
                (e) => e.contentId === entry.contentId && e.mediaType === entry.mediaType
            )

            let updatedHistory: WatchHistoryEntry[]
            if (existingIndex !== -1) {
                // Update existing entry (keep position)
                updatedHistory = [...existingHistory]
                updatedHistory[existingIndex] = entry
            } else {
                // Add new entry to beginning
                updatedHistory = [entry, ...existingHistory]
            }

            // Limit to last 500 entries to prevent excessive storage
            const limitedHistory = updatedHistory.slice(0, 500)

            // Prepare data with undefined values removed
            const data: WatchHistoryDocument = removeUndefinedValues({
                history: limitedHistory,
                updatedAt: Date.now(),
            })

            // Write atomically
            transaction.set(docRef, data, { merge: true })
        })

        watchHistoryLog('[Firestore Watch History] ✅ Successfully added/updated entry')
    } catch (error) {
        watchHistoryError('[Firestore Watch History] ❌ Failed to add entry:', error)
        // Silently fail - watch history is not critical
    }
}

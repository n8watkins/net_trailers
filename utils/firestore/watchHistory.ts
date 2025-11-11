/**
 * Firestore Utilities for Watch History
 *
 * Functions for persisting watch history to Firestore
 */

import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../../firebase'
import { WatchHistoryEntry, WatchHistoryDocument } from '../../types/watchHistory'

/**
 * Get watch history from Firestore
 */
export async function getWatchHistory(userId: string): Promise<WatchHistoryEntry[] | null> {
    console.log('[Firestore Watch History] 🔍 Fetching watch history for user:', userId)
    try {
        const docRef = doc(db, 'users', userId, 'data', 'watchHistory')
        const docSnap = await getDoc(docRef)

        if (docSnap.exists()) {
            const data = docSnap.data() as WatchHistoryDocument
            console.log(
                '[Firestore Watch History] 📥 Found',
                data.history?.length || 0,
                'entries in Firestore'
            )
            return data.history || []
        }

        console.log('[Firestore Watch History] ⚠️ No document found in Firestore')
        return null
    } catch (error) {
        console.error('[Firestore Watch History] ❌ Error fetching:', error)
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
    console.log('[Firestore Watch History] 💾 Saving', history.length, 'entries for user:', userId)
    try {
        const docRef = doc(db, 'users', userId, 'data', 'watchHistory')

        const data: WatchHistoryDocument = {
            history,
            updatedAt: Date.now(),
        }

        await setDoc(docRef, data, { merge: true })
        console.log('[Firestore Watch History] ✅ Successfully saved to Firestore')
    } catch (error) {
        console.error('[Firestore Watch History] ❌ Failed to save:', error)
        throw error // Re-throw so seeding knows it failed
    }
}

/**
 * Add a single watch entry to Firestore
 * This is more efficient than saving the entire history array
 */
export async function addWatchEntryToFirestore(
    userId: string,
    entry: WatchHistoryEntry
): Promise<void> {
    try {
        // Get existing history
        const existingHistory = await getWatchHistory(userId)
        const history = existingHistory || []

        // Check if entry already exists
        const existingIndex = history.findIndex(
            (e) => e.contentId === entry.contentId && e.mediaType === entry.mediaType
        )

        if (existingIndex !== -1) {
            // Update existing entry
            history[existingIndex] = entry
        } else {
            // Add new entry
            history.unshift(entry)
        }

        // Limit to last 500 entries to prevent excessive storage
        const limitedHistory = history.slice(0, 500)

        // Save back to Firestore
        await saveWatchHistory(userId, limitedHistory)
    } catch (_error) {
        // Silently fail - watch history is not critical
    }
}

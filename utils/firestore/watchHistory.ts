/**
 * Firestore Utilities for Watch History
 *
 * Functions for persisting watch history to Firestore
 */

import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../firebase'
import { WatchHistoryEntry, WatchHistoryDocument } from '../../types/watchHistory'

/**
 * Get watch history from Firestore
 */
export async function getWatchHistory(userId: string): Promise<WatchHistoryEntry[] | null> {
    try {
        const docRef = doc(db, 'users', userId, 'data', 'watchHistory')
        const docSnap = await getDoc(docRef)

        if (docSnap.exists()) {
            const data = docSnap.data() as WatchHistoryDocument
            return data.history || []
        }

        return null
    } catch (error) {
        console.error('Error fetching watch history from Firestore:', error)
        throw error
    }
}

/**
 * Save watch history to Firestore
 */
export async function saveWatchHistory(
    userId: string,
    history: WatchHistoryEntry[]
): Promise<void> {
    try {
        const docRef = doc(db, 'users', userId, 'data', 'watchHistory')

        const data: WatchHistoryDocument = {
            history,
            updatedAt: Date.now(),
        }

        await setDoc(docRef, data, { merge: true })
    } catch (error) {
        console.error('Error saving watch history to Firestore:', error)
        throw error
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
    } catch (error) {
        console.error('Error adding watch entry to Firestore:', error)
        throw error
    }
}

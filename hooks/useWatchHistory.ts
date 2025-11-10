/**
 * Watch History Hook
 *
 * Hook that manages watch history for both authenticated and guest users
 * - Authenticated users: Synced with Firestore
 * - Guest users: Stored in localStorage (via Zustand persist)
 */

import { useEffect } from 'react'
import { useWatchHistoryStore } from '../stores/watchHistoryStore'
import { useSessionStore } from '../stores/sessionStore'
import { Content } from '../typings'
import { addWatchEntryToFirestore } from '../utils/firestore/watchHistory'

export function useWatchHistory() {
    const sessionType = useSessionStore((state) => state.sessionType)
    const getUserId = useSessionStore((state) => state.getUserId)
    const userId = getUserId()

    const {
        history,
        isLoading,
        addWatchEntry: addToStore,
        getAllHistory,
        getHistoryByDateRange,
        getWatchEntry,
        clearHistory,
        removeEntry,
        syncWithFirestore,
    } = useWatchHistoryStore()

    // Sync with Firestore on mount for authenticated users
    useEffect(() => {
        if (sessionType === 'authenticated' && userId) {
            syncWithFirestore(userId)
        }
    }, [sessionType, userId, syncWithFirestore])

    // Add watch entry with automatic Firestore sync for authenticated users
    const addWatchEntry = async (
        contentId: number,
        mediaType: 'movie' | 'tv',
        content: Content,
        progress?: number,
        duration?: number,
        watchedDuration?: number
    ) => {
        // Add to local store first (for immediate UI update)
        addToStore(contentId, mediaType, content, progress, duration, watchedDuration)

        // If authenticated, also save to Firestore
        if (sessionType === 'authenticated' && userId) {
            try {
                const entry = useWatchHistoryStore.getState().getWatchEntry(contentId, mediaType)
                if (entry) {
                    await addWatchEntryToFirestore(userId, entry)
                }
            } catch (_error) {
                // Silently fail - local store already updated
            }
        }
    }

    // Get storage type for display purposes
    const storageType = sessionType === 'authenticated' ? 'firestore' : 'localStorage'

    return {
        // Data
        history,
        isLoading,
        storageType,

        // Actions
        addWatchEntry,
        getAllHistory,
        getHistoryByDateRange,
        getWatchEntry,
        clearHistory,
        removeEntry,

        // Stats
        totalWatched: history.length,
        recentHistory: history.slice(0, 10), // Last 10 items
    }
}

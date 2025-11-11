/**
 * Watch History Hook
 *
 * Hook that manages watch history for both authenticated and guest users with proper session isolation:
 * - Authenticated users: Firestore-backed with no localStorage persistence
 * - Guest users: localStorage with session-scoped keys
 * - Automatic session transitions with proper data migration
 */

import { useEffect, useRef } from 'react'
import { useWatchHistoryStore } from '../stores/watchHistoryStore'
import { useSessionStore } from '../stores/sessionStore'
import { Content } from '../typings'
import { addWatchEntryToFirestore } from '../utils/firestore/watchHistory'
import { auth } from '../firebase'

export function useWatchHistory() {
    const sessionType = useSessionStore((state) => state.sessionType)
    const getUserId = useSessionStore((state) => state.getUserId)
    const userId = getUserId()
    const guestId = useSessionStore((state) => state.guestId)

    const {
        history,
        isLoading,
        currentSessionId,
        addWatchEntry: addToStore,
        getAllHistory,
        getHistoryByDateRange,
        getWatchEntry,
        clearHistory,
        removeEntry,
        syncWithFirestore,
        loadFromFirestore,
        migrateGuestToAuth,
        switchSession,
    } = useWatchHistoryStore()

    // Track previous session to detect transitions
    const prevSessionRef = useRef<{ type: typeof sessionType; id: string | null }>({
        type: sessionType,
        id: userId || guestId,
    })

    // Handle session transitions
    useEffect(() => {
        const currentSessionTypeId = userId || guestId
        const prevSession = prevSessionRef.current

        // Skip if no session ID yet
        if (!currentSessionTypeId) {
            return
        }

        // Detect session type change or session ID change
        const sessionChanged =
            prevSession.type !== sessionType || prevSession.id !== currentSessionTypeId

        if (sessionChanged) {
            console.log(
                `[Watch History] Session transition detected: ${prevSession.type}(${prevSession.id}) -> ${sessionType}(${currentSessionTypeId})`
            )

            // Special case: Guest to Auth transition - migrate data
            if (prevSession.type === 'guest' && sessionType === 'authenticated' && userId) {
                console.log('[Watch History] Migrating guest data to authenticated user')
                // Wait for Firebase Auth to be ready
                const unsubscribe = auth.onAuthStateChanged((user) => {
                    if (user && user.uid === userId) {
                        migrateGuestToAuth(userId)
                        unsubscribe()
                    }
                })
            } else {
                // Normal session switch - clear and reload
                switchSession(sessionType, currentSessionTypeId)
            }

            // Update ref
            prevSessionRef.current = { type: sessionType, id: currentSessionTypeId }
        } else if (sessionType === 'authenticated' && userId && currentSessionId !== userId) {
            // Authenticated user, but store hasn't loaded their data yet
            console.log('[Watch History] Loading authenticated user data from Firestore')
            // Wait for Firebase Auth to be ready
            const unsubscribe = auth.onAuthStateChanged((user) => {
                if (user && user.uid === userId) {
                    loadFromFirestore(userId)
                    unsubscribe()
                }
            })
        }
    }, [
        sessionType,
        userId,
        guestId,
        currentSessionId,
        switchSession,
        migrateGuestToAuth,
        loadFromFirestore,
    ])

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

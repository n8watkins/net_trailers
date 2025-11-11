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
import { addWatchEntryToFirestore, saveWatchHistory } from '../utils/firestore/watchHistory'
import { auth } from '../firebase'

export function useWatchHistory() {
    const sessionType = useSessionStore((state) => state.sessionType)
    const getUserId = useSessionStore((state) => state.getUserId)
    const userId = getUserId()
    const activeSessionId = useSessionStore((state) => state.activeSessionId)
    // For guest sessions, activeSessionId is the guest ID
    const guestId = sessionType === 'guest' ? activeSessionId : null

    const {
        history,
        isLoading,
        currentSessionId,
        lastSyncedAt,
        syncError,
        addWatchEntry: addToStore,
        getAllHistory,
        getHistoryByDateRange,
        getWatchEntry,
        clearHistory: clearHistoryInStore,
        removeEntry: removeEntryFromStore,
        syncWithFirestore,
        loadFromFirestore,
        switchSession,
        loadGuestSession,
        saveGuestSession,
        clearGuestSession,
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

            if (sessionType === 'guest' || sessionType === 'authenticated') {
                switchSession(sessionType, currentSessionTypeId).catch((error) => {
                    console.error('[Watch History] Failed to switch session:', error)
                })
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
        loadFromFirestore,
    ])

    const persistAuthHistory = async (userIdToPersist: string) => {
        try {
            const updatedHistory = useWatchHistoryStore.getState().history
            await saveWatchHistory(userIdToPersist, updatedHistory)

            useWatchHistoryStore.setState({
                currentSessionId: userIdToPersist,
                lastSyncedAt: Date.now(),
                syncError: null,
            })
        } catch (error) {
            console.error('Failed to persist watch history to Firestore:', error)
            useWatchHistoryStore.setState({
                syncError:
                    error instanceof Error ? error.message : 'Failed to sync watch history',
            })
        }
    }

    // Add watch entry with automatic persistence
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

        // Persist based on session type
        if (sessionType === 'authenticated' && userId) {
            // Authenticated: save to Firestore
            try {
                const entry = useWatchHistoryStore.getState().getWatchEntry(contentId, mediaType)
                if (entry) {
                    await addWatchEntryToFirestore(userId, entry)
                }
            } catch (_error) {
                // Silently fail - local store already updated
            }
        } else if (sessionType === 'guest' && guestId) {
            // Guest: save to localStorage
            saveGuestSession(guestId)
        }
    }

    const removeEntry = async (id: string) => {
        removeEntryFromStore(id)

        if (sessionType === 'authenticated' && userId) {
            await persistAuthHistory(userId)
        } else if (sessionType === 'guest' && guestId) {
            saveGuestSession(guestId)
        }
    }

    const clearHistory = async () => {
        clearHistoryInStore()

        if (sessionType === 'authenticated' && userId) {
            await persistAuthHistory(userId)
        } else if (sessionType === 'guest' && guestId) {
            clearGuestSession(guestId)
            useWatchHistoryStore.setState({
                currentSessionId: guestId,
                lastSyncedAt: null,
                syncError: null,
            })
        }
    }

    // Determine actual storage type based on sync status
    // - For authenticated users, only report "firestore" if we've successfully synced
    // - For guest users, always report "localStorage"
    const storageType =
        sessionType === 'authenticated' && lastSyncedAt !== null ? 'firestore' : 'localStorage'

    return {
        // Data
        history,
        isLoading,
        storageType,

        // Sync tracking (for authenticated users)
        lastSyncedAt,
        syncError,
        isSynced: sessionType === 'authenticated' && lastSyncedAt !== null && !syncError,

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

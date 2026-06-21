/**
 * Watch History Hook
 *
 * Manages watch history for both authenticated and guest users with proper
 * session isolation:
 * - Authenticated users: backed by /api/watch-history (Turso/libSQL)
 * - Guest users: localStorage with session-scoped keys
 *
 * The previous implementation used Firebase auth.onAuthStateChanged to wait
 * for the Firebase Auth SDK to be ready before loading. That Firebase dependency
 * has been replaced with the app's useAuth() hook (from hooks/useAuth.tsx)
 * which exposes the Auth.js session state via `user` and `loading`.
 */

import { useEffect, useRef } from 'react'
import { useWatchHistoryStore } from '../stores/watchHistoryStore'
import { useSessionStore } from '../stores/sessionStore'
import { authenticatedFetch } from '../lib/authenticatedFetch'
import useAuth from './useAuth'
import type { Content } from '../typings'
import type { WatchHistoryEntry } from '../types/watchHistory'
import { watchHistoryLog, watchHistoryError } from '../utils/debugLogger'

export function useWatchHistory() {
    const sessionType = useSessionStore((state) => state.sessionType)
    const getUserId = useSessionStore((state) => state.getUserId)
    const userId = getUserId()
    const activeSessionId = useSessionStore((state) => state.activeSessionId)
    // For guest sessions, activeSessionId is the guest ID
    const guestId = sessionType === 'guest' ? activeSessionId : null

    // Auth.js session — replaces the old Firebase auth.onAuthStateChanged listener.
    const { user: authUser, loading: authLoading } = useAuth()

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

        // Skip if no session ID yet, or if auth is still loading for an authenticated session.
        if (!currentSessionTypeId) return
        if (sessionType === 'authenticated' && authLoading) return

        const prevSession = prevSessionRef.current

        // Detect session type change or session ID change
        const sessionChanged =
            prevSession.type !== sessionType || prevSession.id !== currentSessionTypeId

        if (sessionChanged) {
            watchHistoryLog(
                `[Watch History] Session transition: ${prevSession.type}(${prevSession.id}) -> ${sessionType}(${currentSessionTypeId})`
            )

            if (sessionType === 'guest' || sessionType === 'authenticated') {
                switchSession(sessionType, currentSessionTypeId).catch((error) => {
                    watchHistoryError('[Watch History] Failed to switch session:', error)
                })
            }

            prevSessionRef.current = { type: sessionType, id: currentSessionTypeId }
        } else if (
            sessionType === 'authenticated' &&
            userId &&
            currentSessionId !== userId &&
            !authLoading &&
            authUser?.uid === userId
        ) {
            // Authenticated user with a valid session but store hasn't loaded their data yet.
            // The Auth.js session cookie is already present (no need to wait for Firebase SDK).
            watchHistoryLog('[Watch History] Loading authenticated user data from API')
            loadFromFirestore(userId).catch((error) => {
                watchHistoryError('[Watch History] Failed to load from API:', error)
            })
        }
    }, [
        sessionType,
        userId,
        guestId,
        currentSessionId,
        authLoading,
        authUser?.uid,
        switchSession,
        loadFromFirestore,
    ])

    /* ---------------------------------------------------------------------- */
    /*  Persistence helpers                                                    */
    /* ---------------------------------------------------------------------- */

    // Add watch entry with automatic persistence
    const addWatchEntry = async (
        contentId: number,
        mediaType: 'movie' | 'tv',
        content: Content
    ) => {
        // Add to local store first (for immediate UI update)
        addToStore(contentId, mediaType, content)

        // Persist based on session type
        if (sessionType === 'authenticated') {
            try {
                await authenticatedFetch('/api/watch-history', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contentId, mediaType, content }),
                })
                useWatchHistoryStore.setState({ lastSyncedAt: Date.now(), syncError: null })
            } catch (error) {
                watchHistoryError('[Watch History] Failed to persist entry to API:', error)
                useWatchHistoryStore.setState({
                    syncError:
                        error instanceof Error ? error.message : 'Failed to sync watch history',
                })
            }
        } else if (sessionType === 'guest' && guestId) {
            saveGuestSession(guestId)
        }
    }

    const removeEntry = async (id: string) => {
        removeEntryFromStore(id)

        if (sessionType === 'authenticated') {
            // The server DELETE /api/watch-history clears ALL history; individual
            // entry deletion is not exposed via the current API. Re-sync from server
            // to keep state consistent after optimistic removal.
            try {
                await loadFromFirestore(userId!)
            } catch (error) {
                watchHistoryError('[Watch History] Failed to re-sync after remove:', error)
            }
        } else if (sessionType === 'guest' && guestId) {
            saveGuestSession(guestId)
        }
    }

    const clearHistory = async () => {
        clearHistoryInStore()

        if (sessionType === 'authenticated' && userId) {
            try {
                await authenticatedFetch('/api/watch-history', { method: 'DELETE' })
                useWatchHistoryStore.setState({ lastSyncedAt: null, syncError: null })
            } catch (error) {
                watchHistoryError('[Watch History] Failed to clear history on API:', error)
                useWatchHistoryStore.setState({
                    syncError:
                        error instanceof Error ? error.message : 'Failed to clear watch history',
                })
            }
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
    const storageType =
        sessionType === 'authenticated' && lastSyncedAt !== null ? 'turso' : 'localStorage'

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

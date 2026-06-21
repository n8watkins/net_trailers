/**
 * Watch History Store
 *
 * Zustand store for tracking user watch history with proper session isolation:
 * - Guest users: localStorage with 'guest' prefix (unchanged)
 * - Authenticated users: backed by /api/watch-history (Turso/libSQL)
 *
 * Firebase/Firestore imports have been removed. Authenticated persistence now
 * goes through the REST API using the Auth.js session cookie.
 */

import { create } from 'zustand'
import type { WatchHistoryStore, WatchHistoryEntry } from '../types/watchHistory'
import type { Content } from '../typings'
import { authenticatedFetch } from '../lib/authenticatedFetch'
import { watchHistoryLog, watchHistoryError } from '../utils/debugLogger'

// Manual localStorage helpers for guest sessions only
// We don't use Zustand persist because it can't conditionally persist based on session type
const STORAGE_KEY_PREFIX = 'nettrailer-watch-history_guest_'

const loadGuestHistory = (guestId: string): WatchHistoryEntry[] => {
    try {
        const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}${guestId}`)
        if (stored) {
            const parsed = JSON.parse(stored)
            return parsed.history || []
        }
    } catch (error) {
        watchHistoryError('Failed to load guest watch history:', error)
    }
    return []
}

const saveGuestHistory = (guestId: string, history: WatchHistoryEntry[]) => {
    try {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}${guestId}`, JSON.stringify({ history }))
    } catch (error) {
        watchHistoryError('Failed to save guest watch history:', error)
    }
}

const clearGuestHistory = (guestId: string) => {
    try {
        localStorage.removeItem(`${STORAGE_KEY_PREFIX}${guestId}`)
    } catch (error) {
        watchHistoryError('Failed to clear guest watch history:', error)
    }
}

/* -------------------------------------------------------------------------- */
/*  API helpers                                                                */
/* -------------------------------------------------------------------------- */

async function apiLoadHistory(): Promise<WatchHistoryEntry[]> {
    const res = await authenticatedFetch('/api/watch-history', { method: 'GET' })
    if (!res.ok) throw new Error(`Failed to load watch history: ${res.status}`)
    const json = await res.json()
    return (json.history as WatchHistoryEntry[]) ?? []
}

async function apiAddEntry(
    contentId: number,
    mediaType: 'movie' | 'tv',
    content: Content
): Promise<WatchHistoryEntry> {
    const res = await authenticatedFetch('/api/watch-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentId, mediaType, content }),
    })
    if (!res.ok) throw new Error(`Failed to save watch entry: ${res.status}`)
    const json = await res.json()
    return json.entry as WatchHistoryEntry
}

async function apiClearHistory(): Promise<void> {
    const res = await authenticatedFetch('/api/watch-history', { method: 'DELETE' })
    if (!res.ok) throw new Error(`Failed to clear watch history: ${res.status}`)
}

/* -------------------------------------------------------------------------- */
/*  Store                                                                      */
/* -------------------------------------------------------------------------- */

export const useWatchHistoryStore = create<WatchHistoryStore>()((set, get) => ({
    history: [],
    isLoading: false,
    currentSessionId: null,
    lastSyncedAt: null,
    syncError: null,

    addWatchEntry: (contentId, mediaType, content) => {
        const now = Date.now()
        const existingEntry = get().history.find(
            (entry) => entry.contentId === contentId && entry.mediaType === mediaType
        )

        if (existingEntry) {
            // Update existing entry
            set((state) => ({
                history: state.history.map((entry) =>
                    entry.contentId === contentId && entry.mediaType === mediaType
                        ? {
                              ...entry,
                              watchedAt: now,
                              content, // Update content in case details changed
                          }
                        : entry
                ),
            }))
        } else {
            // Add new entry
            const newEntry: WatchHistoryEntry = {
                id: `${contentId}-${mediaType}-${now}`,
                contentId,
                mediaType,
                watchedAt: now,
                content,
            }

            set((state) => ({
                history: [newEntry, ...state.history],
            }))
        }
    },

    getWatchEntry: (contentId, mediaType) => {
        return get().history.find(
            (entry) => entry.contentId === contentId && entry.mediaType === mediaType
        )
    },

    getAllHistory: () => {
        return [...get().history].sort((a, b) => b.watchedAt - a.watchedAt)
    },

    getHistoryByDateRange: (startDate, endDate) => {
        return get()
            .history.filter((entry) => entry.watchedAt >= startDate && entry.watchedAt <= endDate)
            .sort((a, b) => b.watchedAt - a.watchedAt)
    },

    clearHistory: () => {
        set({ history: [], currentSessionId: null, lastSyncedAt: null, syncError: null })
    },

    clearHistoryWithPersistence: async (
        sessionType: 'guest' | 'authenticated',
        sessionId: string
    ) => {
        watchHistoryLog(
            '[Watch History Store] Clearing history with persistence for',
            sessionType,
            sessionId
        )

        try {
            // Clear local state first
            set({ history: [], lastSyncedAt: null, syncError: null })

            // Persist deletion based on session type
            if (sessionType === 'authenticated') {
                await apiClearHistory()
                watchHistoryLog('[Watch History Store] Deleted from Turso via API')
            } else {
                clearGuestHistory(sessionId)
                watchHistoryLog('[Watch History Store] Deleted from localStorage')
            }
        } catch (error) {
            watchHistoryError('[Watch History Store] Failed to clear history:', error)
            throw error
        }
    },

    removeEntry: (id) => {
        set((state) => ({
            history: state.history.filter((entry) => entry.id !== id),
        }))
    },

    setLoading: (loading) => {
        set({ isLoading: loading })
    },

    loadFromFirestore: async (userId: string) => {
        // Renamed semantically but kept signature stable for callers.
        // Now loads from /api/watch-history (Turso) instead of Firestore.
        if (!userId) return

        watchHistoryLog('[Watch History Store] Loading from API for user:', userId)

        try {
            set({ isLoading: true, syncError: null })

            const history = await apiLoadHistory()

            watchHistoryLog('[Watch History Store] Loaded from API:', history.length, 'entries')

            set({
                history,
                currentSessionId: userId,
                lastSyncedAt: Date.now(),
                syncError: null,
            })
        } catch (error) {
            watchHistoryError('[Watch History Store] Failed to load watch history from API:', error)
            set({
                syncError: error instanceof Error ? error.message : 'Failed to load watch history',
            })
        } finally {
            set({ isLoading: false })
        }
    },

    syncWithFirestore: async (userId) => {
        // Kept for interface compatibility. Pushes local history up to the API
        // (Turso) rather than Firestore.
        if (!userId) return

        try {
            set({ isLoading: true, syncError: null })

            // Re-load from server to ensure consistency.
            const history = await apiLoadHistory()

            set({
                history,
                currentSessionId: userId,
                lastSyncedAt: Date.now(),
                syncError: null,
            })
        } catch (error) {
            watchHistoryError('Failed to sync watch history with API:', error)
            set({
                syncError: error instanceof Error ? error.message : 'Failed to sync watch history',
            })
        } finally {
            set({ isLoading: false })
        }
    },

    migrateGuestToAuth: async (userId: string) => {
        if (!userId) return

        try {
            set({ isLoading: true, syncError: null })

            const guestHistory = get().history

            // Load any existing server history for this auth user.
            let authHistory: WatchHistoryEntry[] = []
            try {
                authHistory = await apiLoadHistory()
            } catch {
                // If load fails, proceed with guest history only.
            }

            // Merge: most recent watchedAt wins per (contentId, mediaType) pair.
            const historyMap = new Map<string, WatchHistoryEntry>()
            for (const entry of [...guestHistory, ...authHistory]) {
                const key = `${entry.contentId}-${entry.mediaType}`
                const existing = historyMap.get(key)
                if (!existing || entry.watchedAt > existing.watchedAt) {
                    historyMap.set(key, entry)
                }
            }
            const mergedHistory = Array.from(historyMap.values()).sort(
                (a, b) => b.watchedAt - a.watchedAt
            )

            // Optimistically set local state.
            set({
                history: mergedHistory,
                currentSessionId: userId,
                lastSyncedAt: Date.now(),
                syncError: null,
            })

            // Persist each merged entry to the API (best-effort, fire-and-forget is ok).
            for (const entry of mergedHistory) {
                apiAddEntry(entry.contentId, entry.mediaType, entry.content).catch(() => {})
            }

            // Clear guest localStorage.
            const guestId = localStorage.getItem('nettrailer_guest_id')
            if (guestId) {
                clearGuestHistory(guestId)
            }
        } catch (error) {
            watchHistoryError('Failed to migrate guest watch history:', error)
            set({
                syncError:
                    error instanceof Error ? error.message : 'Failed to migrate watch history',
            })
        } finally {
            set({ isLoading: false })
        }
    },

    switchSession: async (sessionType: 'guest' | 'authenticated', sessionId: string) => {
        // Clear current history when switching sessions
        set({
            history: [],
            currentSessionId: null,
            lastSyncedAt: null,
            syncError: null,
            isLoading: true,
        })

        try {
            if (sessionType === 'authenticated') {
                // Load from API (Turso) for authenticated users
                await get().loadFromFirestore(sessionId)
            } else {
                // Load guest data from localStorage manually
                get().loadGuestSession(sessionId)
            }
        } catch (error) {
            watchHistoryError('Failed to switch session:', error)
            set({
                isLoading: false,
                syncError: error instanceof Error ? error.message : 'Failed to switch session',
            })
        }
    },

    // Manual persistence methods for guest sessions
    loadGuestSession: (guestId: string) => {
        const history = loadGuestHistory(guestId)
        set({
            history,
            currentSessionId: guestId,
            isLoading: false,
            lastSyncedAt: null, // Guest sessions don't sync to server
            syncError: null,
        })
    },

    saveGuestSession: (guestId: string) => {
        const history = get().history
        saveGuestHistory(guestId, history)
    },

    clearGuestSession: (guestId: string) => {
        clearGuestHistory(guestId)
    },
}))

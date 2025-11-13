/**
 * Watch History Store
 *
 * Zustand store for tracking user watch history with proper session isolation:
 * - Guest users: localStorage with 'guest' prefix
 * - Authenticated users: Firestore-backed (no localStorage persistence for auth)
 */

import { create } from 'zustand'
import { WatchHistoryStore, WatchHistoryEntry } from '../types/watchHistory'
import { Content } from '../typings'
import { getWatchHistory, saveWatchHistory } from '../utils/firestore/watchHistory'
import { auth } from '../firebase'
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

const waitForAuthUser = async (userId: string, timeout = 5000): Promise<boolean> => {
    if (!userId) return false
    if (auth.currentUser && auth.currentUser.uid === userId) {
        return true
    }

    if (typeof window === 'undefined' || typeof auth.onAuthStateChanged !== 'function') {
        return false
    }

    return new Promise((resolve) => {
        let resolved = false
        let unsubscribe = () => {}

        const timer = setTimeout(() => {
            if (!resolved) {
                resolved = true
                unsubscribe()
                resolve(false)
            }
        }, timeout)

        unsubscribe = auth.onAuthStateChanged((user) => {
            if (!resolved && user && user.uid === userId) {
                resolved = true
                clearTimeout(timer)
                unsubscribe()
                resolve(true)
            }
        })
    })
}

export const useWatchHistoryStore = create<WatchHistoryStore>()((set, get) => ({
    history: [],
    isLoading: false,
    currentSessionId: null,
    lastSyncedAt: null,
    syncError: null,

    addWatchEntry: (contentId, mediaType, content, progress = 0, duration, watchedDuration) => {
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
                              progress,
                              duration,
                              watchedDuration,
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
                progress,
                duration,
                watchedDuration,
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

    removeEntry: (id) => {
        set((state) => ({
            history: state.history.filter((entry) => entry.id !== id),
        }))
    },

    setLoading: (loading) => {
        set({ isLoading: loading })
    },

    loadFromFirestore: async (userId: string) => {
        if (!userId) return

        watchHistoryLog('[Watch History Store] 🔍 Loading from Firestore for user:', userId)

        try {
            set({ isLoading: true, syncError: null })

            // Load history from Firestore
            const firestoreHistory = await getWatchHistory(userId)

            watchHistoryLog(
                '[Watch History Store] 📥 Loaded from Firestore:',
                firestoreHistory?.length || 0,
                'entries'
            )

            if (firestoreHistory && firestoreHistory.length > 0) {
                set({
                    history: firestoreHistory,
                    currentSessionId: userId,
                    lastSyncedAt: Date.now(),
                    syncError: null,
                })
                watchHistoryLog('[Watch History Store] ✅ Watch history loaded successfully')
            } else {
                // No history in Firestore yet
                set({
                    history: [],
                    currentSessionId: userId,
                    lastSyncedAt: Date.now(),
                    syncError: null,
                })
                watchHistoryLog('[Watch History Store] ⚠️ No watch history found in Firestore')
            }
        } catch (error) {
            watchHistoryError(
                '[Watch History Store] ❌ Failed to load watch history from Firestore:',
                error
            )
            set({
                syncError: error instanceof Error ? error.message : 'Failed to load watch history',
            })
        } finally {
            set({ isLoading: false })
        }
    },

    syncWithFirestore: async (userId) => {
        if (!userId) return
        const authReady = await waitForAuthUser(userId)
        if (!authReady) {
            set({
                syncError: 'Waiting for authentication...',
                isLoading: false,
            })
            return
        }

        try {
            set({ isLoading: true, syncError: null })

            const localHistory = get().history

            // Save current history to Firestore
            if (localHistory.length > 0) {
                await saveWatchHistory(userId, localHistory)
            }

            // Update session ID and sync timestamp
            set({
                currentSessionId: userId,
                lastSyncedAt: Date.now(),
                syncError: null,
            })
        } catch (error) {
            watchHistoryError('Failed to sync watch history with Firestore:', error)
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

            // Get existing auth history from Firestore
            const authHistory = await getWatchHistory(userId)

            // Merge guest and auth histories
            const mergedHistory = mergeHistories(guestHistory, authHistory || [])

            // Update store with merged history
            set({
                history: mergedHistory,
                currentSessionId: userId,
                lastSyncedAt: Date.now(),
                syncError: null,
            })

            // Save merged history to Firestore
            await saveWatchHistory(userId, mergedHistory)

            // Clear guest localStorage using the helper
            const guestId = localStorage.getItem('nettrailer_guest_id')
            if (guestId) {
                get().clearGuestSession(guestId)
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
                // Load from Firestore for authenticated users
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
            lastSyncedAt: null, // Guest sessions don't sync
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

// Helper function to merge guest and Firestore histories
function mergeHistories(
    guestHistory: WatchHistoryEntry[],
    authHistory: WatchHistoryEntry[]
): WatchHistoryEntry[] {
    const historyMap = new Map<string, WatchHistoryEntry>()

    // Add all entries from both sources
    const allEntries = [...guestHistory, ...authHistory]

    // Keep the most recent version of each content
    allEntries.forEach((entry) => {
        const key = `${entry.contentId}-${entry.mediaType}`
        const existing = historyMap.get(key)

        if (!existing || entry.watchedAt > existing.watchedAt) {
            historyMap.set(key, entry)
        }
    })

    // Convert back to array and sort by watch date
    return Array.from(historyMap.values()).sort((a, b) => b.watchedAt - a.watchedAt)
}

/**
 * Watch History Store
 *
 * Zustand store for tracking user watch history with proper session isolation:
 * - Guest users: localStorage with 'guest' prefix
 * - Authenticated users: Firestore-backed (no localStorage persistence for auth)
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { WatchHistoryStore, WatchHistoryEntry } from '../types/watchHistory'
import { Content } from '../typings'
import { getWatchHistory, saveWatchHistory } from '../utils/firestore/watchHistory'
import { auth } from '../firebase'

// Session-aware storage that only persists for guest sessions
const createSessionStorage = () => ({
    getItem: (name: string) => {
        // Only load from localStorage for guest sessions
        const sessionType = localStorage.getItem('nettrailer_session_type')
        if (sessionType === 'guest') {
            const guestId = localStorage.getItem('nettrailer_guest_id')
            if (guestId) {
                return localStorage.getItem(`${name}_guest_${guestId}`)
            }
        }
        return null
    },
    setItem: (name: string, value: string) => {
        // Only persist to localStorage for guest sessions
        const sessionType = localStorage.getItem('nettrailer_session_type')
        if (sessionType === 'guest') {
            const guestId = localStorage.getItem('nettrailer_guest_id')
            if (guestId) {
                localStorage.setItem(`${name}_guest_${guestId}`, value)
            }
        }
        // For authenticated users, don't persist to localStorage (Firestore only)
    },
    removeItem: (name: string) => {
        const sessionType = localStorage.getItem('nettrailer_session_type')
        if (sessionType === 'guest') {
            const guestId = localStorage.getItem('nettrailer_guest_id')
            if (guestId) {
                localStorage.removeItem(`${name}_guest_${guestId}`)
            }
        }
    },
})

export const useWatchHistoryStore = create<WatchHistoryStore>()(
    persist(
        (set, get) => ({
            history: [],
            isLoading: false,
            currentSessionId: null,

            addWatchEntry: (
                contentId,
                mediaType,
                content,
                progress = 0,
                duration,
                watchedDuration
            ) => {
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
                    .history.filter(
                        (entry) => entry.watchedAt >= startDate && entry.watchedAt <= endDate
                    )
                    .sort((a, b) => b.watchedAt - a.watchedAt)
            },

            clearHistory: () => {
                set({ history: [], currentSessionId: null })
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

                try {
                    set({ isLoading: true })

                    // Load history from Firestore
                    const firestoreHistory = await getWatchHistory(userId)

                    if (firestoreHistory && firestoreHistory.length > 0) {
                        set({
                            history: firestoreHistory,
                            currentSessionId: userId,
                        })
                    } else {
                        // No history in Firestore yet
                        set({
                            history: [],
                            currentSessionId: userId,
                        })
                    }
                } catch (error) {
                    console.error('Failed to load watch history from Firestore:', error)
                } finally {
                    set({ isLoading: false })
                }
            },

            syncWithFirestore: async (userId) => {
                if (!userId) return

                // CRITICAL: Ensure Firebase Auth is ready before attempting Firestore calls
                if (!auth.currentUser || auth.currentUser.uid !== userId) {
                    // Auth not ready yet - this will be called again by useWatchHistory
                    return
                }

                try {
                    set({ isLoading: true })

                    const localHistory = get().history

                    // Save current history to Firestore
                    if (localHistory.length > 0) {
                        await saveWatchHistory(userId, localHistory)
                    }

                    // Update session ID
                    set({ currentSessionId: userId })
                } catch (error) {
                    console.error('Failed to sync watch history with Firestore:', error)
                } finally {
                    set({ isLoading: false })
                }
            },

            migrateGuestToAuth: async (userId: string) => {
                if (!userId) return

                try {
                    set({ isLoading: true })

                    const guestHistory = get().history

                    // Get existing auth history from Firestore
                    const authHistory = await getWatchHistory(userId)

                    // Merge guest and auth histories
                    const mergedHistory = mergeHistories(guestHistory, authHistory || [])

                    // Update store with merged history
                    set({
                        history: mergedHistory,
                        currentSessionId: userId,
                    })

                    // Save merged history to Firestore
                    await saveWatchHistory(userId, mergedHistory)

                    // Clear guest localStorage
                    const guestId = localStorage.getItem('nettrailer_guest_id')
                    if (guestId) {
                        localStorage.removeItem(`nettrailer-watch-history_guest_${guestId}`)
                    }
                } catch (error) {
                    console.error('Failed to migrate guest watch history:', error)
                } finally {
                    set({ isLoading: false })
                }
            },

            switchSession: async (sessionType: 'guest' | 'authenticated', sessionId: string) => {
                // Clear current history when switching sessions
                set({ history: [], currentSessionId: null, isLoading: true })

                try {
                    if (sessionType === 'authenticated') {
                        // Load from Firestore for authenticated users
                        await get().loadFromFirestore(sessionId)
                    } else {
                        // For guest, history will be loaded from localStorage via persist middleware
                        set({ currentSessionId: sessionId, isLoading: false })
                    }
                } catch (error) {
                    console.error('Failed to switch session:', error)
                    set({ isLoading: false })
                }
            },
        }),
        {
            name: 'nettrailer-watch-history',
            storage: createJSONStorage(() => createSessionStorage()),
            partialize: (state) => ({
                // Only persist history for guest sessions (handled by storage layer)
                history: state.history,
            }),
        }
    )
)

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

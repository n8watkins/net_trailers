/**
 * Watch History Store
 *
 * Zustand store for tracking user watch history
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { WatchHistoryStore, WatchHistoryEntry, WatchHistoryDocument } from '../types/watchHistory'
import { Content } from '../typings'
import { getWatchHistory, saveWatchHistory } from '../utils/firestore/watchHistory'

export const useWatchHistoryStore = create<WatchHistoryStore>()(
    persist(
        (set, get) => ({
            history: [],
            isLoading: false,

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
                set({ history: [] })
            },

            removeEntry: (id) => {
                set((state) => ({
                    history: state.history.filter((entry) => entry.id !== id),
                }))
            },

            setLoading: (loading) => {
                set({ isLoading: loading })
            },

            syncWithFirestore: async (userId) => {
                if (!userId) return

                try {
                    set({ isLoading: true })

                    // First, get existing history from Firestore
                    const firestoreHistory = await getWatchHistory(userId)

                    if (firestoreHistory) {
                        // Merge with local history
                        const localHistory = get().history
                        const mergedHistory = mergeHistories(localHistory, firestoreHistory)

                        set({ history: mergedHistory })

                        // Save merged history back to Firestore
                        await saveWatchHistory(userId, mergedHistory)
                    } else {
                        // No history in Firestore, save local history
                        const localHistory = get().history
                        if (localHistory.length > 0) {
                            await saveWatchHistory(userId, localHistory)
                        }
                    }
                } catch (error) {
                    console.error('Failed to sync watch history with Firestore:', error)
                } finally {
                    set({ isLoading: false })
                }
            },
        }),
        {
            name: 'nettrailer-watch-history',
            partialize: (state) => ({
                history: state.history,
            }),
        }
    )
)

// Helper function to merge local and Firestore histories
function mergeHistories(
    localHistory: WatchHistoryEntry[],
    firestoreHistory: WatchHistoryEntry[]
): WatchHistoryEntry[] {
    const historyMap = new Map<string, WatchHistoryEntry>()

    // Add all entries from both sources
    const allEntries = [...localHistory, ...firestoreHistory]

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

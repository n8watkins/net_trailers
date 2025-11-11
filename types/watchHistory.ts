/**
 * Watch History Type Definitions
 *
 * Types for tracking user viewing history
 */

import { Content } from '../typings'

export interface WatchHistoryEntry {
    id: string // Unique ID for this watch entry
    contentId: number // TMDB content ID
    mediaType: 'movie' | 'tv'
    watchedAt: number // Timestamp when watched
    progress: number // Percentage watched (0-100)
    duration?: number // Total duration in seconds
    watchedDuration?: number // How much was watched in seconds
    content: Content // Full content object for easy access
}

export interface WatchHistoryState {
    history: WatchHistoryEntry[]
    isLoading: boolean
    currentSessionId: string | null // Track active session to prevent data mixing
    lastSyncedAt: number | null // Timestamp of last successful Firestore sync
    syncError: string | null // Last sync error message
}

export interface WatchHistoryActions {
    // Add or update watch history entry
    addWatchEntry: (
        contentId: number,
        mediaType: 'movie' | 'tv',
        content: Content,
        progress?: number,
        duration?: number,
        watchedDuration?: number
    ) => void

    // Get watch history for a specific content
    getWatchEntry: (contentId: number, mediaType: 'movie' | 'tv') => WatchHistoryEntry | undefined

    // Get all watch history sorted by date
    getAllHistory: () => WatchHistoryEntry[]

    // Get watch history filtered by date range
    getHistoryByDateRange: (startDate: number, endDate: number) => WatchHistoryEntry[]

    // Clear all watch history
    clearHistory: () => void

    // Remove specific entry
    removeEntry: (id: string) => void

    // Set loading state
    setLoading: (loading: boolean) => void

    // Load watch history from Firestore (authenticated users only)
    loadFromFirestore: (userId: string) => Promise<void>

    // Sync local history with Firestore (for authenticated users)
    syncWithFirestore: (userId: string) => Promise<void>

    // Migrate guest history to authenticated user account
    migrateGuestToAuth: (userId: string) => Promise<void>

    // Switch between sessions (guest <-> auth or between different users)
    switchSession: (sessionType: 'guest' | 'authenticated', sessionId: string) => Promise<void>

    // Manual persistence for guest sessions (no Zustand persist middleware)
    loadGuestSession: (guestId: string) => void
    saveGuestSession: (guestId: string) => void
    clearGuestSession: (guestId: string) => void
}

export type WatchHistoryStore = WatchHistoryState & WatchHistoryActions

// Firestore document structure
export interface WatchHistoryDocument {
    history: WatchHistoryEntry[]
    updatedAt: number
}

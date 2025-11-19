import { create } from 'zustand'
import { CustomRow, DisplayRow, SystemRowPreferences } from '../types/customRows'
import { ALL_SYSTEM_ROWS } from '../constants/systemRows'

/**
 * Custom Rows Store State
 *
 * Manages client-side state for custom rows feature.
 * Handles both system/default rows and user-created custom rows.
 */
export interface CustomRowsState {
    // Cached custom rows by userId
    customRowsByUser: Map<string, CustomRow[]>

    // System row preferences by userId (which system rows are enabled)
    systemRowPreferences: Map<string, SystemRowPreferences>

    // Deleted system row IDs by userId
    deletedSystemRows: Map<string, string[]>

    // Track last access time for memory cleanup
    lastAccessTime: Map<string, number>

    // Loading states
    isLoading: boolean
    isCreating: boolean
    isUpdating: boolean
    isDeleting: boolean

    // Error state
    error: string | null

    // Selected row for editing (only custom rows)
    selectedRow: CustomRow | null
}

/**
 * Custom Rows Store Actions
 */
export interface CustomRowsActions {
    // Custom row data management
    setRows: (userId: string, rows: CustomRow[]) => void
    addRow: (userId: string, row: CustomRow) => void
    updateRow: (userId: string, rowId: string, updates: Partial<CustomRow>) => void
    removeRow: (userId: string, rowId: string) => void
    clearUserRows: (userId: string) => void

    // System row preferences
    setSystemRowPreferences: (userId: string, preferences: SystemRowPreferences) => void
    toggleSystemRow: (userId: string, systemRowId: string) => void
    updateSystemRowOrder: (userId: string, systemRowId: string, order: number) => void
    setDeletedSystemRows: (userId: string, deletedRowIds: string[]) => void
    deleteSystemRow: (userId: string, systemRowId: string) => void

    // Loading states
    setLoading: (loading: boolean) => void
    setCreating: (creating: boolean) => void
    setUpdating: (updating: boolean) => void
    setDeleting: (deleting: boolean) => void

    // Error handling
    setError: (error: string | null) => void

    // Selection
    setSelectedRow: (row: CustomRow | null) => void

    // Memory cleanup
    cleanupInactiveUsers: () => void

    // Helpers
    getRows: (userId: string) => CustomRow[]
    getRow: (userId: string, rowId: string) => CustomRow | null
    getEnabledRowsForPage: (userId: string, page: 'main' | 'movies' | 'tvShows') => CustomRow[]
    getAllDisplayRows: (userId: string) => DisplayRow[] // Combines system + custom
    getDisplayRowsByMediaType: (userId: string, mediaType: 'movie' | 'tv' | 'both') => DisplayRow[] // Filter by media type
    getDisplayRowsForPage: (userId: string, page: 'home' | 'movies' | 'tv') => DisplayRow[] // Get rows for specific page
}

export type CustomRowsStore = CustomRowsState & CustomRowsActions

/**
 * Custom Rows Zustand Store
 *
 * Usage:
 * ```tsx
 * // Get all rows for current user
 * const getUserId = useSessionStore(state => state.getUserId)
 * const getRows = useCustomRowsStore(state => state.getRows)
 * const userId = getUserId()
 * const rows = userId ? getRows(userId) : []
 *
 * // Add a new row
 * const addRow = useCustomRowsStore(state => state.addRow)
 * addRow(userId, newRow)
 *
 * // Update a row
 * const updateRow = useCustomRowsStore(state => state.updateRow)
 * updateRow(userId, rowId, { enabled: false })
 * ```
 */
// Cleanup interval: 30 minutes
const CLEANUP_INTERVAL_MS = 30 * 60 * 1000
// Consider user inactive after 1 hour
const INACTIVE_USER_THRESHOLD_MS = 60 * 60 * 1000

export const useCustomRowsStore = create<CustomRowsStore>((set, get) => ({
    // Initial state
    customRowsByUser: new Map<string, CustomRow[]>(),
    systemRowPreferences: new Map<string, SystemRowPreferences>(),
    deletedSystemRows: new Map<string, string[]>(),
    lastAccessTime: new Map<string, number>(),
    isLoading: false,
    isCreating: false,
    isUpdating: false,
    isDeleting: false,
    error: null,
    selectedRow: null,

    // Actions

    /**
     * Set all custom rows for a user (replaces existing)
     */
    setRows: (userId: string, rows: CustomRow[]) => {
        set((state) => {
            const newRowsByUser = new Map(state.customRowsByUser)
            const newLastAccessTime = new Map(state.lastAccessTime)
            newRowsByUser.set(userId, rows)
            newLastAccessTime.set(userId, Date.now())
            return { customRowsByUser: newRowsByUser, lastAccessTime: newLastAccessTime }
        })
    },

    /**
     * Add a new custom row for a user
     */
    addRow: (userId: string, row: CustomRow) => {
        set((state) => {
            const newRowsByUser = new Map(state.customRowsByUser)
            const existingRows = newRowsByUser.get(userId) || []
            newRowsByUser.set(userId, [...existingRows, row])
            return { customRowsByUser: newRowsByUser }
        })
    },

    /**
     * Update a custom row for a user
     */
    updateRow: (userId: string, rowId: string, updates: Partial<CustomRow>) => {
        set((state) => {
            const newRowsByUser = new Map(state.customRowsByUser)
            const existingRows = newRowsByUser.get(userId) || []
            const updatedRows = existingRows.map((row) =>
                row.id === rowId ? { ...row, ...updates, updatedAt: Date.now() } : row
            )
            newRowsByUser.set(userId, updatedRows)
            return { customRowsByUser: newRowsByUser }
        })
    },

    /**
     * Remove a custom row for a user
     */
    removeRow: (userId: string, rowId: string) => {
        set((state) => {
            const newRowsByUser = new Map(state.customRowsByUser)
            const existingRows = newRowsByUser.get(userId) || []
            const filteredRows = existingRows.filter((row) => row.id !== rowId)
            newRowsByUser.set(userId, filteredRows)
            return { customRowsByUser: newRowsByUser }
        })
    },

    /**
     * Clear all custom rows for a user
     */
    clearUserRows: (userId: string) => {
        set((state) => {
            const newRowsByUser = new Map(state.customRowsByUser)
            const newSystemPrefs = new Map(state.systemRowPreferences)
            const newDeletedRows = new Map(state.deletedSystemRows)
            newRowsByUser.delete(userId)
            newSystemPrefs.delete(userId)
            newDeletedRows.delete(userId)
            return {
                customRowsByUser: newRowsByUser,
                systemRowPreferences: newSystemPrefs,
                deletedSystemRows: newDeletedRows,
            }
        })
    },

    /**
     * Set system row preferences for a user
     */
    setSystemRowPreferences: (userId: string, preferences: SystemRowPreferences) => {
        set((state) => {
            const newPreferences = new Map(state.systemRowPreferences)
            const newLastAccessTime = new Map(state.lastAccessTime)
            newPreferences.set(userId, preferences)
            newLastAccessTime.set(userId, Date.now())
            return { systemRowPreferences: newPreferences, lastAccessTime: newLastAccessTime }
        })
    },

    /**
     * Toggle a system row's enabled state
     */
    toggleSystemRow: (userId: string, systemRowId: string) => {
        set((state) => {
            const newPreferences = new Map(state.systemRowPreferences)
            const currentPrefs = newPreferences.get(userId) || {}
            const currentPref = currentPrefs[systemRowId]
            const currentEnabled = currentPref?.enabled ?? true // Default enabled
            const currentOrder = currentPref?.order ?? 0

            newPreferences.set(userId, {
                ...currentPrefs,
                [systemRowId]: {
                    enabled: !currentEnabled,
                    order: currentOrder,
                },
            })
            return { systemRowPreferences: newPreferences }
        })
    },

    /**
     * Update system row order
     */
    updateSystemRowOrder: (userId: string, systemRowId: string, order: number) => {
        set((state) => {
            const newPreferences = new Map(state.systemRowPreferences)
            const currentPrefs = newPreferences.get(userId) || {}
            const currentPref = currentPrefs[systemRowId]
            const currentEnabled = currentPref?.enabled ?? true

            newPreferences.set(userId, {
                ...currentPrefs,
                [systemRowId]: {
                    enabled: currentEnabled,
                    order,
                },
            })
            return { systemRowPreferences: newPreferences }
        })
    },

    /**
     * Set deleted system rows for a user
     */
    setDeletedSystemRows: (userId: string, deletedRowIds: string[]) => {
        set((state) => {
            const newDeletedRows = new Map(state.deletedSystemRows)
            const newLastAccessTime = new Map(state.lastAccessTime)
            newDeletedRows.set(userId, deletedRowIds)
            newLastAccessTime.set(userId, Date.now())
            return { deletedSystemRows: newDeletedRows, lastAccessTime: newLastAccessTime }
        })
    },

    /**
     * Delete a system row (mark as deleted)
     */
    deleteSystemRow: (userId: string, systemRowId: string) => {
        set((state) => {
            const newDeletedRows = new Map(state.deletedSystemRows)
            const currentDeleted = newDeletedRows.get(userId) || []
            if (!currentDeleted.includes(systemRowId)) {
                newDeletedRows.set(userId, [...currentDeleted, systemRowId])
            }
            return { deletedSystemRows: newDeletedRows }
        })
    },

    // Loading states
    setLoading: (loading: boolean) => set({ isLoading: loading }),
    setCreating: (creating: boolean) => set({ isCreating: creating }),
    setUpdating: (updating: boolean) => set({ isUpdating: updating }),
    setDeleting: (deleting: boolean) => set({ isDeleting: deleting }),

    // Error handling
    setError: (error: string | null) => set({ error }),

    // Selection
    setSelectedRow: (row: CustomRow | null) => set({ selectedRow: row }),

    // Helpers

    /**
     * Clean up inactive users from memory
     * Removes data for users who haven't been accessed in over 1 hour
     */
    cleanupInactiveUsers: () => {
        set((state) => {
            const now = Date.now()
            const newCustomRowsByUser = new Map(state.customRowsByUser)
            const newSystemRowPreferences = new Map(state.systemRowPreferences)
            const newDeletedSystemRows = new Map(state.deletedSystemRows)
            const newLastAccessTime = new Map(state.lastAccessTime)

            // Find and remove inactive users
            const entries = Array.from(state.lastAccessTime.entries())
            for (const [userId, lastAccess] of entries) {
                if (now - lastAccess > INACTIVE_USER_THRESHOLD_MS) {
                    newCustomRowsByUser.delete(userId)
                    newSystemRowPreferences.delete(userId)
                    newDeletedSystemRows.delete(userId)
                    newLastAccessTime.delete(userId)
                    console.log(`[CustomRowsStore] Cleaned up inactive user: ${userId}`)
                }
            }

            return {
                customRowsByUser: newCustomRowsByUser,
                systemRowPreferences: newSystemRowPreferences,
                deletedSystemRows: newDeletedSystemRows,
                lastAccessTime: newLastAccessTime,
            }
        })
    },

    /**
     * Get all custom rows for a user
     */
    getRows: (userId: string) => {
        const state = get()
        return state.customRowsByUser.get(userId) || []
    },

    /**
     * Get a specific custom row by ID
     */
    getRow: (userId: string, rowId: string) => {
        const state = get()
        const rows = state.customRowsByUser.get(userId) || []
        return rows.find((row) => row.id === rowId) || null
    },

    /**
     * Get enabled custom rows for a specific page
     */
    getEnabledRowsForPage: (userId: string, page: 'main' | 'movies' | 'tvShows') => {
        const state = get()
        const allRows = state.customRowsByUser.get(userId) || []

        return allRows.filter((row) => {
            if (!row.enabled) return false

            switch (page) {
                case 'main':
                    return row.mediaType === 'both'
                case 'movies':
                    return row.mediaType === 'movie'
                case 'tvShows':
                    return row.mediaType === 'tv'
                default:
                    return false
            }
        })
    },

    /**
     * Get all display rows (system + custom) for a user
     * Merges system rows with user's custom rows and applies enabled states and custom orders
     * Filters out deleted system rows
     */
    getAllDisplayRows: (userId: string): DisplayRow[] => {
        const state = get()
        const customRows = state.customRowsByUser.get(userId) || []
        const systemPrefs = state.systemRowPreferences.get(userId) || {}
        const deletedRowIds = state.deletedSystemRows.get(userId) || []

        // Convert system rows to DisplayRow format, filtering out deleted ones
        const systemDisplayRows: DisplayRow[] = ALL_SYSTEM_ROWS.filter(
            (systemRow) => !deletedRowIds.includes(systemRow.id)
        ).map((systemRow) => {
            const pref = systemPrefs[systemRow.id]
            return {
                ...systemRow,
                name: pref?.customName || systemRow.name, // Use custom name if set
                genres: pref?.customGenres || systemRow.genres, // Use custom genres if set
                genreLogic: pref?.customGenreLogic || systemRow.genreLogic, // Use custom genre logic if set
                isSystemRow: true,
                enabled: pref?.enabled ?? true, // Default enabled
                order: pref?.order ?? systemRow.order, // Use custom order if set, else default
            }
        })

        // Convert custom rows to DisplayRow format
        const customDisplayRows: DisplayRow[] = customRows.map((customRow) => ({
            ...customRow,
            isSystemRow: false,
        }))

        // Combine and sort by order
        return [...systemDisplayRows, ...customDisplayRows].sort((a, b) => a.order - b.order)
    },

    /**
     * Get display rows filtered by media type
     */
    getDisplayRowsByMediaType: (
        userId: string,
        mediaType: 'movie' | 'tv' | 'both'
    ): DisplayRow[] => {
        const allRows = get().getAllDisplayRows(userId)
        return allRows.filter((row) => row.mediaType === mediaType)
    },

    /**
     * Get display rows for a specific page (includes 'both' rows for movies/tv pages)
     */
    getDisplayRowsForPage: (userId: string, page: 'home' | 'movies' | 'tv'): DisplayRow[] => {
        const allRows = get().getAllDisplayRows(userId)

        if (page === 'home') {
            return allRows.filter((row) => row.mediaType === 'both')
        } else if (page === 'movies') {
            return allRows.filter((row) => row.mediaType === 'movie')
        } else {
            // tv page
            return allRows.filter((row) => row.mediaType === 'tv')
        }
    },
}))

// Set up periodic cleanup of inactive users
// Run every 30 minutes in browser environment
if (typeof window !== 'undefined') {
    setInterval(() => {
        useCustomRowsStore.getState().cleanupInactiveUsers()
    }, CLEANUP_INTERVAL_MS)
}

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

    // Loading states
    setLoading: (loading: boolean) => void
    setCreating: (creating: boolean) => void
    setUpdating: (updating: boolean) => void
    setDeleting: (deleting: boolean) => void

    // Error handling
    setError: (error: string | null) => void

    // Selection
    setSelectedRow: (row: CustomRow | null) => void

    // Helpers
    getRows: (userId: string) => CustomRow[]
    getRow: (userId: string, rowId: string) => CustomRow | null
    getEnabledRowsForPage: (userId: string, page: 'main' | 'movies' | 'tvShows') => CustomRow[]
    getAllDisplayRows: (userId: string) => DisplayRow[] // Combines system + custom
    getDisplayRowsByMediaType: (userId: string, mediaType: 'movie' | 'tv' | 'both') => DisplayRow[] // Filter by media type
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
export const useCustomRowsStore = create<CustomRowsStore>((set, get) => ({
    // Initial state
    customRowsByUser: new Map<string, CustomRow[]>(),
    systemRowPreferences: new Map<string, SystemRowPreferences>(),
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
            newRowsByUser.set(userId, rows)
            return { customRowsByUser: newRowsByUser }
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
            newRowsByUser.delete(userId)
            newSystemPrefs.delete(userId)
            return {
                customRowsByUser: newRowsByUser,
                systemRowPreferences: newSystemPrefs,
            }
        })
    },

    /**
     * Set system row preferences for a user
     */
    setSystemRowPreferences: (userId: string, preferences: SystemRowPreferences) => {
        set((state) => {
            const newPreferences = new Map(state.systemRowPreferences)
            newPreferences.set(userId, preferences)
            return { systemRowPreferences: newPreferences }
        })
    },

    /**
     * Toggle a system row's enabled state
     */
    toggleSystemRow: (userId: string, systemRowId: string) => {
        set((state) => {
            const newPreferences = new Map(state.systemRowPreferences)
            const currentPrefs = newPreferences.get(userId) || {}
            const currentState = currentPrefs[systemRowId] ?? true // Default enabled
            newPreferences.set(userId, {
                ...currentPrefs,
                [systemRowId]: !currentState,
            })
            return { systemRowPreferences: newPreferences }
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
     * Merges system rows with user's custom rows and applies enabled states
     */
    getAllDisplayRows: (userId: string): DisplayRow[] => {
        const state = get()
        const customRows = state.customRowsByUser.get(userId) || []
        const systemPrefs = state.systemRowPreferences.get(userId) || {}

        // Convert system rows to DisplayRow format
        const systemDisplayRows: DisplayRow[] = ALL_SYSTEM_ROWS.map((systemRow) => ({
            ...systemRow,
            isSystemRow: true,
            enabled: systemPrefs[systemRow.id] ?? true, // Default enabled
        }))

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
}))

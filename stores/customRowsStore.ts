import { create } from 'zustand'
import { CustomRow } from '../types/customRows'

/**
 * Custom Rows Store State
 *
 * Manages client-side state for custom rows feature.
 * Data fetching is handled by API routes, this store provides
 * a reactive cache layer for UI components.
 */
export interface CustomRowsState {
    // Cached rows by userId
    rowsByUser: Map<string, CustomRow[]>

    // Loading states
    isLoading: boolean
    isCreating: boolean
    isUpdating: boolean
    isDeleting: boolean

    // Error state
    error: string | null

    // Selected row for editing
    selectedRow: CustomRow | null
}

/**
 * Custom Rows Store Actions
 */
export interface CustomRowsActions {
    // Data management
    setRows: (userId: string, rows: CustomRow[]) => void
    addRow: (userId: string, row: CustomRow) => void
    updateRow: (userId: string, rowId: string, updates: Partial<CustomRow>) => void
    removeRow: (userId: string, rowId: string) => void
    clearUserRows: (userId: string) => void

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
    rowsByUser: new Map<string, CustomRow[]>(),
    isLoading: false,
    isCreating: false,
    isUpdating: false,
    isDeleting: false,
    error: null,
    selectedRow: null,

    // Actions

    /**
     * Set all rows for a user (replaces existing)
     */
    setRows: (userId: string, rows: CustomRow[]) => {
        set((state) => {
            const newRowsByUser = new Map(state.rowsByUser)
            newRowsByUser.set(userId, rows)
            return { rowsByUser: newRowsByUser }
        })
    },

    /**
     * Add a new row for a user
     */
    addRow: (userId: string, row: CustomRow) => {
        set((state) => {
            const newRowsByUser = new Map(state.rowsByUser)
            const existingRows = newRowsByUser.get(userId) || []
            newRowsByUser.set(userId, [...existingRows, row])
            return { rowsByUser: newRowsByUser }
        })
    },

    /**
     * Update a row for a user
     */
    updateRow: (userId: string, rowId: string, updates: Partial<CustomRow>) => {
        set((state) => {
            const newRowsByUser = new Map(state.rowsByUser)
            const existingRows = newRowsByUser.get(userId) || []
            const updatedRows = existingRows.map((row) =>
                row.id === rowId ? { ...row, ...updates, updatedAt: Date.now() } : row
            )
            newRowsByUser.set(userId, updatedRows)
            return { rowsByUser: newRowsByUser }
        })
    },

    /**
     * Remove a row for a user
     */
    removeRow: (userId: string, rowId: string) => {
        set((state) => {
            const newRowsByUser = new Map(state.rowsByUser)
            const existingRows = newRowsByUser.get(userId) || []
            const filteredRows = existingRows.filter((row) => row.id !== rowId)
            newRowsByUser.set(userId, filteredRows)
            return { rowsByUser: newRowsByUser }
        })
    },

    /**
     * Clear all rows for a user
     */
    clearUserRows: (userId: string) => {
        set((state) => {
            const newRowsByUser = new Map(state.rowsByUser)
            newRowsByUser.delete(userId)
            return { rowsByUser: newRowsByUser }
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
     * Get all rows for a user
     */
    getRows: (userId: string) => {
        const state = get()
        return state.rowsByUser.get(userId) || []
    },

    /**
     * Get a specific row by ID
     */
    getRow: (userId: string, rowId: string) => {
        const state = get()
        const rows = state.rowsByUser.get(userId) || []
        return rows.find((row) => row.id === rowId) || null
    },

    /**
     * Get enabled rows for a specific page
     */
    getEnabledRowsForPage: (userId: string, page: 'main' | 'movies' | 'tvShows') => {
        const state = get()
        const allRows = state.rowsByUser.get(userId) || []

        return allRows.filter((row) => {
            if (!row.enabled) return false

            switch (page) {
                case 'main':
                    return row.displayOn.main
                case 'movies':
                    return row.displayOn.movies
                case 'tvShows':
                    return row.displayOn.tvShows
                default:
                    return false
            }
        })
    },
}))

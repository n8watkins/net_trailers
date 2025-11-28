import { create } from 'zustand'
import { startTransition } from 'react'

/**
 * Debug Operations Store
 *
 * Centralized state management for debug operations (seeding, clearing data)
 * Ensures mutual exclusion - can't seed while clearing or clear while seeding
 */

// Store state interface
export interface DebugOperationsState {
    isSeeding: boolean
    isClearing: boolean
}

// Store actions interface
export interface DebugOperationsActions {
    setSeeding: (seeding: boolean) => void
    setClearing: (clearing: boolean) => void
    canStartSeeding: () => boolean
    canStartClearing: () => boolean
}

export type DebugOperationsStore = DebugOperationsState & DebugOperationsActions

export const useDebugOperationsStore = create<DebugOperationsStore>((set, get) => ({
    // Initial state
    isSeeding: false,
    isClearing: false,

    /**
     * Set seeding state
     *
     * @param seeding - Whether seeding is in progress
     *
     * @example
     * ```tsx
     * const { setSeeding } = useDebugOperationsStore()
     * setSeeding(true)
     * // ... perform seeding
     * setSeeding(false)
     * ```
     */
    setSeeding: (seeding: boolean) => {
        startTransition(() => {
            set({ isSeeding: seeding })
        })
    },

    /**
     * Set clearing state
     *
     * @param clearing - Whether clearing is in progress
     *
     * @example
     * ```tsx
     * const { setClearing } = useDebugOperationsStore()
     * setClearing(true)
     * // ... perform clearing
     * setClearing(false)
     * ```
     */
    setClearing: (clearing: boolean) => {
        startTransition(() => {
            set({ isClearing: clearing })
        })
    },

    /**
     * Check if seeding can be started
     * Returns false if clearing is in progress
     *
     * @returns true if seeding can start, false otherwise
     */
    canStartSeeding: () => {
        const state = get()
        return !state.isClearing && !state.isSeeding
    },

    /**
     * Check if clearing can be started
     * Returns false if seeding is in progress
     *
     * @returns true if clearing can start, false otherwise
     */
    canStartClearing: () => {
        const state = get()
        return !state.isSeeding && !state.isClearing
    },
}))

import { create } from 'zustand'
import { startTransition } from 'react'

// Loading store state interface
export interface LoadingStoreState {
    isLoading: boolean
    loadingMessage?: string
}

// Loading store actions interface
export interface LoadingStoreActions {
    setLoading: (loading: boolean, message?: string) => void
}

export type LoadingStore = LoadingStoreState & LoadingStoreActions

export const useLoadingStore = create<LoadingStore>((set) => ({
    // Initial state
    isLoading: false,
    loadingMessage: undefined,

    /**
     * Set global loading state
     *
     * @param loading - Whether app is loading
     * @param message - Optional loading message to display
     *
     * @example
     * ```tsx
     * const { setLoading } = useLoadingStore()
     *
     * // Show loading
     * setLoading(true, 'Fetching content...')
     *
     * // Hide loading
     * setLoading(false)
     * ```
     */
    setLoading: (loading: boolean, message?: string) => {
        startTransition(() => {
            set({
                isLoading: loading,
                loadingMessage: message,
            })
        })
    },
}))

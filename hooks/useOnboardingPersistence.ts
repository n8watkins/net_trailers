import { useEffect, useRef } from 'react'
import { useOnboardingStore } from '../stores/onboardingStore'
import { saveOnboardingState, loadOnboardingState } from '../utils/onboardingStorage'

// Debounce delay for localStorage writes (in milliseconds)
const SAVE_DEBOUNCE_DELAY = 500

/**
 * Hook to handle automatic persistence of onboarding state
 * Call this once in your app root to enable auto-save
 *
 * Features:
 * - Loads initial state from localStorage on mount
 * - Debounces saves to prevent excessive writes
 * - Cleans up pending saves on unmount
 */
export const useOnboardingPersistence = () => {
    const store = useOnboardingStore()
    const saveTimeoutRef = useRef<NodeJS.Timeout>()

    // Load initial state on mount
    useEffect(() => {
        const savedState = loadOnboardingState()
        if (savedState) {
            store.loadOnboardingState(savedState)
        }
    }, []) // Only run on mount - intentionally empty deps array

    // Debounced auto-save on state changes
    useEffect(() => {
        // Don't save if state hasn't been initialized yet
        if (store.lastUpdated === null) return

        // Clear previous timeout
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current)
        }

        // Debounce saves by SAVE_DEBOUNCE_DELAY ms
        saveTimeoutRef.current = setTimeout(() => {
            const {
                hasSeenWelcomeScreen,
                hasCompletedTour,
                hasSkippedTour,
                currentTourStep,
                tooltipsShown,
                achievements,
                lastUpdated,
            } = store

            saveOnboardingState({
                hasSeenWelcomeScreen,
                hasCompletedTour,
                hasSkippedTour,
                currentTourStep,
                tooltipsShown,
                achievements,
                lastUpdated,
            })
        }, SAVE_DEBOUNCE_DELAY)

        // Cleanup timeout on unmount or before next save
        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current)
            }
        }
    }, [
        store.hasSeenWelcomeScreen,
        store.hasCompletedTour,
        store.hasSkippedTour,
        store.currentTourStep,
        store.tooltipsShown,
        store.achievements,
        store.lastUpdated,
        store,
    ])
}

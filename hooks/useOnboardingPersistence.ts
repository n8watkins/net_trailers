import { useEffect } from 'react'
import { useOnboardingStore } from '../stores/onboardingStore'
import { saveOnboardingState, loadOnboardingState } from '../utils/onboardingStorage'

/**
 * Hook to handle automatic persistence of onboarding state
 * Call this once in your app root to enable auto-save
 */
export const useOnboardingPersistence = () => {
    const store = useOnboardingStore()

    // Load initial state on mount
    useEffect(() => {
        const savedState = loadOnboardingState()
        if (savedState) {
            store.loadOnboardingState(savedState)
        }
    }, []) // Only run on mount

    // Auto-save on state changes
    useEffect(() => {
        const {
            hasSeenWelcomeScreen,
            hasCompletedTour,
            hasSkippedTour,
            currentTourStep,
            tooltipsShown,
            achievements,
            lastUpdated,
        } = store

        // Only save if there's been an update
        if (lastUpdated !== null) {
            saveOnboardingState({
                hasSeenWelcomeScreen,
                hasCompletedTour,
                hasSkippedTour,
                currentTourStep,
                tooltipsShown,
                achievements,
                lastUpdated,
            })
        }
    }, [
        store.hasSeenWelcomeScreen,
        store.hasCompletedTour,
        store.hasSkippedTour,
        store.currentTourStep,
        store.tooltipsShown,
        store.achievements,
        store.lastUpdated,
    ])
}

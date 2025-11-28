import { OnboardingStoreState } from '../stores/onboardingStore'

const ONBOARDING_KEY = 'net_trailer_onboarding'

/**
 * Load onboarding state from localStorage
 * Returns null if no saved state exists or if data is corrupted
 */
export const loadOnboardingState = (): Partial<OnboardingStoreState> | null => {
    if (typeof window === 'undefined') {
        return null
    }

    try {
        const stored = localStorage.getItem(ONBOARDING_KEY)
        if (!stored) {
            return null
        }

        const data: Partial<OnboardingStoreState> = JSON.parse(stored)

        // Validate data structure
        if (typeof data !== 'object' || data === null) {
            console.warn('[Onboarding] Invalid state format, clearing corrupted data')
            clearOnboardingState()
            return null
        }

        return data
    } catch (error) {
        console.error('[Onboarding] Error loading state:', error)
        // Clear corrupted data to prevent repeated errors
        clearOnboardingState()
        return null
    }
}

/**
 * Save onboarding state to localStorage
 * Handles QuotaExceededError gracefully
 */
export const saveOnboardingState = (state: Partial<OnboardingStoreState>): void => {
    if (typeof window === 'undefined') return

    try {
        localStorage.setItem(ONBOARDING_KEY, JSON.stringify(state))
    } catch (error) {
        if (error instanceof DOMException && error.name === 'QuotaExceededError') {
            console.warn(
                '[Onboarding] LocalStorage quota exceeded. Onboarding progress may not persist. Consider clearing browser data.'
            )
            // Optionally: Try to free up space by clearing old data
            // For now, just log the warning - user's onboarding will still work in-memory
        } else {
            console.error('[Onboarding] Error saving state:', error)
        }
    }
}

/**
 * Clear onboarding state from localStorage
 */
export const clearOnboardingState = (): void => {
    if (typeof window === 'undefined') return

    try {
        localStorage.removeItem(ONBOARDING_KEY)
    } catch (error) {
        console.error('Error clearing onboarding state:', error)
    }
}

/**
 * Check if user should see welcome screen
 * Returns true if user hasn't seen the welcome screen yet
 */
export const shouldShowWelcomeScreen = (): boolean => {
    if (typeof window === 'undefined') {
        return false
    }

    const state = loadOnboardingState()
    return !state?.hasSeenWelcomeScreen
}

/**
 * Check if user should see interactive tour
 * Returns true if user hasn't completed or skipped the tour
 */
export const shouldShowTour = (): boolean => {
    if (typeof window === 'undefined') {
        return false
    }

    const state = loadOnboardingState()
    return !state?.hasCompletedTour && !state?.hasSkippedTour
}

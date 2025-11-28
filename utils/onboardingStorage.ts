import { OnboardingStoreState } from '../stores/onboardingStore'

const ONBOARDING_KEY = 'net_trailer_onboarding'

/**
 * Load onboarding state from localStorage
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
        return data
    } catch (error) {
        console.error('Error loading onboarding state:', error)
        return null
    }
}

/**
 * Save onboarding state to localStorage
 */
export const saveOnboardingState = (state: Partial<OnboardingStoreState>): void => {
    if (typeof window === 'undefined') return

    try {
        localStorage.setItem(ONBOARDING_KEY, JSON.stringify(state))
    } catch (error) {
        console.error('Error saving onboarding state:', error)
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

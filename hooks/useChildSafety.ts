/**
 * Hook for accessing Child Safety Mode preference
 * Provides easy access to the user's childSafetyMode setting
 */

import useUserData from './useUserData'

export interface UseChildSafetyReturn {
    /** Whether Child Safety Mode is currently enabled */
    isEnabled: boolean
    /** Whether the data is still loading */
    isLoading: boolean
}

/**
 * Hook to access Child Safety Mode preference
 *
 * @returns Object with isEnabled and isLoading properties
 *
 * @example
 * const { isEnabled, isLoading } = useChildSafety()
 * if (isEnabled) {
 *   // Filter content for children
 * }
 */
export function useChildSafety(): UseChildSafetyReturn {
    const { userSession, isInitializing } = useUserData()

    return {
        isEnabled: userSession?.preferences?.childSafetyMode ?? false,
        isLoading: isInitializing,
    }
}

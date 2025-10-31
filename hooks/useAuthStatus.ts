import { useSessionStore } from '../stores/sessionStore'
import useAuth from './useAuth'
import { getCachedUserId } from '../utils/authCache'

/**
 * Lightweight hook for components that only need authentication status
 * Directly uses Zustand store to avoid useUserData overhead
 *
 * IMPORTANT: isGuest and isAuthenticated will be FALSE during loading
 * Always check isLoading first to avoid showing wrong UI during initialization
 */
export const useAuthStatus = () => {
    const sessionType = useSessionStore((state) => state.sessionType)
    const isInitialized = useSessionStore((state) => state.isInitialized)
    const { loading: authLoading, wasRecentlyAuthenticated } = useAuth()

    // Check if we have optimistic auth data (cached user + session initialized as auth)
    // OR if we have cached auth data from previous session (wasRecentlyAuthenticated)
    // This allows us to show authenticated UI immediately while Firebase confirms
    const hasOptimisticAuth =
        (sessionType === 'authenticated' && isInitialized) || wasRecentlyAuthenticated

    // During loading, we're neither guest nor authenticated yet
    // UNLESS we have optimistic auth data from cache
    const isLoading =
        !hasOptimisticAuth && (!isInitialized || sessionType === 'initializing' || authLoading)

    return {
        isGuest: !isLoading && sessionType === 'guest',
        isAuthenticated: !isLoading && sessionType === 'authenticated',
        isInitialized,
        isLoading, // Explicit loading flag (false if we have optimistic auth)
        hasOptimisticAuth, // True if we're showing cached auth while Firebase confirms
        sessionType,
    }
}

import { useSessionStore } from '../stores/sessionStore'
import useAuth from './useAuth'

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
    const { loading: authLoading } = useAuth()

    // During loading, we're neither guest nor authenticated yet
    const isLoading = !isInitialized || sessionType === 'initializing' || authLoading

    return {
        isGuest: !isLoading && sessionType === 'guest',
        isAuthenticated: !isLoading && sessionType === 'authenticated',
        isInitialized,
        isLoading, // NEW: Explicit loading flag
        sessionType,
    }
}

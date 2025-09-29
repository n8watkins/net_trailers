import { useSessionStore } from '../stores/sessionStore'

/**
 * Lightweight hook for components that only need authentication status
 * Directly uses Zustand store to avoid useUserData overhead
 */
export const useAuthStatus = () => {
    const sessionType = useSessionStore((state) => state.sessionType)

    return {
        isGuest: sessionType === 'guest',
        isAuthenticated: sessionType === 'authenticated',
        sessionType,
    }
}

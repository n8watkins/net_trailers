/**
 * Secure authentication cache for optimistic auth state loading
 *
 * This provides a fast, synchronous check for auth state based on:
 * 1. Previous successful auth (cached in memory + localStorage)
 * 2. Firebase's own persistence (indexedDB)
 *
 * Security notes:
 * - This is only used for UI optimization (showing loading vs initial state)
 * - Firebase Auth still performs full validation on every page load
 * - We never skip the Firebase auth check, just optimize the UX while it happens
 * - Cache is cleared on explicit logout
 * - Cache expires after 7 days of inactivity
 */

const AUTH_CACHE_KEY = 'nettrailer_auth_cache'
const CACHE_EXPIRY_DAYS = 7

interface AuthCache {
    wasAuthenticated: boolean
    lastAuthTime: number
    userId?: string
}

/**
 * Check if user was previously authenticated (optimistic check)
 * This is synchronous and fast for immediate UI decisions
 */
export function wasRecentlyAuthenticated(): boolean {
    if (typeof window === 'undefined') return false

    try {
        const cached = localStorage.getItem(AUTH_CACHE_KEY)
        if (!cached) return false

        const data: AuthCache = JSON.parse(cached)

        // Check if cache is expired (7 days)
        const expiryMs = CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000
        const isExpired = Date.now() - data.lastAuthTime > expiryMs

        if (isExpired) {
            // Clean up expired cache
            clearAuthCache()
            return false
        }

        return data.wasAuthenticated
    } catch (error) {
        console.error('[AuthCache] Error reading cache:', error)
        return false
    }
}

/**
 * Get cached user ID if available (for session initialization optimization)
 */
export function getCachedUserId(): string | null {
    if (typeof window === 'undefined') return null

    try {
        const cached = localStorage.getItem(AUTH_CACHE_KEY)
        if (!cached) return null

        const data: AuthCache = JSON.parse(cached)

        // Check if cache is expired
        const expiryMs = CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000
        const isExpired = Date.now() - data.lastAuthTime > expiryMs

        if (isExpired) {
            return null
        }

        return data.userId || null
    } catch (error) {
        console.error('[AuthCache] Error reading cached user ID:', error)
        return null
    }
}

/**
 * Cache successful authentication
 * Called when Firebase confirms user is authenticated
 */
export function cacheAuthState(userId: string): void {
    if (typeof window === 'undefined') return

    try {
        const cache: AuthCache = {
            wasAuthenticated: true,
            lastAuthTime: Date.now(),
            userId,
        }
        localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(cache))
        console.log('[AuthCache] Cached auth state for user:', userId)
    } catch (error) {
        console.error('[AuthCache] Error caching auth state:', error)
    }
}

/**
 * Clear auth cache (on logout or auth error)
 */
export function clearAuthCache(): void {
    if (typeof window === 'undefined') return

    try {
        localStorage.removeItem(AUTH_CACHE_KEY)
        console.log('[AuthCache] Cleared auth cache')
    } catch (error) {
        console.error('[AuthCache] Error clearing cache:', error)
    }
}

/**
 * Update cache timestamp (called on app activity to extend expiry)
 */
export function touchAuthCache(): void {
    if (typeof window === 'undefined') return

    try {
        const cached = localStorage.getItem(AUTH_CACHE_KEY)
        if (!cached) return

        const data: AuthCache = JSON.parse(cached)
        data.lastAuthTime = Date.now()
        localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(data))
    } catch (error) {
        console.error('[AuthCache] Error updating cache timestamp:', error)
    }
}

import { Content } from '../typings'
import { UserPreferences, defaultAuthSession } from '../types/shared'
import { authenticatedFetch } from '../lib/authenticatedFetch'
import { authLog, authError, authWarn } from '../utils/debugLogger'

// Type alias for backward compatibility
export type AuthPreferences = UserPreferences

// Simple in-memory cache for user data (client-side dedup of API calls)
const userDataCache = new Map<string, { data: AuthPreferences; timestamp: number }>()
const loadingPromises = new Map<string, Promise<AuthPreferences>>()
const CACHE_TTL = 300000 // 5 minutes

/** A fresh copy of the default preferences (with a current lastActive). */
function defaultPreferences(): AuthPreferences {
    return { ...structuredClone(defaultAuthSession.preferences), lastActive: Date.now() }
}

/**
 * Persistence for authenticated user preferences.
 *
 * Backed by `/api/user/preferences` (Turso/Drizzle on the server). The user id
 * is resolved server-side from the Auth.js session; the `userId` arguments here
 * are used only for client-side caching/keying.
 */
export class AuthStorageService {
    // Load user data for authenticated users
    static async loadUserData(userId: string): Promise<AuthPreferences> {
        if (!userId || userId === 'undefined' || userId === 'null') {
            authWarn('Invalid userId provided to loadUserData:', userId)
            return defaultPreferences()
        }

        const cached = userDataCache.get(userId)
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
            return cached.data
        }

        const existing = loadingPromises.get(userId)
        if (existing) {
            return existing
        }

        const loadPromise = (async () => {
            try {
                const res = await authenticatedFetch('/api/user/preferences')
                if (!res.ok) {
                    throw new Error(`Failed to load preferences (${res.status})`)
                }
                const json = await res.json()
                const data = (json.preferences ?? defaultPreferences()) as AuthPreferences
                userDataCache.set(userId, { data, timestamp: Date.now() })
                authLog('✅ [AuthStorageService] Loaded preferences for:', userId)
                return data
            } catch (error) {
                authWarn(
                    '⚠️ [AuthStorageService] Failed to load preferences, using defaults:',
                    error
                )
                return defaultPreferences()
            } finally {
                loadingPromises.delete(userId)
            }
        })()

        loadingPromises.set(userId, loadPromise)
        return loadPromise
    }

    // Save user data for authenticated users
    static async saveUserData(userId: string, preferences: AuthPreferences): Promise<void> {
        if (!userId || userId === 'undefined') {
            throw new Error('Invalid userId for preferences save')
        }
        try {
            const res = await authenticatedFetch('/api/user/preferences', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ preferences }),
            })
            if (!res.ok) {
                throw new Error(`Failed to save preferences (${res.status})`)
            }
            userDataCache.set(userId, {
                data: { ...preferences, lastActive: Date.now() },
                timestamp: Date.now(),
            })
            authLog('✅ [AuthStorageService] Saved preferences for:', userId)
        } catch (error) {
            authError('Failed to save user preferences:', error)
            throw error
        }
    }

    // Clear user data (reset to defaults but keep account)
    static async clearUserData(userId: string): Promise<AuthPreferences> {
        try {
            const res = await authenticatedFetch('/api/user/preferences', { method: 'DELETE' })
            if (!res.ok) {
                throw new Error(`Failed to clear preferences (${res.status})`)
            }
            const json = await res.json()
            const data = (json.preferences ?? defaultPreferences()) as AuthPreferences
            userDataCache.set(userId, { data, timestamp: Date.now() })
            authLog(`🧹 User data cleared for ${userId}`)
            return data
        } catch (error) {
            authError('Failed to clear user data:', error)
            throw error
        }
    }

    // Delete user data (resets preferences)
    static async deleteUserData(userId: string): Promise<void> {
        await this.clearUserData(userId)
        userDataCache.delete(userId)
    }

    // Delete user account data (resets preferences; auth account handled separately)
    static async deleteUserAccount(userId: string): Promise<void> {
        await this.clearUserData(userId)
        userDataCache.delete(userId)
        authLog(`🗑️ User data permanently cleared for ${userId}`)
    }

    // Check if user has stored data
    static async userExists(userId: string): Promise<boolean> {
        try {
            const res = await authenticatedFetch('/api/user/preferences')
            return res.ok
        } catch {
            return false
        }
    }

    static invalidateCache(userId: string): void {
        userDataCache.delete(userId)
    }

    // ---- Pure helpers (operate on preferences objects in memory) ----

    // Add to liked movies (with mutual exclusion from hidden)
    static addLikedMovie(preferences: AuthPreferences, content: Content): AuthPreferences {
        const hiddenMovies = preferences.hiddenMovies.filter((m) => m.id !== content.id)
        const isAlreadyLiked = preferences.likedMovies.some((m) => m.id === content.id)
        const likedMovies = isAlreadyLiked
            ? preferences.likedMovies
            : [...preferences.likedMovies, content]
        return { ...preferences, likedMovies, hiddenMovies }
    }

    // Remove from liked movies
    static removeLikedMovie(preferences: AuthPreferences, contentId: number): AuthPreferences {
        return {
            ...preferences,
            likedMovies: preferences.likedMovies.filter((m) => m.id !== contentId),
        }
    }

    // Add to hidden movies (with mutual exclusion from liked)
    static addHiddenMovie(preferences: AuthPreferences, content: Content): AuthPreferences {
        const likedMovies = preferences.likedMovies.filter((m) => m.id !== content.id)
        const isAlreadyHidden = preferences.hiddenMovies.some((m) => m.id === content.id)
        const hiddenMovies = isAlreadyHidden
            ? preferences.hiddenMovies
            : [...preferences.hiddenMovies, content]
        return { ...preferences, likedMovies, hiddenMovies }
    }

    // Remove from hidden movies
    static removeHiddenMovie(preferences: AuthPreferences, contentId: number): AuthPreferences {
        return {
            ...preferences,
            hiddenMovies: preferences.hiddenMovies.filter((m) => m.id !== contentId),
        }
    }

    static isLiked(preferences: AuthPreferences, contentId: number): boolean {
        return preferences.likedMovies.some((m) => m.id === contentId)
    }

    static isHidden(preferences: AuthPreferences, contentId: number): boolean {
        return preferences.hiddenMovies.some((m) => m.id === contentId)
    }

    // Add to default watchlist
    static addToWatchlist(preferences: AuthPreferences, content: Content): AuthPreferences {
        const isAlreadyInWatchlist = preferences.defaultWatchlist.some(
            (item) => item.id === content.id
        )
        if (isAlreadyInWatchlist) return preferences
        return { ...preferences, defaultWatchlist: [...preferences.defaultWatchlist, content] }
    }

    // Remove from default watchlist
    static removeFromWatchlist(preferences: AuthPreferences, contentId: number): AuthPreferences {
        return {
            ...preferences,
            defaultWatchlist: preferences.defaultWatchlist.filter((item) => item.id !== contentId),
        }
    }

    static isInWatchlist(preferences: AuthPreferences, contentId: number): boolean {
        return preferences.defaultWatchlist.some((item) => item.id === contentId)
    }

    // ---- Derived summaries (read through loadUserData) ----

    static async getUserDataOverview(userId: string): Promise<{
        userId: string
        exists: boolean
        watchlistCount: number
        likedCount: number
        hiddenCount: number
        listsCount: number
        lastActive?: number
    }> {
        try {
            const preferences = await this.loadUserData(userId)
            return {
                userId,
                exists: true,
                watchlistCount: preferences.defaultWatchlist.length,
                likedCount: preferences.likedMovies.length,
                hiddenCount: preferences.hiddenMovies.length,
                listsCount: preferences.userCreatedWatchlists.length,
                lastActive: preferences.lastActive,
            }
        } catch {
            return {
                userId,
                exists: false,
                watchlistCount: 0,
                likedCount: 0,
                hiddenCount: 0,
                listsCount: 0,
            }
        }
    }

    static async getDataSummary(userId: string): Promise<{
        watchlistCount: number
        likedCount: number
        hiddenCount: number
        listsCount: number
        totalItems: number
        isEmpty: boolean
        accountCreated?: Date
    }> {
        try {
            const preferences = await this.loadUserData(userId)
            const totalItems =
                preferences.defaultWatchlist.length +
                preferences.likedMovies.length +
                preferences.hiddenMovies.length +
                preferences.userCreatedWatchlists.reduce((acc, list) => acc + list.items.length, 0)
            return {
                watchlistCount: preferences.defaultWatchlist.length,
                likedCount: preferences.likedMovies.length,
                hiddenCount: preferences.hiddenMovies.length,
                listsCount: preferences.userCreatedWatchlists.length,
                totalItems,
                isEmpty: totalItems === 0,
                accountCreated: preferences.lastActive
                    ? new Date(preferences.lastActive)
                    : undefined,
            }
        } catch (error) {
            authError('Failed to get data summary:', error)
            return {
                watchlistCount: 0,
                likedCount: 0,
                hiddenCount: 0,
                listsCount: 0,
                totalItems: 0,
                isEmpty: true,
            }
        }
    }

    static async exportUserData(userId: string): Promise<{
        userId: string
        exportDate: string
        data: AuthPreferences
    }> {
        const preferences = await this.loadUserData(userId)
        return { userId, exportDate: new Date().toISOString(), data: preferences }
    }
}

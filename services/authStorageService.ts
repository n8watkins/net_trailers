import { Content } from '../typings'
import { UserPreferences } from '../types/shared'
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { firebaseTracker } from '../utils/firebaseCallTracker'
import { authLog, authError, authWarn } from '../utils/debugLogger'

// Type alias for backward compatibility
export type AuthPreferences = UserPreferences

// Simple in-memory cache for user data
const userDataCache = new Map<string, { data: AuthPreferences; timestamp: number }>()
const loadingPromises = new Map<string, Promise<AuthPreferences>>() // Cache ongoing loads
const CACHE_TTL = 300000 // 5 minutes cache (increased from 30 seconds)

// Helper function to remove undefined values from objects (Firestore doesn't accept undefined)
function removeUndefinedValues(obj: unknown): unknown {
    if (obj === null || obj === undefined) return null
    if (Array.isArray(obj)) {
        return obj.map(removeUndefinedValues).filter((v) => v !== undefined)
    }
    if (typeof obj === 'object' && obj !== null && obj.constructor === Object) {
        const cleaned: Record<string, unknown> = {}
        for (const [key, value] of Object.entries(obj)) {
            if (value !== undefined) {
                cleaned[key] = removeUndefinedValues(value)
            }
        }
        return cleaned
    }
    return obj
}

export class AuthStorageService {
    // Load user data for authenticated users
    static async loadUserData(userId: string): Promise<AuthPreferences> {
        // Validate that userId exists before attempting Firestore operations
        if (!userId || userId === 'undefined' || userId === 'null') {
            authWarn('Invalid userId provided to loadUserData:', userId)
            return {
                likedMovies: [],
                hiddenMovies: [],
                defaultWatchlist: [],
                userCreatedWatchlists: [],
                lastActive: Date.now(),
                autoMute: true,
                defaultVolume: 50,
                childSafetyMode: false,
                improveRecommendations: true,
                showRecommendations: true,
                trackWatchHistory: true,
            }
        }

        // Check if Firebase Auth is ready by verifying currentUser
        const { auth } = await import('../firebase')
        if (!auth.currentUser || auth.currentUser.uid !== userId) {
            authWarn('Firebase Auth not ready or user mismatch, returning defaults:', {
                requestedUserId: userId,
                currentUser: auth.currentUser?.uid,
            })
            return {
                likedMovies: [],
                hiddenMovies: [],
                defaultWatchlist: [],
                userCreatedWatchlists: [],
                lastActive: Date.now(),
                autoMute: true,
                defaultVolume: 50,
                childSafetyMode: false,
                improveRecommendations: true,
                showRecommendations: true,
                trackWatchHistory: true,
            }
        }

        // Check cache first
        const cached = userDataCache.get(userId)
        if (cached) {
            const age = Date.now() - cached.timestamp
            if (age < CACHE_TTL) {
                authLog(
                    '💾 [AuthStorageService] Using cached data for:',
                    userId,
                    `(${Math.round(age / 1000)}s old)`
                )
                firebaseTracker.track('loadUserData-cached', 'AuthStorageService', userId)
                return cached.data
            }
        }

        // Check if there's already a load in progress for this user
        const existingLoadPromise = loadingPromises.get(userId)
        if (existingLoadPromise) {
            authLog('♻️ [AuthStorageService] Reusing existing load promise for:', userId)
            firebaseTracker.track('loadUserData-reused', 'AuthStorageService', userId)
            return existingLoadPromise
        }

        // Get stack trace to identify caller
        const stack = new Error().stack
        const caller = stack?.split('\n')[3]?.trim() || 'unknown'

        authLog('📚 [AuthStorageService] Starting NEW load for:', userId, 'from:', caller)
        firebaseTracker.track('loadUserData', 'AuthStorageService', userId, { caller })

        // Create a new loading promise and store it
        const loadPromise = (async () => {
            try {
                // Add timeout to prevent hanging
                const timeoutPromise = new Promise(
                    (_, reject) => setTimeout(() => reject(new Error('Firestore timeout')), 5000) // 5 second timeout
                )

                const docRef = doc(db, 'users', userId)
                authLog('📍 [AuthStorageService] Reading from path:', `users/${userId}`)

                const firestorePromise = getDoc(docRef)

                const userDoc = (await Promise.race([firestorePromise, timeoutPromise])) as Awaited<
                    typeof firestorePromise
                >

                if (userDoc.exists()) {
                    const data = userDoc.data()
                    authLog('✅ [AuthStorageService] Loaded user data from Firestore:', {
                        userId,
                        documentPath: `users/${userId}`,
                        hasDefaultWatchlist: !!data.defaultWatchlist,
                        defaultWatchlistCount: data.defaultWatchlist?.length || 0,
                        hasLikedMovies: !!data.likedMovies,
                        likedMoviesCount: data.likedMovies?.length || 0,
                        hasHiddenMovies: !!data.hiddenMovies,
                        hiddenMoviesCount: data.hiddenMovies?.length || 0,
                        customListsCount: data.userCreatedWatchlists?.length || 0,
                    })

                    // NEW SCHEMA - No migration needed
                    const preferences: AuthPreferences = {
                        likedMovies: data.likedMovies || [],
                        hiddenMovies: data.hiddenMovies || [],
                        defaultWatchlist: data.defaultWatchlist || [],
                        userCreatedWatchlists: data.userCreatedWatchlists || [],
                        lastActive: data.lastActive || Date.now(),
                        autoMute: data.autoMute ?? true,
                        defaultVolume: data.defaultVolume ?? 50,
                        childSafetyMode: data.childSafetyMode ?? false,
                        improveRecommendations: data.improveRecommendations ?? true,
                        showRecommendations: data.showRecommendations ?? true,
                        trackWatchHistory: data.trackWatchHistory ?? true,
                        genrePreferences: data.genrePreferences || [],
                    }

                    // Cache the loaded data
                    userDataCache.set(userId, { data: preferences, timestamp: Date.now() })
                    authLog('💾 [AuthStorageService] Cached user data for:', userId)

                    // Clear loading promise after successful load
                    loadingPromises.delete(userId)

                    return preferences
                } else {
                    // Create default user document
                    const defaultPreferences: AuthPreferences = {
                        likedMovies: [],
                        hiddenMovies: [],
                        defaultWatchlist: [],
                        userCreatedWatchlists: [],
                        lastActive: Date.now(),
                        autoMute: true,
                        defaultVolume: 50,
                        childSafetyMode: false,
                        improveRecommendations: true,
                        showRecommendations: true,
                        trackWatchHistory: true,
                    }

                    // Try to save, but don't fail if offline
                    try {
                        firebaseTracker.track(
                            'saveUserData-createDefault',
                            'AuthStorageService',
                            userId
                        )
                        await this.saveUserData(userId, defaultPreferences)
                    } catch (saveError) {
                        authWarn('Failed to create auth user document (offline?):', saveError)
                    }

                    // Cache the default preferences
                    userDataCache.set(userId, { data: defaultPreferences, timestamp: Date.now() })
                    authLog('💾 [AuthStorageService] Cached default data for:', userId)

                    // Clear loading promise
                    loadingPromises.delete(userId)

                    return defaultPreferences
                }
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error)

                // Check if error is due to permissions (auth not ready), offline, or timeout
                const isPermissionError =
                    errorMessage.includes('permission') ||
                    errorMessage.includes('insufficient') ||
                    errorMessage.includes('Missing or insufficient permissions')
                const isOfflineError =
                    errorMessage.includes('offline') || errorMessage.includes('network')
                const isTimeoutError = errorMessage.includes('timeout')

                if (isPermissionError) {
                    authWarn(
                        '⚠️ Firebase permissions error (auth may not be ready), using defaults'
                    )
                } else if (isOfflineError || isTimeoutError) {
                    authWarn('⚠️ Firebase is offline or timed out, using default auth preferences')
                } else {
                    authError('🚨 [AuthStorageService] Failed to load user data:', {
                        error: errorMessage,
                        userId,
                        isTimeout: isTimeoutError,
                        isOffline: isOfflineError,
                        isPermissionError,
                    })
                }

                // Clear loading promise on error
                loadingPromises.delete(userId)

                // Return default preferences if Firebase fails
                return {
                    likedMovies: [],
                    hiddenMovies: [],
                    defaultWatchlist: [],
                    userCreatedWatchlists: [],
                    lastActive: Date.now(),
                    autoMute: true,
                    defaultVolume: 50,
                    childSafetyMode: false,
                    improveRecommendations: true,
                    showRecommendations: true,
                    trackWatchHistory: true,
                }
            }
        })()

        // Store the loading promise
        loadingPromises.set(userId, loadPromise)

        return loadPromise
    }

    // Save user data for authenticated users
    static async saveUserData(userId: string, preferences: AuthPreferences): Promise<void> {
        try {
            // Clean the data to remove undefined values
            const dataToSave = removeUndefinedValues({
                ...preferences,
                lastActive: Date.now(),
            })

            authLog('🔥 [AuthStorageService] Saving to Firestore:', {
                userId,
                path: `users/${userId}`,
                likedMoviesCount: preferences.likedMovies?.length || 0,
                hiddenMoviesCount: preferences.hiddenMovies?.length || 0,
                defaultWatchlistCount: preferences.defaultWatchlist?.length || 0,
                customListsCount: preferences.userCreatedWatchlists?.length || 0,
                dataSize: JSON.stringify(dataToSave).length,
                cleanedData: dataToSave,
            })

            // Validate userId before saving
            if (!userId || userId === 'undefined') {
                throw new Error('Invalid userId for Firestore save')
            }

            firebaseTracker.track('saveUserData', 'AuthStorageService', userId, {
                likedMoviesCount: preferences.likedMovies?.length || 0,
                hiddenMoviesCount: preferences.hiddenMovies?.length || 0,
                defaultWatchlistCount: preferences.defaultWatchlist?.length || 0,
            })
            await setDoc(doc(db, 'users', userId), dataToSave as Record<string, unknown>, {
                merge: true,
            })
            authLog('✅ [AuthStorageService] Successfully saved to Firestore for user:', userId)

            // Update cache with saved data instead of invalidating it
            const cachedData: AuthPreferences = {
                likedMovies: preferences.likedMovies || [],
                hiddenMovies: preferences.hiddenMovies || [],
                defaultWatchlist: preferences.defaultWatchlist || [],
                userCreatedWatchlists: preferences.userCreatedWatchlists || [],
                lastActive: preferences.lastActive || Date.now(),
                autoMute: preferences.autoMute ?? true,
                defaultVolume: preferences.defaultVolume ?? 50,
                childSafetyMode: preferences.childSafetyMode ?? false,
                improveRecommendations: preferences.improveRecommendations ?? true,
                showRecommendations: preferences.showRecommendations ?? true,
                trackWatchHistory: preferences.trackWatchHistory ?? true,
                genrePreferences: preferences.genrePreferences || [],
            }
            userDataCache.set(userId, { data: cachedData, timestamp: Date.now() })
            authLog('💾 [AuthStorageService] Updated cache with saved data for user:', userId)
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error)

            // Check if error is due to offline status
            if (errorMessage.includes('offline') || errorMessage.includes('network')) {
                authWarn('Firebase is offline, auth data will sync when online:', errorMessage)
                // Don't throw error for offline issues to prevent app crashes
                return
            } else {
                authError('Failed to save auth user data to Firebase:', error)
                throw error
            }
        }
    }

    // Update specific field in user data
    static async updateUserDataField(
        userId: string,
        fieldPath: string,
        value: unknown
    ): Promise<void> {
        try {
            await updateDoc(doc(db, 'users', userId), {
                [fieldPath]: value,
                lastActive: Date.now(),
            })
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error)

            if (errorMessage.includes('offline') || errorMessage.includes('network')) {
                authWarn(
                    'Firebase is offline, auth field update will sync when online:',
                    errorMessage
                )
                return
            } else {
                authError(`Failed to update auth user field ${fieldPath}:`, error)
                throw error
            }
        }
    }

    // Add to liked movies (with mutual exclusion from hidden)
    static addLikedMovie(preferences: AuthPreferences, content: Content): AuthPreferences {
        // Remove from hidden if exists (mutual exclusion)
        const hiddenMovies = preferences.hiddenMovies.filter((m) => m.id !== content.id)

        // Add to liked if not already there
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
        // Remove from liked if exists (mutual exclusion)
        const likedMovies = preferences.likedMovies.filter((m) => m.id !== content.id)

        // Add to hidden if not already there
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

    // Check if movie is liked
    static isLiked(preferences: AuthPreferences, contentId: number): boolean {
        return preferences.likedMovies.some((m) => m.id === contentId)
    }

    // Check if movie is hidden
    static isHidden(preferences: AuthPreferences, contentId: number): boolean {
        return preferences.hiddenMovies.some((m) => m.id === contentId)
    }

    // Add to default watchlist
    static addToWatchlist(preferences: AuthPreferences, content: Content): AuthPreferences {
        const isAlreadyInWatchlist = preferences.defaultWatchlist.some(
            (item) => item.id === content.id
        )
        if (isAlreadyInWatchlist) return preferences

        return {
            ...preferences,
            defaultWatchlist: [...preferences.defaultWatchlist, content],
        }
    }

    // Remove from default watchlist
    static removeFromWatchlist(preferences: AuthPreferences, contentId: number): AuthPreferences {
        return {
            ...preferences,
            defaultWatchlist: preferences.defaultWatchlist.filter((item) => item.id !== contentId),
        }
    }

    // Check if content is in default watchlist
    static isInWatchlist(preferences: AuthPreferences, contentId: number): boolean {
        return preferences.defaultWatchlist.some((item) => item.id === contentId)
    }

    // Delete user data (for account deletion)
    static async deleteUserData(userId: string): Promise<void> {
        try {
            await setDoc(doc(db, 'users', userId), {})
            authLog(`Auth user data deleted for ${userId}`)
        } catch (error) {
            authError('Failed to delete auth user data:', error)
            throw error
        }
    }

    // Check if user exists in Firestore
    static async userExists(userId: string): Promise<boolean> {
        try {
            const userDoc = await getDoc(doc(db, 'users', userId))
            return userDoc.exists()
        } catch (error) {
            authError('Failed to check if auth user exists:', error)
            return false
        }
    }

    // Get user data overview for debugging
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
            const exists = await this.userExists(userId)

            return {
                userId,
                exists,
                watchlistCount: preferences.defaultWatchlist.length,
                likedCount: preferences.likedMovies.length,
                hiddenCount: preferences.hiddenMovies.length,
                listsCount: preferences.userCreatedWatchlists.length,
                lastActive: preferences.lastActive,
            }
        } catch (_error) {
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

    // Clear user data (reset to defaults but keep account)
    static async clearUserData(userId: string): Promise<AuthPreferences> {
        const defaultPrefs: AuthPreferences = {
            likedMovies: [],
            hiddenMovies: [],
            defaultWatchlist: [],
            userCreatedWatchlists: [],
            lastActive: Date.now(),
            autoMute: true,
            defaultVolume: 50,
            childSafetyMode: false,
            improveRecommendations: true,
            showRecommendations: false,
            trackWatchHistory: true,
        }

        await this.saveUserData(userId, defaultPrefs)
        authLog(`🧹 User data cleared for ${userId}`)
        return defaultPrefs
    }

    // Get data summary for confirmation dialogs
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

    // Export user data (for backup before deletion)
    static async exportUserData(userId: string): Promise<{
        userId: string
        exportDate: string
        data: AuthPreferences
    }> {
        const preferences = await this.loadUserData(userId)
        return {
            userId,
            exportDate: new Date().toISOString(),
            data: preferences,
        }
    }

    // Delete user account and all associated data (PERMANENT)
    static async deleteUserAccount(userId: string): Promise<void> {
        try {
            // First, get a backup for logging
            const backup = await this.exportUserData(userId)

            // Delete the Firestore document
            const { deleteDoc } = await import('firebase/firestore')
            const { db } = await import('../firebase')
            await deleteDoc(doc(db, 'users', userId))

            authLog(`🗑️ User account and data permanently deleted for ${userId}`)
            authLog(
                `📄 Backup created with ${backup.data.defaultWatchlist.length} watchlist items, ${backup.data.likedMovies.length} liked, ${backup.data.hiddenMovies.length} hidden`
            )

            // Note: This doesn't delete the Firebase Auth account, just the user data
            // The Auth account should be deleted separately using Firebase Auth SDK
        } catch (error) {
            authError('Failed to delete user account:', error)
            throw new Error(
                `Failed to delete account: ${error instanceof Error ? error.message : 'Unknown error'}`
            )
        }
    }

    // Soft delete user data (mark as deleted but don't remove immediately)
    static async softDeleteUserData(userId: string): Promise<void> {
        try {
            const deletionData = {
                deleted: true,
                deletedAt: Date.now(),
                originalData: await this.exportUserData(userId),
            }

            await setDoc(doc(db, 'users', userId), deletionData, { merge: true })
            authLog(`🗑️ User data soft deleted for ${userId} (can be recovered for 30 days)`)
        } catch (error) {
            authError('Failed to soft delete user data:', error)
            throw error
        }
    }

    // Restore soft deleted user data
    static async restoreUserData(userId: string): Promise<boolean> {
        try {
            const userDoc = await getDoc(doc(db, 'users', userId))
            const data = userDoc.data()

            if (data?.deleted && data?.originalData?.data) {
                await this.saveUserData(userId, data.originalData.data)
                authLog(`♻️ User data restored for ${userId}`)
                return true
            }

            return false
        } catch (error) {
            authError('Failed to restore user data:', error)
            return false
        }
    }
}

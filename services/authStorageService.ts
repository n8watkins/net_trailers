import { Content } from '../typings'
import { AuthPreferences, AuthRating } from '../atoms/authSessionAtom'
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { UserListsService } from './userListsService'
import { firebaseTracker } from '../utils/firebaseCallTracker'

// Simple in-memory cache for user data
const userDataCache = new Map<string, { data: AuthPreferences; timestamp: number }>()
const loadingPromises = new Map<string, Promise<AuthPreferences>>() // Cache ongoing loads
const CACHE_TTL = 300000 // 5 minutes cache (increased from 30 seconds)

// Helper function to remove undefined values from objects (Firestore doesn't accept undefined)
function removeUndefinedValues(obj: any): any {
    if (obj === null || obj === undefined) return null
    if (Array.isArray(obj)) {
        return obj.map(removeUndefinedValues).filter((v) => v !== undefined)
    }
    if (typeof obj === 'object' && obj.constructor === Object) {
        const cleaned: any = {}
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
            console.warn('Invalid userId provided to loadUserData:', userId)
            return {
                watchlist: [],
                ratings: [],
                userLists: UserListsService.initializeDefaultLists(),
                lastActive: Date.now(),
            }
        }

        // Check cache first
        const cached = userDataCache.get(userId)
        if (cached) {
            const age = Date.now() - cached.timestamp
            if (age < CACHE_TTL) {
                console.log(
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
            console.log('♻️ [AuthStorageService] Reusing existing load promise for:', userId)
            firebaseTracker.track('loadUserData-reused', 'AuthStorageService', userId)
            return existingLoadPromise
        }

        // Get stack trace to identify caller
        const stack = new Error().stack
        const caller = stack?.split('\n')[3]?.trim() || 'unknown'

        console.log('📚 [AuthStorageService] Starting NEW load for:', userId, 'from:', caller)
        firebaseTracker.track('loadUserData', 'AuthStorageService', userId, { caller })

        // Create a new loading promise and store it
        const loadPromise = (async () => {
            try {
                // Add timeout to prevent hanging
                const timeoutPromise = new Promise(
                    (_, reject) => setTimeout(() => reject(new Error('Firestore timeout')), 5000) // 5 second timeout
                )

                const docRef = doc(db, 'users', userId)
                console.log('📍 [AuthStorageService] Reading from path:', `users/${userId}`)

                const firestorePromise = getDoc(docRef)

                const userDoc = (await Promise.race([firestorePromise, timeoutPromise])) as any

                if (userDoc.exists()) {
                    const data = userDoc.data()
                    console.log('✅ [AuthStorageService] Loaded user data from Firestore:', {
                        userId,
                        documentPath: `users/${userId}`,
                        hasWatchlist: !!data.watchlist,
                        watchlistCount: data.watchlist?.length || 0,
                        watchlistItems:
                            data.watchlist?.map((w: any) => ({
                                id: w.id,
                                title: w.title || w.name,
                            })) || [],
                        hasRatings: !!data.ratings,
                        ratingsCount: data.ratings?.length || 0,
                        hasUserLists: !!data.userLists,
                        listsCount: data.userLists?.lists?.length || 0,
                        customLists:
                            data.userLists?.lists?.map((l: any) => ({
                                id: l.id,
                                name: l.name,
                                itemCount: l.items?.length || 0,
                            })) || [],
                    })
                    let preferences: AuthPreferences = {
                        watchlist: data.watchlist || [],
                        ratings: data.ratings || [],
                        userLists: data.userLists || UserListsService.initializeDefaultLists(),
                        lastActive: data.lastActive || Date.now(),
                    }

                    // Migrate old data structure if needed
                    if (!data.userLists) {
                        preferences = UserListsService.migrateOldPreferences(
                            preferences as any
                        ) as AuthPreferences
                        // Save migrated data back to Firebase
                        try {
                            firebaseTracker.track(
                                'saveUserData-migration',
                                'AuthStorageService',
                                userId
                            )
                            await this.saveUserData(userId, preferences)
                        } catch (saveError) {
                            console.warn('Failed to save migrated auth data (offline?):', saveError)
                        }
                    }

                    // Cache the loaded data
                    userDataCache.set(userId, { data: preferences, timestamp: Date.now() })
                    console.log('💾 [AuthStorageService] Cached user data for:', userId)

                    // Clear loading promise after successful load
                    loadingPromises.delete(userId)

                    return preferences
                } else {
                    // Create default user document
                    const defaultPreferences: AuthPreferences = {
                        watchlist: [],
                        ratings: [],
                        userLists: UserListsService.initializeDefaultLists(),
                        lastActive: Date.now(),
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
                        console.warn('Failed to create auth user document (offline?):', saveError)
                    }

                    // Cache the default preferences
                    userDataCache.set(userId, { data: defaultPreferences, timestamp: Date.now() })
                    console.log('💾 [AuthStorageService] Cached default data for:', userId)

                    // Clear loading promise
                    loadingPromises.delete(userId)

                    return defaultPreferences
                }
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error)

                console.error('🚨 [AuthStorageService] Failed to load user data:', {
                    error: errorMessage,
                    userId,
                    isTimeout: errorMessage.includes('timeout'),
                    isOffline: errorMessage.includes('offline') || errorMessage.includes('network'),
                })

                // Check if error is due to offline status or timeout
                if (
                    errorMessage.includes('offline') ||
                    errorMessage.includes('network') ||
                    errorMessage.includes('timeout')
                ) {
                    console.warn(
                        '⚠️ Firebase is offline or timed out, using default auth preferences'
                    )
                }

                // Clear loading promise on error
                loadingPromises.delete(userId)

                // Return default preferences if Firebase fails
                return {
                    watchlist: [],
                    ratings: [],
                    userLists: UserListsService.initializeDefaultLists(),
                    lastActive: Date.now(),
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

            console.log('🔥 [AuthStorageService] Saving to Firestore:', {
                userId,
                path: `users/${userId}`,
                listsCount: preferences.userLists?.lists?.length || 0,
                watchlistCount: preferences.watchlist?.length || 0,
                dataSize: JSON.stringify(dataToSave).length,
                hasUserLists: !!preferences.userLists,
                cleanedData: dataToSave,
            })

            // Validate userId before saving
            if (!userId || userId === 'undefined') {
                throw new Error('Invalid userId for Firestore save')
            }

            firebaseTracker.track('saveUserData', 'AuthStorageService', userId, {
                watchlistCount: preferences.watchlist?.length || 0,
                ratingsCount: preferences.ratings?.length || 0,
            })
            await setDoc(doc(db, 'users', userId), dataToSave, { merge: true })
            console.log('✅ [AuthStorageService] Successfully saved to Firestore for user:', userId)

            // Invalidate cache after save
            userDataCache.delete(userId)
            console.log('🔄 [AuthStorageService] Cleared cache for user after save:', userId)
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error)

            // Check if error is due to offline status
            if (errorMessage.includes('offline') || errorMessage.includes('network')) {
                console.warn('Firebase is offline, auth data will sync when online:', errorMessage)
                // Don't throw error for offline issues to prevent app crashes
                return
            } else {
                console.error('Failed to save auth user data to Firebase:', error)
                throw error
            }
        }
    }

    // Update specific field in user data
    static async updateUserDataField(userId: string, fieldPath: string, value: any): Promise<void> {
        try {
            await updateDoc(doc(db, 'users', userId), {
                [fieldPath]: value,
                lastActive: Date.now(),
            })
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error)

            if (errorMessage.includes('offline') || errorMessage.includes('network')) {
                console.warn(
                    'Firebase is offline, auth field update will sync when online:',
                    errorMessage
                )
                return
            } else {
                console.error(`Failed to update auth user field ${fieldPath}:`, error)
                throw error
            }
        }
    }

    // Add or update a rating
    static addRating(
        preferences: AuthPreferences,
        contentId: number,
        rating: 'liked' | 'disliked',
        content?: Content
    ): AuthPreferences {
        const existingRatingIndex = preferences.ratings.findIndex((r) => r.contentId === contentId)

        const newRating: AuthRating = {
            contentId,
            rating,
            timestamp: Date.now(),
            content,
        }

        let updatedRatings: AuthRating[]
        if (existingRatingIndex >= 0) {
            updatedRatings = [...preferences.ratings]
            updatedRatings[existingRatingIndex] = newRating
        } else {
            updatedRatings = [...preferences.ratings, newRating]
        }

        return {
            ...preferences,
            ratings: updatedRatings,
        }
    }

    // Remove a rating
    static removeRating(preferences: AuthPreferences, contentId: number): AuthPreferences {
        return {
            ...preferences,
            ratings: preferences.ratings.filter((r) => r.contentId !== contentId),
        }
    }

    // Add to watchlist
    static addToWatchlist(preferences: AuthPreferences, content: Content): AuthPreferences {
        const isAlreadyInWatchlist = preferences.watchlist.some((item) => item.id === content.id)
        if (isAlreadyInWatchlist) return preferences

        return {
            ...preferences,
            watchlist: [...preferences.watchlist, content],
        }
    }

    // Remove from watchlist
    static removeFromWatchlist(preferences: AuthPreferences, contentId: number): AuthPreferences {
        return {
            ...preferences,
            watchlist: preferences.watchlist.filter((item) => item.id !== contentId),
        }
    }

    // Get rating for specific content
    static getRating(preferences: AuthPreferences, contentId: number): AuthRating | null {
        return preferences.ratings.find((r) => r.contentId === contentId) || null
    }

    // Check if content is in watchlist
    static isInWatchlist(preferences: AuthPreferences, contentId: number): boolean {
        return preferences.watchlist.some((item) => item.id === contentId)
    }

    // Delete user data (for account deletion)
    static async deleteUserData(userId: string): Promise<void> {
        try {
            await setDoc(doc(db, 'users', userId), {})
            console.log(`Auth user data deleted for ${userId}`)
        } catch (error) {
            console.error('Failed to delete auth user data:', error)
            throw error
        }
    }

    // Check if user exists in Firestore
    static async userExists(userId: string): Promise<boolean> {
        try {
            const userDoc = await getDoc(doc(db, 'users', userId))
            return userDoc.exists()
        } catch (error) {
            console.error('Failed to check if auth user exists:', error)
            return false
        }
    }

    // Get user data overview for debugging
    static async getUserDataOverview(userId: string): Promise<{
        userId: string
        exists: boolean
        watchlistCount: number
        ratingsCount: number
        listsCount: number
        lastActive?: number
    }> {
        try {
            const preferences = await this.loadUserData(userId)
            const exists = await this.userExists(userId)

            return {
                userId,
                exists,
                watchlistCount: preferences.watchlist.length,
                ratingsCount: preferences.ratings.length,
                listsCount: preferences.userLists.lists.length,
                lastActive: preferences.lastActive,
            }
        } catch (error) {
            return {
                userId,
                exists: false,
                watchlistCount: 0,
                ratingsCount: 0,
                listsCount: 0,
            }
        }
    }

    // Clear user data (reset to defaults but keep account)
    static async clearUserData(userId: string): Promise<AuthPreferences> {
        const defaultPrefs: AuthPreferences = {
            watchlist: [],
            ratings: [],
            userLists: UserListsService.initializeDefaultLists(),
            lastActive: Date.now(),
        }

        await this.saveUserData(userId, defaultPrefs)
        console.log(`🧹 User data cleared for ${userId}`)
        return defaultPrefs
    }

    // Get data summary for confirmation dialogs
    static async getDataSummary(userId: string): Promise<{
        watchlistCount: number
        ratingsCount: number
        listsCount: number
        totalItems: number
        isEmpty: boolean
        accountCreated?: Date
    }> {
        try {
            const preferences = await this.loadUserData(userId)
            const totalItems =
                preferences.watchlist.length +
                preferences.ratings.length +
                preferences.userLists.lists.reduce((acc, list) => acc + list.items.length, 0)

            return {
                watchlistCount: preferences.watchlist.length,
                ratingsCount: preferences.ratings.length,
                listsCount: preferences.userLists.lists.length,
                totalItems,
                isEmpty: totalItems === 0,
                accountCreated: preferences.lastActive
                    ? new Date(preferences.lastActive)
                    : undefined,
            }
        } catch (error) {
            console.error('Failed to get data summary:', error)
            return {
                watchlistCount: 0,
                ratingsCount: 0,
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

            console.log(`🗑️ User account and data permanently deleted for ${userId}`)
            console.log(
                `📄 Backup created with ${backup.data.watchlist.length} watchlist items, ${backup.data.ratings.length} ratings`
            )

            // Note: This doesn't delete the Firebase Auth account, just the user data
            // The Auth account should be deleted separately using Firebase Auth SDK
        } catch (error) {
            console.error('Failed to delete user account:', error)
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
            console.log(`🗑️ User data soft deleted for ${userId} (can be recovered for 30 days)`)
        } catch (error) {
            console.error('Failed to soft delete user data:', error)
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
                console.log(`♻️ User data restored for ${userId}`)
                return true
            }

            return false
        } catch (error) {
            console.error('Failed to restore user data:', error)
            return false
        }
    }
}

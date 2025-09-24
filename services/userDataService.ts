import { Content } from '../typings'
import { UserRating, UserPreferences, UserSession } from '../atoms/userDataAtom'
import { doc, setDoc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { UserListsService } from './userListsService'

const GUEST_STORAGE_KEY = 'nettrailer_guest_data'
const GUEST_ID_KEY = 'nettrailer_guest_id'

export class UserDataService {
    // Generate a unique guest ID
    static generateGuestId(): string {
        return `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }

    // Get or create guest ID
    static getGuestId(): string {
        if (typeof window === 'undefined') return ''

        let guestId = localStorage.getItem(GUEST_ID_KEY)
        if (!guestId) {
            guestId = this.generateGuestId()
            localStorage.setItem(GUEST_ID_KEY, guestId)
        }
        return guestId
    }

    // Load user data for guest users
    static loadGuestData(): UserPreferences {
        if (typeof window === 'undefined') {
            const defaultPrefs = {
                watchlist: [],
                ratings: [],
                userLists: UserListsService.initializeDefaultLists(),
                lastActive: Date.now(),
            }
            return defaultPrefs
        }

        try {
            const data = localStorage.getItem(GUEST_STORAGE_KEY)
            if (!data) {
                const defaultPrefs = {
                    watchlist: [],
                    ratings: [],
                    userLists: UserListsService.initializeDefaultLists(),
                    lastActive: Date.now(),
                }
                return defaultPrefs
            }

            const parsedData = JSON.parse(data)

            // Migrate old data structure if needed
            if (!parsedData.userLists) {
                return UserListsService.migrateOldPreferences(parsedData)
            }

            return parsedData
        } catch (error) {
            console.error('Failed to load guest data:', error)
            const defaultPrefs = {
                watchlist: [],
                ratings: [],
                userLists: UserListsService.initializeDefaultLists(),
                lastActive: Date.now(),
            }
            return defaultPrefs
        }
    }

    // Save user data for guest users
    static saveGuestData(preferences: UserPreferences): void {
        if (typeof window === 'undefined') return

        try {
            const dataToSave = {
                ...preferences,
                lastActive: Date.now(),
            }
            localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(dataToSave))
        } catch (error) {
            console.error('Failed to save guest data:', error)
        }
    }

    // Add or update a rating
    static addRating(
        preferences: UserPreferences,
        contentId: number,
        rating: 'liked' | 'disliked',
        content?: Content
    ): UserPreferences {
        const existingRatingIndex = preferences.ratings.findIndex((r) => r.contentId === contentId)

        const newRating: UserRating = {
            contentId,
            rating,
            timestamp: Date.now(),
            content, // Store the content object if provided
        }

        let updatedRatings: UserRating[]
        if (existingRatingIndex >= 0) {
            // Update existing rating
            updatedRatings = [...preferences.ratings]
            updatedRatings[existingRatingIndex] = newRating
        } else {
            // Add new rating
            updatedRatings = [...preferences.ratings, newRating]
        }

        return {
            ...preferences,
            ratings: updatedRatings,
        }
    }

    // Remove a rating
    static removeRating(preferences: UserPreferences, contentId: number): UserPreferences {
        return {
            ...preferences,
            ratings: preferences.ratings.filter((r) => r.contentId !== contentId),
        }
    }

    // Add to watchlist
    static addToWatchlist(preferences: UserPreferences, content: Content): UserPreferences {
        const isAlreadyInWatchlist = preferences.watchlist.some((item) => item.id === content.id)
        if (isAlreadyInWatchlist) return preferences

        return {
            ...preferences,
            watchlist: [...preferences.watchlist, content],
        }
    }

    // Remove from watchlist
    static removeFromWatchlist(preferences: UserPreferences, contentId: number): UserPreferences {
        return {
            ...preferences,
            watchlist: preferences.watchlist.filter((item) => item.id !== contentId),
        }
    }

    // Get rating for specific content
    static getRating(preferences: UserPreferences, contentId: number): UserRating | null {
        return preferences.ratings.find((r) => r.contentId === contentId) || null
    }

    // Check if content is in watchlist
    static isInWatchlist(preferences: UserPreferences, contentId: number): boolean {
        return preferences.watchlist.some((item) => item.id === contentId)
    }

    // Load user data for authenticated users
    static async loadUserData(userId: string): Promise<UserPreferences> {
        try {
            const userDoc = await getDoc(doc(db, 'users', userId))

            if (userDoc.exists()) {
                const data = userDoc.data()
                let preferences: UserPreferences = {
                    watchlist: data.watchlist || [],
                    ratings: data.ratings || [],
                    userLists: data.userLists || UserListsService.initializeDefaultLists(),
                    lastActive: data.lastActive || Date.now(),
                }

                // Migrate old data structure if needed
                if (!data.userLists) {
                    preferences = UserListsService.migrateOldPreferences(preferences)
                    // Save migrated data back to Firebase
                    try {
                        await this.saveUserData(userId, preferences)
                    } catch (saveError) {
                        console.warn('Failed to save migrated data (offline?):', saveError)
                    }
                }

                return preferences
            } else {
                // Create default user document
                const defaultPreferences: UserPreferences = {
                    watchlist: [],
                    ratings: [],
                    userLists: UserListsService.initializeDefaultLists(),
                    lastActive: Date.now(),
                }
                // Try to save, but don't fail if offline
                try {
                    await this.saveUserData(userId, defaultPreferences)
                } catch (saveError) {
                    console.warn('Failed to create user document (offline?):', saveError)
                }
                return defaultPreferences
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error)

            // Check if error is due to offline status
            if (errorMessage.includes('offline') || errorMessage.includes('network')) {
                console.warn('Firebase is offline, using default preferences:', errorMessage)
            } else {
                console.error('Failed to load user data:', error)
            }

            // Return default preferences if Firebase fails
            return {
                watchlist: [],
                ratings: [],
                userLists: UserListsService.initializeDefaultLists(),
                lastActive: Date.now(),
            }
        }
    }

    // Save user data for authenticated users
    static async saveUserData(userId: string, preferences: UserPreferences): Promise<void> {
        try {
            const dataToSave = {
                ...preferences,
                lastActive: Date.now(),
            }
            await setDoc(doc(db, 'users', userId), dataToSave, { merge: true })
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error)

            // Check if error is due to offline status
            if (errorMessage.includes('offline') || errorMessage.includes('network')) {
                console.warn('Firebase is offline, data will sync when online:', errorMessage)
                // Don't throw error for offline issues to prevent app crashes
                return
            } else {
                console.error('Failed to save user data to Firebase:', error)
                throw error
            }
        }
    }

    // Migrate guest data to authenticated user
    static async migrateGuestToAuth(
        guestPreferences: UserPreferences,
        userId: string
    ): Promise<void> {
        try {
            // Load existing user data
            const existingData = await this.loadUserData(userId)

            // Merge guest data with existing data (guest data takes precedence for newer items)
            const mergedPreferences: UserPreferences = {
                watchlist: this.mergeWatchlists(existingData.watchlist, guestPreferences.watchlist),
                ratings: this.mergeRatings(existingData.ratings, guestPreferences.ratings),
                userLists: guestPreferences.userLists || UserListsService.initializeDefaultLists(),
                lastActive: Date.now(),
            }

            // Save merged data to Firebase
            await this.saveUserData(userId, mergedPreferences)

            // Clear guest data since it's been migrated
            if (typeof window !== 'undefined') {
                localStorage.removeItem(GUEST_STORAGE_KEY)
                localStorage.removeItem(GUEST_ID_KEY)
            }
        } catch (error) {
            console.error('Failed to migrate guest data:', error)
            throw error
        }
    }

    // Helper: Merge watchlists, avoiding duplicates
    private static mergeWatchlists(existing: Content[], guest: Content[]): Content[] {
        const merged = [...existing]

        guest.forEach((guestItem) => {
            const exists = existing.some((item) => item.id === guestItem.id)
            if (!exists) {
                merged.push(guestItem)
            }
        })

        return merged
    }

    // Helper: Merge ratings, guest data takes precedence for same content
    private static mergeRatings(existing: UserRating[], guest: UserRating[]): UserRating[] {
        const merged = [...existing]

        guest.forEach((guestRating) => {
            const existingIndex = merged.findIndex((r) => r.contentId === guestRating.contentId)

            if (existingIndex >= 0) {
                // Replace if guest rating is newer
                if (guestRating.timestamp > merged[existingIndex].timestamp) {
                    merged[existingIndex] = guestRating
                }
            } else {
                // Add new rating
                merged.push(guestRating)
            }
        })

        return merged
    }

    // Clear all guest data
    static clearGuestData(): void {
        if (typeof window !== 'undefined') {
            localStorage.removeItem(GUEST_STORAGE_KEY)
            localStorage.removeItem(GUEST_ID_KEY)
        }
    }
}

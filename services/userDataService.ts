import { Content } from '../typings'
import { UserPreferences } from '../types/userData'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { guestError, guestLog, authError, firebaseWarn } from '../utils/debugLogger'

// DEPRECATED - This service is being phased out in favor of:
// - AuthStorageService for authenticated users
// - GuestStorageService for guest users
// Keeping minimal compatibility during migration

const GUEST_STORAGE_KEY = 'nettrailer_guest_data'
const GUEST_ID_KEY = 'nettrailer_guest_id'

export class UserDataService {
    // Default user preferences values
    private static DEFAULT_PREFERENCES = {
        autoMute: false,
        defaultVolume: 50,
        childSafetyMode: false,
    }

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
            return {
                likedMovies: [],
                hiddenMovies: [],
                defaultWatchlist: [],
                userCreatedWatchlists: [],
                lastActive: Date.now(),
                ...this.DEFAULT_PREFERENCES,
            }
        }

        try {
            const data = localStorage.getItem(GUEST_STORAGE_KEY)
            if (!data) {
                return {
                    likedMovies: [],
                    hiddenMovies: [],
                    defaultWatchlist: [],
                    userCreatedWatchlists: [],
                    lastActive: Date.now(),
                    ...this.DEFAULT_PREFERENCES,
                }
            }

            const parsedData = JSON.parse(data)

            // Return new schema format
            return {
                likedMovies: parsedData.likedMovies || [],
                hiddenMovies: parsedData.hiddenMovies || [],
                defaultWatchlist: parsedData.defaultWatchlist || [],
                userCreatedWatchlists: parsedData.userCreatedWatchlists || [],
                lastActive: parsedData.lastActive || Date.now(),
                autoMute: parsedData.autoMute ?? this.DEFAULT_PREFERENCES.autoMute,
                defaultVolume: parsedData.defaultVolume ?? this.DEFAULT_PREFERENCES.defaultVolume,
                childSafetyMode:
                    parsedData.childSafetyMode ?? this.DEFAULT_PREFERENCES.childSafetyMode,
            }
        } catch (error) {
            guestError('Failed to load guest data:', error)
            return {
                likedMovies: [],
                hiddenMovies: [],
                defaultWatchlist: [],
                userCreatedWatchlists: [],
                lastActive: Date.now(),
                ...this.DEFAULT_PREFERENCES,
            }
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
            guestError('Failed to save guest data:', error)
        }
    }

    // Add to liked movies (mutual exclusion with hidden)
    static addLikedMovie(preferences: UserPreferences, content: Content): UserPreferences {
        const hiddenMovies = preferences.hiddenMovies.filter((m) => m.id !== content.id)
        const isAlreadyLiked = preferences.likedMovies.some((m) => m.id === content.id)
        const likedMovies = isAlreadyLiked
            ? preferences.likedMovies
            : [...preferences.likedMovies, content]

        return {
            ...preferences,
            likedMovies,
            hiddenMovies,
        }
    }

    // Remove from liked movies
    static removeLikedMovie(preferences: UserPreferences, contentId: number): UserPreferences {
        return {
            ...preferences,
            likedMovies: preferences.likedMovies.filter((m) => m.id !== contentId),
        }
    }

    // Add to hidden movies (mutual exclusion with liked)
    static addHiddenMovie(preferences: UserPreferences, content: Content): UserPreferences {
        const likedMovies = preferences.likedMovies.filter((m) => m.id !== content.id)
        const isAlreadyHidden = preferences.hiddenMovies.some((m) => m.id === content.id)
        const hiddenMovies = isAlreadyHidden
            ? preferences.hiddenMovies
            : [...preferences.hiddenMovies, content]

        return {
            ...preferences,
            likedMovies,
            hiddenMovies,
        }
    }

    // Remove from hidden movies
    static removeHiddenMovie(preferences: UserPreferences, contentId: number): UserPreferences {
        return {
            ...preferences,
            hiddenMovies: preferences.hiddenMovies.filter((m) => m.id !== contentId),
        }
    }

    // Check if content is liked
    static isLiked(preferences: UserPreferences, contentId: number): boolean {
        return preferences.likedMovies.some((m) => m.id === contentId)
    }

    // Check if content is hidden
    static isHidden(preferences: UserPreferences, contentId: number): boolean {
        return preferences.hiddenMovies.some((m) => m.id === contentId)
    }

    // Add to default watchlist
    static addToWatchlist(preferences: UserPreferences, content: Content): UserPreferences {
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
    static removeFromWatchlist(preferences: UserPreferences, contentId: number): UserPreferences {
        return {
            ...preferences,
            defaultWatchlist: preferences.defaultWatchlist.filter((item) => item.id !== contentId),
        }
    }

    // Check if content is in default watchlist
    static isInWatchlist(preferences: UserPreferences, contentId: number): boolean {
        return preferences.defaultWatchlist.some((item) => item.id === contentId)
    }

    // Load user data for authenticated users
    static async loadUserData(userId: string): Promise<UserPreferences> {
        try {
            const userDoc = await getDoc(doc(db, 'users', userId))

            if (userDoc.exists()) {
                const data = userDoc.data()
                return {
                    likedMovies: data.likedMovies || [],
                    hiddenMovies: data.hiddenMovies || [],
                    defaultWatchlist: data.defaultWatchlist || [],
                    userCreatedWatchlists: data.userCreatedWatchlists || [],
                    lastActive: data.lastActive || Date.now(),
                    autoMute: data.autoMute ?? this.DEFAULT_PREFERENCES.autoMute,
                    defaultVolume: data.defaultVolume ?? this.DEFAULT_PREFERENCES.defaultVolume,
                    childSafetyMode:
                        data.childSafetyMode ?? this.DEFAULT_PREFERENCES.childSafetyMode,
                }
            } else {
                // Create default user document
                const defaultPreferences: UserPreferences = {
                    likedMovies: [],
                    hiddenMovies: [],
                    defaultWatchlist: [],
                    userCreatedWatchlists: [],
                    lastActive: Date.now(),
                    ...this.DEFAULT_PREFERENCES,
                }
                // Try to save, but don't fail if offline
                try {
                    await this.saveUserData(userId, defaultPreferences)
                } catch (saveError) {
                    firebaseWarn('Failed to create user document (offline?):', saveError)
                }
                return defaultPreferences
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error)

            // Check if error is due to offline status
            if (errorMessage.includes('offline') || errorMessage.includes('network')) {
                firebaseWarn('Firebase is offline, using default preferences:', errorMessage)
            } else {
                authError('Failed to load user data:', error)
            }

            // Return default preferences if Firebase fails
            return {
                likedMovies: [],
                hiddenMovies: [],
                defaultWatchlist: [],
                userCreatedWatchlists: [],
                lastActive: Date.now(),
                ...this.DEFAULT_PREFERENCES,
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
                firebaseWarn('Firebase is offline, data will sync when online:', errorMessage)
                // Don't throw error for offline issues to prevent app crashes
                return
            } else {
                authError('Failed to save user data to Firebase:', error)
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
                likedMovies: this.mergeContentArrays(
                    existingData.likedMovies,
                    guestPreferences.likedMovies
                ),
                hiddenMovies: this.mergeContentArrays(
                    existingData.hiddenMovies,
                    guestPreferences.hiddenMovies
                ),
                defaultWatchlist: this.mergeContentArrays(
                    existingData.defaultWatchlist,
                    guestPreferences.defaultWatchlist
                ),
                userCreatedWatchlists: guestPreferences.userCreatedWatchlists || [],
                lastActive: Date.now(),
                // Prefer guest preferences for playback and content filtering settings
                autoMute: guestPreferences.autoMute ?? existingData.autoMute,
                defaultVolume: guestPreferences.defaultVolume ?? existingData.defaultVolume,
                childSafetyMode: guestPreferences.childSafetyMode ?? existingData.childSafetyMode,
            }

            // Save merged data to Firebase
            await this.saveUserData(userId, mergedPreferences)

            // Clear guest data since it's been migrated
            if (typeof window !== 'undefined') {
                localStorage.removeItem(GUEST_STORAGE_KEY)
                localStorage.removeItem(GUEST_ID_KEY)
            }
        } catch (error) {
            authError('Failed to migrate guest data:', error)
            throw error
        }
    }

    // Helper: Merge content arrays, avoiding duplicates
    private static mergeContentArrays(existing: Content[], guest: Content[]): Content[] {
        const merged = [...existing]

        guest.forEach((guestItem) => {
            const exists = existing.some((item) => item.id === guestItem.id)
            if (!exists) {
                merged.push(guestItem)
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

import { Content } from '../typings'
import { UserRating, UserPreferences, UserSession } from '../atoms/userDataAtom'

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
            return { watchlist: [], ratings: [], lastActive: Date.now() }
        }

        try {
            const data = localStorage.getItem(GUEST_STORAGE_KEY)
            if (!data) {
                return { watchlist: [], ratings: [], lastActive: Date.now() }
            }
            return JSON.parse(data)
        } catch (error) {
            console.error('Failed to load guest data:', error)
            return { watchlist: [], ratings: [], lastActive: Date.now() }
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
        rating: 'liked' | 'disliked' | 'loved'
    ): UserPreferences {
        const existingRatingIndex = preferences.ratings.findIndex(r => r.contentId === contentId)

        const newRating: UserRating = {
            contentId,
            rating,
            timestamp: Date.now(),
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
            ratings: preferences.ratings.filter(r => r.contentId !== contentId),
        }
    }

    // Add to watchlist
    static addToWatchlist(preferences: UserPreferences, content: Content): UserPreferences {
        const isAlreadyInWatchlist = preferences.watchlist.some(item => item.id === content.id)
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
            watchlist: preferences.watchlist.filter(item => item.id !== contentId),
        }
    }

    // Get rating for specific content
    static getRating(preferences: UserPreferences, contentId: number): UserRating | null {
        return preferences.ratings.find(r => r.contentId === contentId) || null
    }

    // Check if content is in watchlist
    static isInWatchlist(preferences: UserPreferences, contentId: number): boolean {
        return preferences.watchlist.some(item => item.id === contentId)
    }

    // Migrate guest data to authenticated user
    static async migrateGuestToAuth(guestPreferences: UserPreferences, userId: string): Promise<void> {
        // TODO: Implement Firebase Firestore integration
        // For now, we'll clear guest data since it's been migrated
        if (typeof window !== 'undefined') {
            localStorage.removeItem(GUEST_STORAGE_KEY)
            localStorage.removeItem(GUEST_ID_KEY)
        }

        console.log('Guest data migrated for user:', userId, guestPreferences)
    }

    // Clear all guest data
    static clearGuestData(): void {
        if (typeof window !== 'undefined') {
            localStorage.removeItem(GUEST_STORAGE_KEY)
            localStorage.removeItem(GUEST_ID_KEY)
        }
    }
}
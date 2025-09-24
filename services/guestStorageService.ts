import { Content } from '../typings'
import { GuestPreferences, GuestRating } from '../atoms/guestSessionAtom'
import { UserListsService } from './userListsService'

export class GuestStorageService {
    private static getStorageKey(guestId: string): string {
        return `nettrailer_guest_data_${guestId}`
    }

    private static getGuestIdKey(): string {
        return 'nettrailer_guest_id'
    }

    // Generate a unique guest ID
    static generateGuestId(): string {
        return `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }

    // Get or create guest ID
    static getGuestId(): string {
        if (typeof window === 'undefined') return ''

        let guestId = localStorage.getItem(this.getGuestIdKey())
        if (!guestId) {
            guestId = this.generateGuestId()
            localStorage.setItem(this.getGuestIdKey(), guestId)
        }
        return guestId
    }

    // Load guest data
    static loadGuestData(guestId: string): GuestPreferences {
        if (typeof window === 'undefined') {
            return this.getDefaultPreferences()
        }

        try {
            const data = localStorage.getItem(this.getStorageKey(guestId))
            if (!data) {
                return this.getDefaultPreferences()
            }

            const parsedData = JSON.parse(data) as GuestPreferences

            // Migrate old data structure if needed
            if (!parsedData.userLists) {
                return UserListsService.migrateOldPreferences(parsedData as any) as GuestPreferences
            }

            return parsedData
        } catch (error) {
            console.error(`Failed to load guest data for ${guestId}:`, error)
            return this.getDefaultPreferences()
        }
    }

    // Save guest data
    static saveGuestData(guestId: string, preferences: GuestPreferences): void {
        if (typeof window === 'undefined') return

        try {
            const dataToSave = {
                ...preferences,
                lastActive: Date.now(),
            }
            localStorage.setItem(this.getStorageKey(guestId), JSON.stringify(dataToSave))
        } catch (error) {
            console.error(`Failed to save guest data for ${guestId}:`, error)
        }
    }

    // Check if guest has data
    static hasGuestData(guestId: string): boolean {
        if (typeof window === 'undefined') return false

        const data = localStorage.getItem(this.getStorageKey(guestId))
        if (!data) return false

        try {
            const parsed = JSON.parse(data) as GuestPreferences
            // Check if there's meaningful data (not just defaults)
            return (
                parsed.watchlist.length > 0 ||
                parsed.ratings.length > 0 ||
                (parsed.userLists && parsed.userLists.lists.some((list) => list.items.length > 0))
            )
        } catch {
            return false
        }
    }

    // Clear specific guest data
    static clearGuestData(guestId: string): void {
        if (typeof window === 'undefined') return

        localStorage.removeItem(this.getStorageKey(guestId))

        // Also remove guest ID if it matches
        const currentGuestId = localStorage.getItem(this.getGuestIdKey())
        if (currentGuestId === guestId) {
            localStorage.removeItem(this.getGuestIdKey())
        }
    }

    // Clear all guest data (for cleanup)
    static clearAllGuestData(): void {
        if (typeof window === 'undefined') return

        // Get current guest ID to clear its data
        const guestId = localStorage.getItem(this.getGuestIdKey())
        if (guestId) {
            localStorage.removeItem(this.getStorageKey(guestId))
        }

        // Clear guest ID
        localStorage.removeItem(this.getGuestIdKey())

        // Clear legacy storage keys
        localStorage.removeItem('nettrailer_guest_data')
    }

    // Add or update a rating
    static addRating(
        preferences: GuestPreferences,
        contentId: number,
        rating: 'liked' | 'disliked',
        content?: Content
    ): GuestPreferences {
        const existingRatingIndex = preferences.ratings.findIndex((r) => r.contentId === contentId)

        const newRating: GuestRating = {
            contentId,
            rating,
            timestamp: Date.now(),
            content,
        }

        let updatedRatings: GuestRating[]
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
    static removeRating(preferences: GuestPreferences, contentId: number): GuestPreferences {
        return {
            ...preferences,
            ratings: preferences.ratings.filter((r) => r.contentId !== contentId),
        }
    }

    // Add to watchlist
    static addToWatchlist(preferences: GuestPreferences, content: Content): GuestPreferences {
        const isAlreadyInWatchlist = preferences.watchlist.some((item) => item.id === content.id)
        if (isAlreadyInWatchlist) return preferences

        return {
            ...preferences,
            watchlist: [...preferences.watchlist, content],
        }
    }

    // Remove from watchlist
    static removeFromWatchlist(preferences: GuestPreferences, contentId: number): GuestPreferences {
        return {
            ...preferences,
            watchlist: preferences.watchlist.filter((item) => item.id !== contentId),
        }
    }

    // Get rating for specific content
    static getRating(preferences: GuestPreferences, contentId: number): GuestRating | null {
        return preferences.ratings.find((r) => r.contentId === contentId) || null
    }

    // Check if content is in watchlist
    static isInWatchlist(preferences: GuestPreferences, contentId: number): boolean {
        return preferences.watchlist.some((item) => item.id === contentId)
    }

    // Get default preferences
    private static getDefaultPreferences(): GuestPreferences {
        return {
            watchlist: [],
            ratings: [],
            userLists: UserListsService.initializeDefaultLists(),
            lastActive: Date.now(),
        }
    }

    // Get guest data overview for debugging
    static getGuestDataOverview(guestId: string): {
        guestId: string
        hasData: boolean
        watchlistCount: number
        ratingsCount: number
        listsCount: number
        lastActive?: number
    } {
        const preferences = this.loadGuestData(guestId)
        return {
            guestId,
            hasData: this.hasGuestData(guestId),
            watchlistCount: preferences.watchlist.length,
            ratingsCount: preferences.ratings.length,
            listsCount: preferences.userLists.lists.length,
            lastActive: preferences.lastActive,
        }
    }

    // List all guest sessions (for debugging)
    static getAllGuestSessions(): string[] {
        if (typeof window === 'undefined') return []

        const guestSessions: string[] = []

        // Check localStorage for guest data keys
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i)
            if (key && key.startsWith('nettrailer_guest_data_')) {
                const guestId = key.replace('nettrailer_guest_data_', '')
                guestSessions.push(guestId)
            }
        }

        return guestSessions
    }

    // Clear current guest's data (reset to defaults but keep session)
    static clearCurrentGuestData(guestId: string): GuestPreferences {
        const defaultPrefs = this.getDefaultPreferences()
        this.saveGuestData(guestId, defaultPrefs)
        console.log(`🧹 Guest data cleared for ${guestId}`)
        return defaultPrefs
    }

    // Get data summary for confirmation dialogs
    static getDataSummary(guestId: string): {
        watchlistCount: number
        ratingsCount: number
        listsCount: number
        totalItems: number
        isEmpty: boolean
    } {
        const preferences = this.loadGuestData(guestId)
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
        }
    }

    // Export guest data (for potential migration or backup)
    static exportGuestData(guestId: string): {
        guestId: string
        exportDate: string
        data: GuestPreferences
    } {
        const preferences = this.loadGuestData(guestId)
        return {
            guestId,
            exportDate: new Date().toISOString(),
            data: preferences,
        }
    }

    // Import guest data (from export)
    static importGuestData(
        guestId: string,
        exportedData: {
            guestId: string
            exportDate: string
            data: GuestPreferences
        }
    ): boolean {
        try {
            this.saveGuestData(guestId, exportedData.data)
            console.log(
                `📥 Guest data imported for ${guestId} from export dated ${exportedData.exportDate}`
            )
            return true
        } catch (error) {
            console.error('Failed to import guest data:', error)
            return false
        }
    }
}

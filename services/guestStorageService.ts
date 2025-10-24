import { Content } from '../typings'
import { GuestPreferences } from '../atoms/guestSessionAtom'

// NEW SCHEMA - v2 with localStorage versioning
const STORAGE_VERSION = 2

export class GuestStorageService {
    private static getStorageKey(guestId: string): string {
        return `nettrailer_guest_data_v${STORAGE_VERSION}_${guestId}`
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

    // Create a fresh guest session (for complete data isolation)
    static createFreshGuestSession(): string {
        const guestId = this.generateGuestId()
        localStorage.setItem(this.getGuestIdKey(), guestId)

        // Initialize with empty data
        const freshPreferences = this.getDefaultPreferences()
        this.saveGuestData(guestId, freshPreferences)

        return guestId
    }

    // Load guest data
    static loadGuestData(guestId: string): GuestPreferences {
        console.log('🔍 [GuestStorageService] loadGuestData called:', { guestId })

        if (typeof window === 'undefined') {
            console.log('⚠️ [GuestStorageService] SSR environment, returning defaults')
            return this.getDefaultPreferences()
        }

        try {
            // Clear old v1 guest data on first load
            this.clearOldV1Data()

            const storageKey = this.getStorageKey(guestId)
            const data = localStorage.getItem(storageKey)

            console.log('🔍 [GuestStorageService] Reading from localStorage:', {
                key: storageKey,
                hasData: !!data,
                dataLength: data?.length || 0,
            })

            if (!data) {
                console.log('⚠️ [GuestStorageService] No data found, returning defaults')
                return this.getDefaultPreferences()
            }

            const parsedData = JSON.parse(data) as GuestPreferences

            console.log('✅ [GuestStorageService] Successfully loaded data:', {
                watchlistCount: parsedData.defaultWatchlist?.length || 0,
                likedCount: parsedData.likedMovies?.length || 0,
                hiddenCount: parsedData.hiddenMovies?.length || 0,
                autoMute: parsedData.autoMute,
                defaultVolume: parsedData.defaultVolume,
                childSafetyMode: parsedData.childSafetyMode,
            })

            // NEW SCHEMA - No migration needed
            return {
                likedMovies: parsedData.likedMovies || [],
                hiddenMovies: parsedData.hiddenMovies || [],
                defaultWatchlist: parsedData.defaultWatchlist || [],
                userCreatedWatchlists: parsedData.userCreatedWatchlists || [],
                lastActive: parsedData.lastActive || Date.now(),
                autoMute: parsedData.autoMute ?? true,
                defaultVolume: parsedData.defaultVolume ?? 50,
                childSafetyMode: parsedData.childSafetyMode ?? false,
            }
        } catch (error) {
            console.error(
                `❌ [GuestStorageService] Failed to load guest data for ${guestId}:`,
                error
            )
            return this.getDefaultPreferences()
        }
    }

    // Clear old v1 localStorage keys
    private static clearOldV1Data(): void {
        if (typeof window === 'undefined') return

        // Clear old v1 guest data keys
        Object.keys(localStorage).forEach((key) => {
            if (key.startsWith('nettrailer_guest_data_') && !key.includes('_v2_')) {
                localStorage.removeItem(key)
                console.log('🧹 Cleared old v1 guest data:', key)
            }
        })
    }

    // Save guest data
    static saveGuestData(guestId: string, preferences: GuestPreferences): void {
        console.log('💾 [GuestStorageService] saveGuestData called:', {
            guestId,
            preferences: {
                watchlistCount: preferences.defaultWatchlist?.length || 0,
                likedCount: preferences.likedMovies?.length || 0,
                autoMute: preferences.autoMute,
                defaultVolume: preferences.defaultVolume,
                childSafetyMode: preferences.childSafetyMode,
            },
        })

        if (typeof window === 'undefined') {
            console.log('⚠️ [GuestStorageService] SSR environment, cannot save')
            return
        }

        try {
            const dataToSave = {
                ...preferences,
                lastActive: Date.now(),
            }

            const storageKey = this.getStorageKey(guestId)
            const jsonData = JSON.stringify(dataToSave)

            localStorage.setItem(storageKey, jsonData)

            console.log('✅ [GuestStorageService] Successfully saved to localStorage:', {
                key: storageKey,
                dataSize: jsonData.length,
                saved: {
                    autoMute: dataToSave.autoMute,
                    defaultVolume: dataToSave.defaultVolume,
                    childSafetyMode: dataToSave.childSafetyMode,
                },
            })

            // Verify it was saved correctly
            const verification = localStorage.getItem(storageKey)
            if (verification) {
                const parsed = JSON.parse(verification)
                console.log('✅ [GuestStorageService] Verification - data in localStorage:', {
                    autoMute: parsed.autoMute,
                    defaultVolume: parsed.defaultVolume,
                    childSafetyMode: parsed.childSafetyMode,
                })
            } else {
                console.error(
                    '❌ [GuestStorageService] Verification FAILED - data not in localStorage!'
                )
            }
        } catch (error) {
            console.error(
                `❌ [GuestStorageService] Failed to save guest data for ${guestId}:`,
                error
            )
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
                parsed.likedMovies.length > 0 ||
                parsed.hiddenMovies.length > 0 ||
                parsed.defaultWatchlist.length > 0 ||
                parsed.userCreatedWatchlists.some((list) => list.items.length > 0)
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

    // Add to liked movies (mutual exclusion with hidden)
    static addLikedMovie(preferences: GuestPreferences, content: Content): GuestPreferences {
        // Remove from hidden if exists (mutual exclusion)
        const hiddenMovies = preferences.hiddenMovies.filter((m) => m.id !== content.id)

        // Add to liked if not already there
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
    static removeLikedMovie(preferences: GuestPreferences, contentId: number): GuestPreferences {
        return {
            ...preferences,
            likedMovies: preferences.likedMovies.filter((m) => m.id !== contentId),
        }
    }

    // Add to hidden movies (mutual exclusion with liked)
    static addHiddenMovie(preferences: GuestPreferences, content: Content): GuestPreferences {
        // Remove from liked if exists (mutual exclusion)
        const likedMovies = preferences.likedMovies.filter((m) => m.id !== content.id)

        // Add to hidden if not already there
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
    static removeHiddenMovie(preferences: GuestPreferences, contentId: number): GuestPreferences {
        return {
            ...preferences,
            hiddenMovies: preferences.hiddenMovies.filter((m) => m.id !== contentId),
        }
    }

    // Check if content is liked
    static isLiked(preferences: GuestPreferences, contentId: number): boolean {
        return preferences.likedMovies.some((m) => m.id === contentId)
    }

    // Check if content is hidden
    static isHidden(preferences: GuestPreferences, contentId: number): boolean {
        return preferences.hiddenMovies.some((m) => m.id === contentId)
    }

    // Add to default watchlist
    static addToWatchlist(preferences: GuestPreferences, content: Content): GuestPreferences {
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
    static removeFromWatchlist(preferences: GuestPreferences, contentId: number): GuestPreferences {
        return {
            ...preferences,
            defaultWatchlist: preferences.defaultWatchlist.filter((item) => item.id !== contentId),
        }
    }

    // Check if content is in default watchlist
    static isInWatchlist(preferences: GuestPreferences, contentId: number): boolean {
        return preferences.defaultWatchlist.some((item) => item.id === contentId)
    }

    // Get default preferences
    private static getDefaultPreferences(): GuestPreferences {
        return {
            likedMovies: [],
            hiddenMovies: [],
            defaultWatchlist: [],
            userCreatedWatchlists: [],
            lastActive: Date.now(),
            autoMute: true, // Default to muted for better UX
            defaultVolume: 50, // Default to 50%
            childSafetyMode: false, // Default to off
        }
    }

    // Get guest data overview for debugging
    static getGuestDataOverview(guestId: string): {
        guestId: string
        hasData: boolean
        watchlistCount: number
        likedCount: number
        hiddenCount: number
        listsCount: number
        lastActive?: number
    } {
        const preferences = this.loadGuestData(guestId)
        return {
            guestId,
            hasData: this.hasGuestData(guestId),
            watchlistCount: preferences.defaultWatchlist.length,
            likedCount: preferences.likedMovies.length,
            hiddenCount: preferences.hiddenMovies.length,
            listsCount: preferences.userCreatedWatchlists.length,
            lastActive: preferences.lastActive,
        }
    }

    // List all guest sessions (for debugging)
    static getAllGuestSessions(): string[] {
        if (typeof window === 'undefined') return []

        const guestSessions: string[] = []
        const prefix = `nettrailer_guest_data_v${STORAGE_VERSION}_`

        // Check localStorage for v2 guest data keys
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i)
            if (key && key.startsWith(prefix)) {
                const guestId = key.replace(prefix, '')
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
        likedCount: number
        hiddenCount: number
        listsCount: number
        totalItems: number
        isEmpty: boolean
    } {
        const preferences = this.loadGuestData(guestId)
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

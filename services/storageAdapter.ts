import { UserPreferences } from '../types/shared'

/**
 * Storage adapter interface for user data persistence
 *
 * This interface abstracts the storage backend (Firebase vs localStorage)
 * to enable a unified store implementation that works for both
 * authenticated and guest users.
 */
export interface StorageAdapter {
    /**
     * Load user data from storage
     * @param id - User ID or Guest ID
     * @returns Promise resolving to user preferences
     */
    load(id: string): Promise<UserPreferences>

    /**
     * Save user data to storage
     * @param id - User ID or Guest ID
     * @param data - User preferences to save
     */
    save(id: string, data: UserPreferences): Promise<void>

    /**
     * Clear user data (reset to defaults)
     * @param id - User ID or Guest ID
     */
    clear(id: string): Promise<UserPreferences>

    /**
     * Check if the adapter operates synchronously
     * Used to determine whether to set syncStatus in the store
     */
    readonly isAsync: boolean

    /**
     * Name of the adapter (for logging)
     */
    readonly name: string
}

/**
 * Logger interface for storage adapters
 * Allows each adapter to use its own logger (authLog, guestLog)
 */
export interface StorageLogger {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    log: (...args: any[]) => void
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    error: (...args: any[]) => void
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    warn: (...args: any[]) => void
}

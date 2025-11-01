import { StorageAdapter, StorageLogger } from './storageAdapter'
import { UserPreferences } from '../types/shared'
import { GuestStorageService } from './guestStorageService'

/**
 * LocalStorage adapter for guest users
 *
 * Wraps GuestStorageService to conform to the StorageAdapter interface.
 * This enables a unified store implementation that works with both
 * Firebase (async) and localStorage (sync) backends.
 *
 * Note: Methods are async to match the interface, but operations
 * are synchronous under the hood (isAsync = false).
 */
export class LocalStorageAdapter implements StorageAdapter {
    readonly isAsync = false
    readonly name = 'LocalStorage'

    constructor(private logger: StorageLogger) {}

    async load(guestId: string): Promise<UserPreferences> {
        this.logger.log(`[${this.name}Adapter] Loading data for guest:`, guestId)
        return GuestStorageService.loadGuestData(guestId)
    }

    async save(guestId: string, data: UserPreferences): Promise<void> {
        this.logger.log(`[${this.name}Adapter] Saving data for guest:`, guestId)
        GuestStorageService.saveGuestData(guestId, data)
    }

    async clear(guestId: string): Promise<UserPreferences> {
        this.logger.log(`[${this.name}Adapter] Clearing data for guest:`, guestId)
        return GuestStorageService.clearCurrentGuestData(guestId)
    }
}

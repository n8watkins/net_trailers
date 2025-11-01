import { StorageAdapter, StorageLogger } from './storageAdapter'
import { UserPreferences } from '../types/shared'
import { AuthStorageService } from './authStorageService'

/**
 * Firebase storage adapter for authenticated users
 *
 * Wraps AuthStorageService to conform to the StorageAdapter interface.
 * This enables a unified store implementation that works with both
 * Firebase (async) and localStorage (sync) backends.
 */
export class FirebaseStorageAdapter implements StorageAdapter {
    readonly isAsync = true
    readonly name = 'Firebase'

    constructor(private logger: StorageLogger) {}

    async load(userId: string): Promise<UserPreferences> {
        this.logger.log(`[${this.name}Adapter] Loading data for user:`, userId)
        return await AuthStorageService.loadUserData(userId)
    }

    async save(userId: string, data: UserPreferences): Promise<void> {
        this.logger.log(`[${this.name}Adapter] Saving data for user:`, userId)
        await AuthStorageService.saveUserData(userId, data)
    }

    async clear(userId: string): Promise<UserPreferences> {
        this.logger.log(`[${this.name}Adapter] Clearing data for user:`, userId)
        return await AuthStorageService.clearUserData(userId)
    }
}

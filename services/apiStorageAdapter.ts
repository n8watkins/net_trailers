import { StorageAdapter, StorageLogger } from './storageAdapter'
import { UserPreferences } from '../types/shared'
import { AuthStorageService } from './authStorageService'

/**
 * API-backed storage adapter for authenticated users.
 *
 * Wraps AuthStorageService (which talks to /api/user/preferences → Turso) to
 * conform to the StorageAdapter interface, mirroring the guest LocalStorageAdapter
 * so the unified user store works for both backends.
 */
export class ApiStorageAdapter implements StorageAdapter {
    readonly isAsync = true
    readonly name = 'Turso'

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

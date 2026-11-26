/**
 * When the server keeps a PIN-locked Child Safety Mode on (it answers
 * `childSafetyKept`), the signed-in store shows the mode on again, and a call
 * that tried to switch it off fails with ChildSafetyKeptError so the settings
 * screen can ask for the PIN. The answer is read by AuthStorageService.
 */

import { ChildSafetyKeptError } from '../../lib/childSafetyKept'
import { AuthStorageService } from '../../services/authStorageService'
import type { SaveResult, StorageAdapter } from '../../services/storageAdapter'
import { createUserStore } from '../../stores/createUserStore'
import type { UserPreferences } from '../../types/shared'

const authenticatedFetch = jest.fn()
jest.mock('../../lib/authenticatedFetch', () => ({
    authenticatedFetch: (...args: unknown[]) => authenticatedFetch(...args),
}))
jest.mock('../../stores/cacheStore', () => ({
    useCacheStore: { getState: () => ({ clearCache: jest.fn() }) },
}))

const logger = { log: jest.fn(), error: jest.fn(), warn: jest.fn() }

function storeAnswering(result: SaveResult) {
    const adapter: StorageAdapter = {
        isAsync: true,
        name: 'Test',
        load: jest.fn(),
        clear: jest.fn(),
        save: jest.fn(async () => result),
    }
    const store = createUserStore({
        adapter,
        logger,
        idField: 'userId',
        trackingContext: 'TestStore',
        enableFirebaseSync: false,
        enableGuestFeatures: false,
    })
    store.setState({ userId: 'u1', childSafetyMode: true } as never)
    return store
}

describe('a save the server answers with childSafetyKept', () => {
    it('puts the mode back on and tells the caller that switched it off', async () => {
        const store = storeAnswering({ childSafetyKept: true })
        await expect(
            store.getState().updatePreferences({ childSafetyMode: false })
        ).rejects.toBeInstanceOf(ChildSafetyKeptError)
        expect(store.getState().childSafetyMode).toBe(true)
    })

    it('quietly corrects a stale "off" sent along with another change', async () => {
        const store = storeAnswering({ childSafetyKept: true })
        store.setState({ childSafetyMode: false } as never)
        await expect(
            store.getState().updatePreferences({ autoMute: false })
        ).resolves.toBeUndefined()
        expect(store.getState().childSafetyMode).toBe(true)
        expect(store.getState().autoMute).toBe(false)
    })

    it('lets an accepted switch-off stand', async () => {
        const store = storeAnswering({ childSafetyKept: false })
        await store.getState().updatePreferences({ childSafetyMode: false })
        expect(store.getState().childSafetyMode).toBe(false)
    })
})

describe('AuthStorageService.saveUserData', () => {
    it('reports what the server kept', async () => {
        authenticatedFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ success: true, childSafetyMode: true, childSafetyKept: true }),
        })
        const result = await AuthStorageService.saveUserData('u1', {
            childSafetyMode: false,
        } as UserPreferences)
        expect(result).toEqual({ childSafetyKept: true })

        authenticatedFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ success: true }),
        })
        expect(await AuthStorageService.saveUserData('u1', {} as UserPreferences)).toEqual({
            childSafetyKept: false,
        })
    })
})

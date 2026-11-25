/**
 * "Reset to defaults" brings back a built-in genre collection the user deleted
 * (accounts could delete one before the editor hid Delete for them), resets the
 * ones still there, leaves the user's own collections alone and never adds a
 * built-in twice. Guest storage is exercised end to end through localStorage;
 * signed-in storage runs the same store code (e2e/collections.spec.ts).
 */

import { ALL_SYSTEM_COLLECTIONS } from '../../constants/systemCollections'
import { UserListsService } from '../../services/userListsService'
import { useGuestStore } from '../../stores/guestStore'
import type { UserList } from '../../types/collections'

jest.mock('../../utils/debugLogger', () => ({
    guestLog: jest.fn(),
    guestError: jest.fn(),
}))

const builtInIds = ALL_SYSTEM_COLLECTIONS.map((c) => c.id)
const ids = () => useGuestStore.getState().userCreatedWatchlists.map((l) => l.id)
const byId = (id: string) => useGuestStore.getState().userCreatedWatchlists.find((l) => l.id === id)

/** What a page reload does: read the guest's data back from localStorage. */
async function reload(guestId: string) {
    useGuestStore.setState({ userCreatedWatchlists: [] })
    await useGuestStore.getState().syncFromLocalStorage(guestId)
}

describe('resetBuiltInCollections (guest storage)', () => {
    const guestId = 'guest_reset_test'

    beforeEach(async () => {
        localStorage.clear()
        await useGuestStore.getState().syncFromLocalStorage(guestId) // seeds the built-ins
    })

    it('restores a deleted built-in row with its defaults, and it stays after a reload', async () => {
        const mine = await useGuestStore.getState().createList({
            name: 'My picks',
            collectionType: 'manual',
        } as never)
        await useGuestStore.getState().updateList('system-scifi', { name: 'Space stuff' })
        await useGuestStore.getState().deleteList('system-action')
        await reload(guestId)
        expect(ids()).not.toContain('system-action') // stuck before the fix

        await useGuestStore.getState().resetBuiltInCollections()
        await reload(guestId)

        expect(
            ids()
                .filter((id) => builtInIds.includes(id))
                .sort()
        ).toEqual([...builtInIds].sort())
        expect(new Set(ids()).size).toBe(ids().length)
        const action = byId('system-action')!
        const template = ALL_SYSTEM_COLLECTIONS[0]
        expect(action.name).toBe('Action-Packed')
        expect(action.genres).toEqual(template.genres)
        expect(action.enabled).toBe(true)
        expect(action.displayAsRow).toBe(true)
        expect(byId('system-scifi')!.name).toBe('Sci-Fi & Fantasy')
        expect(byId(mine as string)!.name).toBe('My picks')
    })

    it('is a no-op on the count when nothing is missing', async () => {
        const before = ids().length
        await useGuestStore.getState().resetBuiltInCollections()
        await useGuestStore.getState().resetBuiltInCollections()
        expect(ids().length).toBe(before)
    })
})

describe('UserListsService.resetBuiltInCollections', () => {
    const own: UserList = {
        id: 'list_1',
        name: 'Mine',
        items: [],
        collectionType: 'manual',
        displayAsRow: false,
        order: 0,
        enabled: false,
        createdAt: 1,
        updatedAt: 1,
    }

    it('keeps titles, creation time and the profile choice of a built-in still there', () => {
        const edited = {
            ...ALL_SYSTEM_COLLECTIONS[1],
            name: 'Renamed',
            genres: ['horror'],
            enabled: false,
            displayAsRow: false,
            showOnPublicProfile: false,
            createdAt: 42,
            advancedFilters: { minRating: 9 },
        } as UserList
        const next = UserListsService.resetBuiltInCollections(
            { userCreatedWatchlists: [own, edited, { ...edited }], defaultWatchlist: [] } as never,
            ALL_SYSTEM_COLLECTIONS as UserList[]
        ) as { userCreatedWatchlists: UserList[] }
        const lists = next.userCreatedWatchlists
        expect(lists[0]).toBe(own)
        expect(lists.filter((l) => l.id === 'system-scifi')).toHaveLength(1)
        const scifi = lists.find((l) => l.id === 'system-scifi')!
        expect(scifi).toMatchObject({
            name: 'Sci-Fi & Fantasy',
            genres: ['scifi', 'fantasy'],
            enabled: true,
            displayAsRow: true,
            showOnPublicProfile: false,
            createdAt: 42,
        })
        expect(scifi.advancedFilters).toBeUndefined()
        expect(lists.map((l) => l.id).sort()).toEqual(
            ['list_1', 'system-action', 'system-comedy', 'system-scifi'].sort()
        )
    })
})

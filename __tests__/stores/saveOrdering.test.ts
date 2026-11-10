import { act } from '@testing-library/react'
import { useGuestStore } from '../../stores/guestStore'
import { GuestStorageService } from '../../services/guestStorageService'
import { Content } from '../../typings'

jest.mock('../../services/guestStorageService', () => ({
    GuestStorageService: {
        loadGuestData: jest.fn().mockReturnValue({}),
        clearCurrentGuestData: jest.fn().mockReturnValue({}),
        saveGuestData: jest.fn(),
    },
}))

const title = (id: number) => ({ id, title: `T${id}`, media_type: 'movie' }) as unknown as Content

describe('collection saves', () => {
    beforeEach(() => {
        useGuestStore.setState({ guestId: 'guest_test', userCreatedWatchlists: [] })
        ;(GuestStorageService.saveGuestData as jest.Mock).mockClear()
    })

    it('creates a collection with its titles in one save', async () => {
        await act(async () => {
            await useGuestStore.getState().createList({
                name: 'More like Arrival',
                collectionType: 'manual',
                items: [title(1), title(2), title(3), title(2)],
            })
        })
        const list = useGuestStore.getState().userCreatedWatchlists[0]
        expect(list.items.map((i) => i.id)).toEqual([1, 2, 3])
        expect(GuestStorageService.saveGuestData).toHaveBeenCalledTimes(1)
    })

    it('the last save always carries the newest state', async () => {
        let listId = ''
        await act(async () => {
            listId = await useGuestStore.getState().createList({
                name: 'Favs',
                collectionType: 'manual',
            })
            await Promise.all(
                [1, 2, 3, 4, 5].map((id) => useGuestStore.getState().addToList(listId, title(id)))
            )
        })
        const calls = (GuestStorageService.saveGuestData as jest.Mock).mock.calls
        const lastSaved = calls[calls.length - 1][1].userCreatedWatchlists.find(
            (l: { id: string }) => l.id === listId
        )
        expect(lastSaved.items).toHaveLength(5)
    })
})

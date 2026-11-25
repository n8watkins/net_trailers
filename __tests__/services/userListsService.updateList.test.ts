import { UserListsService } from '../../services/userListsService'
import { ALL_SYSTEM_COLLECTIONS } from '../../constants/systemCollections'
import type { UserList } from '../../types/collections'

describe('UserListsService.updateList', () => {
    it('saves the "Show on public profile" switch', () => {
        // The editor's switch used to be dropped here, so it never saved
        const state = {
            userCreatedWatchlists: [{ ...ALL_SYSTEM_COLLECTIONS[0] } as UserList],
            defaultWatchlist: [],
        }
        const next = UserListsService.updateList(state as never, {
            id: 'system-action',
            showOnPublicProfile: false,
        }) as typeof state
        expect(next.userCreatedWatchlists[0].showOnPublicProfile).toBe(false)
    })
})

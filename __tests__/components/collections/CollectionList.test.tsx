import { fireEvent, render, screen, within } from '@testing-library/react'
import CollectionList from '../../../components/collections/CollectionList'
import CollectionsSettingsPage from '../../../app/settings/collections/page'
import CollectionsPage from '../../../app/collections/page'
import { ALL_SYSTEM_COLLECTIONS } from '../../../constants/systemCollections'
import type { UserList } from '../../../types/collections'

jest.mock('../../../components/layout/PageToolbar', () => {
    const actual = jest.requireActual('../../../components/layout/PageToolbar')
    return {
        ...actual,
        // Voice search needs browser speech APIs
        ListSearchInput: ({
            value,
            onChange,
        }: {
            value: string
            onChange: (v: string) => void
        }) => (
            <input
                aria-label="Search collections"
                value={value}
                onChange={(e) => onChange(e.target.value)}
            />
        ),
    }
})

const watchLater: UserList = {
    id: 'default-watchlist',
    name: 'Watch Later',
    items: [],
    emoji: '📺',
    color: '#e50914',
    collectionType: 'manual',
    displayAsRow: true,
    enabled: true,
    order: 0,
    createdAt: 0,
    updatedAt: 0,
}
const builtIns = ALL_SYSTEM_COLLECTIONS.map((c) => ({ ...c })) as UserList[]
builtIns[2] = { ...builtIns[2], enabled: false }
const all = [watchLater, ...builtIns]

const updateList = jest.fn()
jest.mock('../../../hooks/useUserData', () => ({
    __esModule: true,
    default: () => ({ getAllLists: () => all, updateList }),
}))
jest.mock('../../../hooks/useToast', () => ({
    useToast: () => ({ showSuccess: jest.fn(), showError: jest.fn() }),
}))
jest.mock('../../../hooks/useAuthStatus', () => ({
    useAuthStatus: () => ({ isLoading: false }),
}))
jest.mock('../../../components/layout/SubPageLayout', () => ({
    __esModule: true,
    default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))
jest.mock('../../../components/modals/CollectionEditorModal', () => ({
    __esModule: true,
    default: () => null,
}))

function cardNames() {
    return screen
        .getAllByTestId('collection-card')
        .map((card) => within(card).getByRole('link').textContent)
}

describe('CollectionList', () => {
    it('uses one vocabulary for contents and home status', () => {
        render(<CollectionList collections={all} voiceSourceId="t" />)
        const cards = screen.getAllByTestId('collection-card')
        expect(within(cards[1]).getByText('Auto-fills by genre')).toBeTruthy()
        expect(within(cards[1]).getByTestId('home-status').textContent).toBe('Shown on home')
        expect(within(cards[3]).getByTestId('home-status').textContent).toBe('Hidden')
        // Watch Later is not a home row, so it has no home status
        expect(within(cards[0]).queryByTestId('home-status')).toBeNull()
        expect(screen.getByTestId('home-summary').textContent).toBe('2 shown on home, 1 hidden')
    })

    it('filters with the same chips and counts', () => {
        render(<CollectionList collections={all} voiceSourceId="t" />)
        expect(screen.getByRole('radio', { name: /All \(4\)/ })).toBeTruthy()
        fireEvent.click(screen.getByRole('radio', { name: /Genre \(3\)/ }))
        expect(cardNames()).toEqual(['Action-Packed', 'Sci-Fi & Fantasy', 'Comedy'])
        fireEvent.click(screen.getByRole('radio', { name: /Manual \(1\)/ }))
        expect(cardNames()).toEqual(['Watch Later'])
    })
})

describe('Settings > Collections and /collections', () => {
    it('show the same list, Watch Later included', () => {
        const { unmount } = render(<CollectionsSettingsPage />)
        const settings = cardNames()
        unmount()
        render(<CollectionsPage />)
        expect(cardNames()).toEqual(settings)
        expect(settings).toEqual(['Watch Later', 'Action-Packed', 'Sci-Fi & Fantasy', 'Comedy'])
    })

    it('Settings switches a collection on home by setting both flags', () => {
        render(<CollectionsSettingsPage />)
        fireEvent.click(screen.getByRole('switch', { name: 'Show Comedy on home' }))
        expect(updateList).toHaveBeenCalledWith('system-comedy', {
            enabled: true,
            displayAsRow: true,
        })
        // Watch Later has no home switch and no Edit
        expect(screen.queryByRole('switch', { name: /Watch Later/ })).toBeNull()
        expect(screen.queryByRole('button', { name: 'Edit Watch Later' })).toBeNull()
    })
})

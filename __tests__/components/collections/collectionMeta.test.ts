import {
    AUTO_FILL_LABEL,
    contentsLabel,
    homeVisibilityUpdate,
    isShownOnHome,
    matchesKind,
    sortCollections,
} from '../../../components/collections/collectionMeta'
import type { UserList } from '../../../types/collections'

const list = (overrides: Partial<UserList>): UserList => ({
    id: 'x',
    name: 'X',
    items: [],
    collectionType: 'manual',
    displayAsRow: true,
    enabled: true,
    order: 0,
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
})

describe('collectionMeta', () => {
    it('is shown on home only when both flags the home page reads are on', () => {
        expect(isShownOnHome(list({}))).toBe(true)
        // The editor used to hide with displayAsRow while Settings still said "Enabled"
        expect(isShownOnHome(list({ displayAsRow: false }))).toBe(false)
        expect(isShownOnHome(list({ enabled: false }))).toBe(false)
        // Watch Later is not a home row
        expect(isShownOnHome(list({ id: 'default-watchlist' }))).toBe(false)
    })

    it('shows and hides by setting both flags together', () => {
        expect(homeVisibilityUpdate(false)).toEqual({ enabled: false, displayAsRow: false })
        expect(homeVisibilityUpdate(true)).toEqual({ enabled: true, displayAsRow: true })
    })

    it('describes contents with one vocabulary', () => {
        expect(contentsLabel(list({ collectionType: 'tmdb-genre' }))).toBe(AUTO_FILL_LABEL)
        expect(contentsLabel(list({ items: [{ id: 1 } as never] }))).toBe('1 title')
        expect(contentsLabel(list({ items: [] }))).toBe('0 titles')
    })

    it('filters by kind with the same chips everywhere', () => {
        const genre = list({ collectionType: 'tmdb-genre' })
        const ai = list({ collectionType: 'ai-generated' })
        expect(matchesKind(genre, 'genre')).toBe(true)
        expect(matchesKind(genre, 'manual')).toBe(false)
        expect(matchesKind(ai, 'ai')).toBe(true)
        expect(matchesKind(ai, 'all')).toBe(true)
    })

    it('puts Watch Later first, then the home order', () => {
        const sorted = sortCollections([
            list({ id: 'b', order: 2 }),
            list({ id: 'a', order: 1 }),
            list({ id: 'default-watchlist', order: 9 }),
        ])
        expect(sorted.map((l) => l.id)).toEqual(['default-watchlist', 'a', 'b'])
    })
})

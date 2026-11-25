import type { UserList } from '../../types/collections'

/**
 * One vocabulary for describing a collection, used by Settings > Collections,
 * /collections, the collection page and the editor, so the same collection is
 * never called "Dynamic" in one place and "Fills itself by genre" in another.
 */

/** Id of the Watch Later list, which is built from the default watchlist, not stored as a collection. */
export const WATCH_LATER_ID = 'default-watchlist'

export const HOME_SHOWN_LABEL = 'Shown on home'
export const HOME_HIDDEN_LABEL = 'Hidden'
export const AUTO_FILL_LABEL = 'Auto-fills by genre'
/** The editor's switch for the same thing. */
export const AUTO_FILL_SWITCH_LABEL = 'Auto-fill by genre'

type CollectionLike = Pick<UserList, 'id'> &
    Partial<
        Pick<
            UserList,
            'collectionType' | 'enabled' | 'displayAsRow' | 'isSystemCollection' | 'items'
        >
    >

export function isWatchLater(list: Pick<UserList, 'id'>): boolean {
    return list.id === WATCH_LATER_ID
}

/** Built-in genre rows (Action-Packed, Sci-Fi & Fantasy, Comedy) seeded for every account. */
export function isBuiltInCollection(list: CollectionLike): boolean {
    return !!list.isSystemCollection || list.id.startsWith('system-')
}

/** A collection that fills itself from TMDB by genre rather than holding hand-picked titles. */
export function isAutoFill(list: CollectionLike): boolean {
    return list.collectionType === 'tmdb-genre'
}

/**
 * Whether the collection is a row on the home page. The home page needs both
 * `enabled` and `displayAsRow` (components/pages/HomeClient.tsx); Settings used
 * to flip one and the editor the other, so each showed its own answer.
 */
export function isShownOnHome(list: CollectionLike): boolean {
    if (isWatchLater(list)) return false
    return list.enabled !== false && list.displayAsRow !== false
}

/** The update that shows or hides a collection on home, keeping both flags in step. */
export function homeVisibilityUpdate(shown: boolean): Pick<UserList, 'enabled' | 'displayAsRow'> {
    return { enabled: shown, displayAsRow: shown }
}

/** Whether the collection has a home-row setting at all (Watch Later does not). */
export function hasHomeSetting(list: Pick<UserList, 'id'>): boolean {
    return !isWatchLater(list)
}

export function titleCountLabel(count: number): string {
    return `${count} ${count === 1 ? 'title' : 'titles'}`
}

/** What the collection holds: "Auto-fills by genre" or "3 titles". */
export function contentsLabel(list: CollectionLike): string {
    return isAutoFill(list) ? AUTO_FILL_LABEL : titleCountLabel(list.items?.length ?? 0)
}

export type CollectionKindFilter = 'all' | 'manual' | 'ai' | 'genre'

export function matchesKind(list: CollectionLike, kind: CollectionKindFilter): boolean {
    switch (kind) {
        case 'manual':
            return list.collectionType === 'manual' || !list.collectionType
        case 'ai':
            return list.collectionType === 'ai-generated'
        case 'genre':
            return list.collectionType === 'tmdb-genre'
        default:
            return true
    }
}

/** Watch Later first, then the order the owner set, then newest first. */
export function sortCollections<T extends UserList>(lists: T[]): T[] {
    return [...lists].sort((a, b) => {
        if (isWatchLater(a)) return -1
        if (isWatchLater(b)) return 1
        const order = (a.order ?? 0) - (b.order ?? 0)
        if (order !== 0) return order
        return (b.createdAt || 0) - (a.createdAt || 0)
    })
}

export function hexToRgba(hex: string, opacity: number): string {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    if (result) {
        const r = parseInt(result[1], 16)
        const g = parseInt(result[2], 16)
        const b = parseInt(result[3], 16)
        return `rgba(${r}, ${g}, ${b}, ${opacity})`
    }
    return `rgba(113, 113, 122, ${opacity})`
}

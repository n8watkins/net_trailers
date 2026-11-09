import type { ComponentType } from 'react'
import {
    HomeIcon,
    Squares2X2Icon,
    MagnifyingGlassIcon,
    UsersIcon,
    RectangleStackIcon,
    HandThumbUpIcon,
    SparklesIcon,
} from '@heroicons/react/24/outline'
import type { UnifiedGenre } from '../../constants/unifiedGenres'

/**
 * The site's primary navigation, defined once for the desktop header and the
 * phone menu so the two cannot drift apart again. The array is in phone-menu
 * order; `desktop` says where each item lives on wide screens.
 */

export type PrimaryNavId =
    'home' | 'genres' | 'search' | 'community' | 'collections' | 'ratings' | 'surprise'

export type PrimaryNavKind = 'link' | 'genres' | 'surprise'

export interface PrimaryNavItem {
    id: PrimaryNavId
    label: string
    icon: ComponentType<{ className?: string }>
    kind: PrimaryNavKind
    /** Destination for links */
    href?: string
    /** Path prefix that marks the item as current */
    activePrefix?: string
    /**
     * Desktop placement: `start` (after the logo), `search` (the header search box),
     * `end` (after the profile menu) or `profile-menu` (inside My Profile).
     */
    desktop: 'start' | 'search' | 'end' | 'profile-menu'
    /** Order among desktop `start` items */
    desktopOrder?: number
}

export const PRIMARY_NAV: readonly PrimaryNavItem[] = [
    {
        id: 'home',
        label: 'Home',
        icon: HomeIcon,
        kind: 'link',
        href: '/',
        desktop: 'start',
        desktopOrder: 0,
    },
    {
        id: 'genres',
        label: 'Genres',
        icon: Squares2X2Icon,
        kind: 'genres',
        desktop: 'start',
        desktopOrder: 1,
    },
    {
        id: 'search',
        label: 'Search',
        icon: MagnifyingGlassIcon,
        kind: 'link',
        href: '/search',
        activePrefix: '/search',
        desktop: 'search',
    },
    {
        id: 'community',
        label: 'Community',
        icon: UsersIcon,
        kind: 'link',
        href: '/community/rankings',
        activePrefix: '/community',
        desktop: 'end',
    },
    {
        id: 'collections',
        label: 'Collections',
        icon: RectangleStackIcon,
        kind: 'link',
        href: '/collections',
        activePrefix: '/collections',
        desktop: 'profile-menu',
    },
    {
        id: 'ratings',
        label: 'My Ratings',
        icon: HandThumbUpIcon,
        kind: 'link',
        href: '/ratings',
        activePrefix: '/ratings',
        desktop: 'profile-menu',
    },
    {
        id: 'surprise',
        label: 'Surprise Me!',
        icon: SparklesIcon,
        kind: 'surprise',
        desktop: 'start',
        desktopOrder: 2,
    },
]

/** Desktop items shown right after the logo, in desktop order. */
export const DESKTOP_START_NAV = PRIMARY_NAV.filter((item) => item.desktop === 'start').sort(
    (a, b) => (a.desktopOrder ?? 0) - (b.desktopOrder ?? 0)
)

export function getNavItem(id: PrimaryNavId): PrimaryNavItem {
    const item = PRIMARY_NAV.find((entry) => entry.id === id)
    if (!item) throw new Error(`Unknown nav item: ${id}`)
    return item
}

export function isNavItemActive(item: PrimaryNavItem, pathname: string | null): boolean {
    if (!pathname) return false
    if (item.href === '/') return pathname === '/'
    return !!item.activePrefix && pathname.startsWith(item.activePrefix)
}

/** Link to a genre page for movies, TV, or both. */
export function genreHref(genre: UnifiedGenre, mediaType: 'movie' | 'tv' | 'both'): string {
    const name = encodeURIComponent(genre.name)
    if (mediaType === 'both') {
        return `/genres/both/${genre.movieIds.join(',')}?tvGenres=${genre.tvIds.join(',')}&name=${name}`
    }
    const ids = mediaType === 'movie' ? genre.movieIds : genre.tvIds
    return `/genres/${mediaType}/${ids[0]}?name=${name}`
}

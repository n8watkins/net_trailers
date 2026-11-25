/**
 * Copy for the "Help & tutorial" window (components/modals/TutorialModal.tsx),
 * kept here like aboutContent.ts so the window is layout only.
 *
 * Each tile says in one line what a feature does and where its "Open" link
 * goes. Every line and target was checked against the app as it is: guests
 * can use everything except a public profile (the only page that needs an
 * account), so that is the only tile with a lock.
 */

import { TOTAL_TOUR_STEPS } from './tourSteps'

/** Icon names, drawn from Heroicons outline in components/modals/helpIcons.ts. */
export type HelpIconName =
    | 'search'
    | 'mood'
    | 'voice'
    | 'surprise'
    | 'like'
    | 'watch-later'
    | 'collections'
    | 'history'
    | 'rankings'
    | 'forums'
    | 'profile'
    | 'child-safety'

/**
 * What a tile's "Open" link does. Most go to a page; the search features have
 * no page of their own, so they bring the visitor to the control instead
 * (components/modals/helpActions.ts).
 */
export type HelpTarget =
    /** A page, the same for everyone */
    | { kind: 'page'; href: string }
    /** The visitor's own public profile (/users/<id>) */
    | { kind: 'public-profile' }
    /** Focus the search field in the header (opening it first on phones) */
    | { kind: 'header-search' }
    /** Go home and focus the mood box under the hero */
    | { kind: 'mood-box' }
    /** Go home and point at the microphone in the mood box */
    | { kind: 'mood-voice' }
    /** Open a random title, as the header's Surprise me does */
    | { kind: 'surprise' }

export interface HelpTile {
    id: string
    name: string
    icon: HelpIconName
    /** One line, shown in the detail box when the tile is selected */
    line: string
    /** The line for guests, when it differs */
    guestLine?: string
    /** Guests get a lock and a "Sign in" link instead of "Open" */
    needsAccount?: boolean
    target: HelpTarget
}

export interface HelpCategory {
    id: string
    title: string
    tiles: HelpTile[]
}

export const HELP_CATEGORIES: HelpCategory[] = [
    {
        id: 'search',
        title: 'Search',
        tiles: [
            {
                id: 'search',
                name: 'Search',
                icon: 'search',
                line: 'Find titles and people; narrow by type, rating and year.',
                target: { kind: 'header-search' },
            },
            {
                id: 'mood',
                name: 'Ask by mood',
                icon: 'mood',
                line: 'Type "cozy rainy-day mysteries" in the mood box and let AI pick.',
                target: { kind: 'mood-box' },
            },
            {
                id: 'voice',
                name: 'Voice search',
                icon: 'voice',
                line: 'Tap the microphone in the mood box and say what you want.',
                target: { kind: 'mood-voice' },
            },
            {
                id: 'surprise',
                name: 'Surprise me',
                icon: 'surprise',
                line: 'One tap opens a random movie or show.',
                target: { kind: 'surprise' },
            },
        ],
    },
    {
        id: 'library',
        title: 'Your library',
        tiles: [
            {
                id: 'like',
                name: 'Like and hide',
                icon: 'like',
                line: 'Like or hide titles on any card; it shapes your For you picks.',
                target: { kind: 'page', href: '/ratings' },
            },
            {
                id: 'watch-later',
                name: 'Watch later',
                icon: 'watch-later',
                line: 'Titles you saved with Add to lists, on every device you sign in on.',
                guestLine: 'Titles you saved with Add to lists, kept on this device.',
                target: { kind: 'page', href: '/collections/watch-later' },
            },
            {
                id: 'collections',
                name: 'Collections',
                icon: 'collections',
                line: 'Your own rows of titles: hand-picked, by genre or made by AI.',
                guestLine: 'Your own rows, hand-picked or by genre. AI-made ones need sign-in.',
                target: { kind: 'page', href: '/collections' },
            },
            {
                id: 'history',
                name: 'Watch history',
                icon: 'history',
                line: 'Every title you have opened, newest first.',
                target: { kind: 'page', href: '/history' },
            },
        ],
    },
    {
        id: 'community',
        title: 'Community',
        tiles: [
            {
                id: 'rankings',
                name: 'Rankings',
                icon: 'rankings',
                line: 'Rank your top 10 and see what others ranked.',
                guestLine: 'See what others ranked; sign in to rank your own.',
                target: { kind: 'page', href: '/community/rankings' },
            },
            {
                id: 'forums',
                name: 'Forums and polls',
                icon: 'forums',
                line: 'Start a thread or a poll, or join one.',
                guestLine: 'Read threads and polls; sign in to post or vote.',
                target: { kind: 'page', href: '/community/threads' },
            },
        ],
    },
    {
        id: 'profile',
        title: 'Profile',
        tiles: [
            {
                id: 'public-profile',
                name: 'Public profile',
                icon: 'profile',
                line: 'The page others see: your rankings, collections and posts.',
                guestLine: 'A page others can see, with your rankings and collections.',
                needsAccount: true,
                target: { kind: 'public-profile' },
            },
            {
                id: 'child-safety',
                name: 'Child safety',
                icon: 'child-safety',
                line: 'Show only family-friendly titles, locked with a PIN.',
                guestLine: 'Show only family-friendly titles; sign in to lock it with a PIN.',
                target: { kind: 'page', href: '/settings/preferences' },
            },
        ],
    },
]

export const HELP_TILES: HelpTile[] = HELP_CATEGORIES.flatMap((category) => category.tiles)

export const HELP_TOUR = {
    title: 'Take the tour',
    subtitle: `${TOTAL_TOUR_STEPS} short steps.`,
} as const

/**
 * Interactive tour definitions - feature-based structure.
 *
 * The tour always runs on the home page (components/onboarding/useTourLauncher.ts
 * takes the visitor there first). Each pane names the elements it can point at,
 * in order of preference; the tour uses the first one that is actually visible,
 * and shows the pane centered when none is. Panes can override their copy or
 * targets for guests and for devices without hover or keyboard shortcuts, so a
 * step never promises a shortcut or gesture that does not work where it is read.
 */

export interface TourPane {
    id: string
    title: string
    description: string
    /** CSS selectors to highlight, in order of preference; empty = a centered pane. */
    targets: string[]
    /** Where the card sits relative to the target on wide screens. */
    position: 'top' | 'bottom' | 'center'
    /** Padding around the highlighted element (default: 8) */
    spotlightPadding?: number
}

type PaneOverride = Partial<Omit<TourPane, 'id'>>

interface TourPaneDefinition extends TourPane {
    /** Applied when the device cannot hover (phones, tablets). */
    touch?: PaneOverride
    /** Applied when the global keyboard shortcuts are off (touch or below 1024 px). */
    noShortcuts?: PaneOverride
    /** Applied to visitors who are not signed in. */
    guest?: PaneOverride
}

export interface TourFeature {
    id: string
    name: string // Feature name (e.g., "Search", "Collections")
    panes: TourPaneDefinition[]
}

export interface TourStructure {
    welcome: TourPaneDefinition // Welcome screen (not counted as a feature)
    features: TourFeature[] // Main features with panes
    complete: TourPaneDefinition // Completion screen (not counted as a feature)
}

/** What the tour needs to know about the visitor to pick the right copy and targets. */
export interface TourEnvironment {
    isGuest: boolean
    /** A mouse or trackpad that can hover (`(hover: hover) and (pointer: fine)`). */
    canHover: boolean
    /** Global shortcuts such as Alt+/ work (same rule as hooks/useKeyboardShortcuts.ts). */
    hasShortcuts: boolean
}

// The header's phone/tablet search button (components/layout/Header.tsx), shown below lg
const HEADER_SEARCH_BUTTON = 'header button[aria-label="Search"]'

const WELCOME_PANE: TourPaneDefinition = {
    id: 'welcome',
    title: 'Welcome to NetTrailers',
    description:
        "Let's walk through the key features that make discovering movies and TV shows easy and fun.",
    targets: [],
    position: 'center',
}

// Feature 1: Search (2 panes)
const SEARCH_FEATURE: TourFeature = {
    id: 'search',
    name: 'Search',
    panes: [
        {
            id: 'search-basic',
            title: '🔍 Quick Search',
            description:
                'Search for movies, TV shows, actors or directors. Try "Christopher Nolan" or "action movies". Press Alt+/ anytime to jump here.',
            targets: ['#navbar-search-input', HEADER_SEARCH_BUTTON],
            position: 'bottom',
            spotlightPadding: 12,
            noShortcuts: {
                description:
                    'Search for movies, TV shows, actors or directors from the search button at the top. Try "Christopher Nolan" or "action movies".',
            },
        },
        {
            id: 'search-filters',
            title: '🔍 Advanced Filters',
            description:
                'Use the filter button to switch between titles and people, or refine by genre, year, rating and more.',
            targets: ['[data-tour="filter-button"]', HEADER_SEARCH_BUTTON],
            position: 'bottom',
            spotlightPadding: 12,
            noShortcuts: {
                description:
                    'Open search, then use the filter button to switch between titles and people, or refine by genre, year, rating and more.',
            },
        },
    ],
}

// Feature 2: Browse Content (2 panes)
const BROWSE_FEATURE: TourFeature = {
    id: 'browse',
    name: 'Browse',
    panes: [
        {
            id: 'browse-cards',
            title: '🎬 Content Cards',
            description:
                'Each card shows the rating, release year and whether it is a movie or a show. After the tour, click any poster to watch its trailer, see details and get recommendations.',
            targets: ['[data-tour="content-card"]'],
            position: 'top',
            spotlightPadding: 12,
            touch: {
                description:
                    'Each card shows the rating, release year and whether it is a movie or a show. After the tour, tap any poster to watch its trailer, see details and get recommendations.',
            },
        },
        {
            id: 'browse-quick-actions',
            title: '🎬 Quick Actions',
            description:
                "After the tour, hover over a card to reveal quick actions: add it to Watch Later, mark it as a Favorite, or hide what you're not interested in.",
            targets: ['[data-tour="content-card"]'],
            position: 'top',
            spotlightPadding: 12,
            touch: {
                description:
                    "After the tour, tap a poster to add it to Watch Later, mark it as a Favorite, or hide what you're not interested in.",
            },
        },
    ],
}

// Feature 3: Your Hub (1 pane)
const HUB_FEATURE: TourFeature = {
    id: 'hub',
    name: 'Your Hub',
    panes: [
        {
            id: 'hub-avatar',
            title: '👤 Your Personal Hub',
            description:
                'Your avatar menu holds your collections (Watch Later, Favorites), rankings, ratings, watch history and settings.',
            targets: ['[data-tour="avatar-button"]'],
            position: 'bottom',
            spotlightPadding: 12,
            guest: {
                description:
                    'This menu is your hub. As a guest, your Watch Later, Favorites and settings stay in this browser; sign in from here to keep them on every device.',
                // The guest avatar (components/auth/AvatarDropdown.tsx)
                targets: ['header button[aria-label="User menu"]'],
            },
        },
    ],
}

// Feature 4: Collections (1 pane)
const COLLECTIONS_FEATURE: TourFeature = {
    id: 'collections',
    name: 'Collections',
    panes: [
        {
            id: 'collections-custom',
            title: '📚 Custom Collections',
            description:
                'Create and manage custom collections with AI-powered smart search. Organize content by genre, mood, or any criteria you want.',
            targets: [],
            position: 'center',
        },
    ],
}

// Feature 5: Rankings & Community (1 pane)
const RANKINGS_FEATURE: TourFeature = {
    id: 'rankings',
    name: 'Rankings & Community',
    panes: [
        {
            id: 'rankings-community',
            title: '🏆 Rankings & Community',
            description:
                "Share your top 10 rankings with the community, join forum discussions, comment on others' rankings, and discover what people are watching.",
            targets: [],
            position: 'center',
        },
    ],
}

// Feature 6: Child Safety (1 pane)
const SAFETY_FEATURE: TourFeature = {
    id: 'safety',
    name: 'Child Safety',
    panes: [
        {
            id: 'safety-mode',
            title: '🛡️ Child Safety Mode',
            description:
                'Enable child safety mode to filter content by rating. Set a PIN to protect settings and ensure age-appropriate viewing.',
            targets: [],
            position: 'center',
        },
    ],
}

// Completion screen (not a feature)
const COMPLETE_PANE: TourPaneDefinition = {
    id: 'complete',
    title: '🎉 Ready to Explore!',
    description:
        "You're all set! Start discovering content, building collections, or sharing your opinions. Take this tour again anytime from Help & tutorial or About this project in the footer.",
    targets: [],
    position: 'center',
    guest: {
        description:
            "You're all set! Start discovering content, building collections, or sharing your opinions. Take this tour again anytime from About this project in the footer.",
    },
}

export const TOUR: TourStructure = {
    welcome: WELCOME_PANE,
    features: [
        SEARCH_FEATURE,
        BROWSE_FEATURE,
        HUB_FEATURE,
        COLLECTIONS_FEATURE,
        RANKINGS_FEATURE,
        SAFETY_FEATURE,
    ],
    complete: COMPLETE_PANE,
}

const ALL_PANE_DEFINITIONS: TourPaneDefinition[] = [
    TOUR.welcome,
    ...TOUR.features.flatMap((feature) => feature.panes),
    TOUR.complete,
]

export const TOTAL_FEATURES = TOUR.features.length
export const TOTAL_TOUR_STEPS = ALL_PANE_DEFINITIONS.length

/** The panes, in order, with the overrides that apply to this visitor merged in. */
export function buildTourSteps(env: TourEnvironment): TourPane[] {
    return ALL_PANE_DEFINITIONS.map(({ touch, noShortcuts, guest, ...pane }): TourPane => ({
        ...pane,
        ...(!env.canHover ? touch : undefined),
        ...(!env.hasShortcuts ? noShortcuts : undefined),
        ...(env.isGuest ? guest : undefined),
    }))
}

/** Feature and pane-within-feature for a global pane index, for the progress line. */
export const getPanePosition = (
    globalPaneIndex: number
): {
    featureIndex: number
    paneIndexInFeature: number
    isWelcome: boolean
    isComplete: boolean
} => {
    if (globalPaneIndex === 0) {
        return { featureIndex: -1, paneIndexInFeature: -1, isWelcome: true, isComplete: false }
    }
    if (globalPaneIndex === TOTAL_TOUR_STEPS - 1) {
        return { featureIndex: -1, paneIndexInFeature: -1, isWelcome: false, isComplete: true }
    }

    let paneCount = 1 // Start after welcome
    for (let featureIndex = 0; featureIndex < TOUR.features.length; featureIndex++) {
        const feature = TOUR.features[featureIndex]
        if (globalPaneIndex < paneCount + feature.panes.length) {
            return {
                featureIndex,
                paneIndexInFeature: globalPaneIndex - paneCount,
                isWelcome: false,
                isComplete: false,
            }
        }
        paneCount += feature.panes.length
    }

    return { featureIndex: -1, paneIndexInFeature: -1, isWelcome: false, isComplete: false }
}

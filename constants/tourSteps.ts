/**
 * Interactive tour definitions - Feature-based structure
 * Tours are organized by features, with multiple panes explaining each feature
 */

export interface TourPane {
    id: string
    title: string
    description: string
    targetSelector: string // CSS selector for the element to highlight
    position: 'top' | 'bottom' | 'left' | 'right' | 'center'
    spotlightPadding?: number // Padding around the highlighted element (default: 8)
    action?: 'click' | 'hover' | 'focus' | null // Optional action hint
}

export interface TourFeature {
    id: string
    name: string // Feature name (e.g., "Search", "Collections")
    icon: string // Emoji representing the feature
    panes: TourPane[] // Multiple panes explaining different aspects of the feature
}

export interface TourStructure {
    welcome: TourPane // Welcome screen (not counted as a feature)
    features: TourFeature[] // Main features with panes
    complete: TourPane // Completion screen (not counted as a feature)
}

// Welcome screen (not a feature)
const WELCOME_PANE: TourPane = {
    id: 'welcome',
    title: '👋 Welcome to Net Trailers!',
    description:
        "Let's explore the key features that make discovering movies and TV shows easy and fun. Navigate with arrow keys or the buttons below.",
    targetSelector: 'body',
    position: 'center',
}

// Feature 1: Search (3 panes)
const SEARCH_FEATURE: TourFeature = {
    id: 'search',
    name: 'Search',
    icon: '🔍',
    panes: [
        {
            id: 'search-basic',
            title: '🔍 Quick Search',
            description:
                'Search for movies, TV shows, actors, or directors. Press Alt+/ anytime to jump to search. Try "Christopher Nolan" or "action movies".',
            targetSelector: '#navbar-search-input, #navbar-mobile-search-input',
            position: 'bottom',
            spotlightPadding: 12,
        },
        {
            id: 'search-people-titles',
            title: '🔍 People vs Titles',
            description:
                'Toggle between searching for people (actors, directors) or titles (movies, TV shows) using the selector in the navbar. This helps narrow down your results.',
            targetSelector: '[data-tour="search-type-toggle"]',
            position: 'bottom',
            spotlightPadding: 12,
        },
        {
            id: 'search-filters',
            title: '🔍 Advanced Filters',
            description:
                "Use the filter button to refine your search by genre, year, rating, and more. Perfect for finding exactly what you're looking for.",
            targetSelector: '[data-tour="filter-button"]',
            position: 'bottom',
            spotlightPadding: 12,
        },
    ],
}

// Feature 2: Browse Content (2 panes)
const BROWSE_FEATURE: TourFeature = {
    id: 'browse',
    name: 'Browse',
    icon: '🎬',
    panes: [
        {
            id: 'browse-cards',
            title: '🎬 Content Cards',
            description:
                'Click any poster to watch trailers, view details, and get recommendations. Each card shows rating, release year, and content type.',
            targetSelector: '[data-tour="content-card"]',
            position: 'top',
            spotlightPadding: 12,
        },
        {
            id: 'browse-quick-actions',
            title: '🎬 Quick Actions',
            description:
                "Hover over any card to reveal quick action buttons: Add to Watch Later, mark as Favorite, or Hide content you're not interested in.",
            targetSelector: '[data-tour="content-card"]',
            position: 'top',
            spotlightPadding: 12,
        },
    ],
}

// Feature 3: Your Hub (1 pane)
const HUB_FEATURE: TourFeature = {
    id: 'hub',
    name: 'Your Hub',
    icon: '👤',
    panes: [
        {
            id: 'hub-avatar',
            title: '👤 Your Personal Hub',
            description:
                'Click your avatar to access your collections (Watch Later, Favorites), rankings, ratings, watch history, and settings.',
            targetSelector: '[data-tour="avatar-button"]',
            position: 'bottom',
            spotlightPadding: 12,
        },
    ],
}

// Feature 4: Collections (1 pane)
const COLLECTIONS_FEATURE: TourFeature = {
    id: 'collections',
    name: 'Collections',
    icon: '📚',
    panes: [
        {
            id: 'collections-custom',
            title: '📚 Custom Collections',
            description:
                'Create and manage custom collections with AI-powered smart search. Organize content by genre, mood, or any criteria you want.',
            targetSelector: 'body',
            position: 'center',
        },
    ],
}

// Feature 5: Rankings & Community (1 pane)
const RANKINGS_FEATURE: TourFeature = {
    id: 'rankings',
    name: 'Rankings & Community',
    icon: '🏆',
    panes: [
        {
            id: 'rankings-community',
            title: '🏆 Rankings & Community',
            description:
                "Share your top 10 rankings with the community, join forum discussions, comment on others' rankings, and discover what people are watching.",
            targetSelector: 'body',
            position: 'center',
        },
    ],
}

// Feature 6: Child Safety (1 pane)
const SAFETY_FEATURE: TourFeature = {
    id: 'safety',
    name: 'Child Safety',
    icon: '🛡️',
    panes: [
        {
            id: 'safety-mode',
            title: '🛡️ Child Safety Mode',
            description:
                'Enable child safety mode to filter content by rating. Set a PIN to protect settings and ensure age-appropriate viewing.',
            targetSelector: 'body',
            position: 'center',
        },
    ],
}

// Completion screen (not a feature)
const COMPLETE_PANE: TourPane = {
    id: 'complete',
    title: '🎉 Ready to Explore!',
    description:
        "You're all set! Start discovering content, building collections, or sharing your opinions. Access this tour anytime from Help & Tutorial in the footer or press Alt+T.",
    targetSelector: 'body',
    position: 'center',
}

// Complete tour structure
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

// Helper to flatten all panes for linear navigation
export const getAllPanes = (): TourPane[] => {
    const panes: TourPane[] = [TOUR.welcome]
    TOUR.features.forEach((feature) => panes.push(...feature.panes))
    panes.push(TOUR.complete)
    return panes
}

// Total counts for progress tracking
export const TOTAL_FEATURES = TOUR.features.length
export const TOTAL_PANES = getAllPanes().length

// Get feature index and pane index within feature from global pane index
export const getPanePosition = (
    globalPaneIndex: number
): {
    featureIndex: number
    paneIndexInFeature: number
    isWelcome: boolean
    isComplete: boolean
} => {
    const allPanes = getAllPanes()

    // Welcome screen
    if (globalPaneIndex === 0) {
        return { featureIndex: -1, paneIndexInFeature: -1, isWelcome: true, isComplete: false }
    }

    // Complete screen
    if (globalPaneIndex === allPanes.length - 1) {
        return { featureIndex: -1, paneIndexInFeature: -1, isWelcome: false, isComplete: true }
    }

    // Find which feature this pane belongs to
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

// Backwards compatibility - export flattened panes as TOUR_STEPS
export const TOUR_STEPS = getAllPanes()
export const TOTAL_TOUR_STEPS = TOTAL_PANES

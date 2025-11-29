/**
 * Interactive tour step definitions
 * Each step highlights a specific UI element and provides contextual help
 */

export interface TourStep {
    id: string
    title: string
    description: string
    targetSelector: string // CSS selector for the element to highlight
    position: 'top' | 'bottom' | 'left' | 'right' | 'center'
    spotlightPadding?: number // Padding around the highlighted element (default: 8)
    action?: 'click' | 'hover' | 'focus' | null // Optional action hint
    skippable?: boolean // Can user skip this step? (default: true)
}

export const TOUR_STEPS: TourStep[] = [
    {
        id: 'welcome',
        title: '👋 Welcome to Net Trailers!',
        description:
            "Let's take a quick tour of how to discover amazing movies and TV shows. Navigate with arrow keys or the buttons below.",
        targetSelector: 'body',
        position: 'center',
        skippable: true,
    },
    {
        id: 'search',
        title: '🔍 Search Anything',
        description:
            'Search for movies, TV shows, actors, or directors. Press "/" anytime to jump to search. Try "Christopher Nolan" or "action movies".',
        targetSelector: '#navbar-search-input, #navbar-mobile-search-input',
        position: 'bottom',
        action: 'focus',
        spotlightPadding: 12,
    },
    {
        id: 'content-cards',
        title: '🎬 Browse Content',
        description:
            'Click any poster to watch trailers, view details, rate content, and add to your collections. Hover over cards to see quick actions like Like and Add to Watchlist.',
        targetSelector: '[data-tour="content-card"]',
        position: 'top',
        action: 'hover',
        spotlightPadding: 12,
    },
    {
        id: 'avatar-menu',
        title: '👤 Your Personal Hub',
        description:
            'Access everything here: your collections (Watch Later, Favorites), rankings, ratings, watch history, and settings. Click to explore!',
        targetSelector: '[data-tour="avatar-button"]',
        position: 'bottom',
        spotlightPadding: 12,
        action: 'click',
    },
    {
        id: 'features',
        title: '✨ Powerful Features',
        description:
            'Create custom collections with AI search, share top 10 rankings with the community, join forum discussions, enable child safety mode, and track your watch history - all available from your avatar menu!',
        targetSelector: '[data-tour="avatar-button"]',
        position: 'bottom',
        spotlightPadding: 12,
    },
    {
        id: 'complete',
        title: '🎉 Ready to Explore!',
        description:
            "You're all set! Start discovering content, building collections, or sharing your opinions. Access this tour anytime from Help & Tutorial in the footer or press Alt+T.",
        targetSelector: 'body',
        position: 'center',
        skippable: false,
    },
]

// Tour step count for progress tracking
export const TOTAL_TOUR_STEPS = TOUR_STEPS.length

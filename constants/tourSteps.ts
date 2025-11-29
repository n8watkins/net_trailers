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
            'Click any poster to watch trailers, view details, and get recommendations. Each card shows rating, release year, and content type.',
        targetSelector: '[data-tour="content-card"]',
        position: 'top',
        action: 'hover',
        spotlightPadding: 12,
    },
    {
        id: 'quick-actions',
        title: '❤️ Quick Actions',
        description:
            "Hover over any card to reveal quick action buttons: Add to Watch Later, mark as Favorite, or Hide content you're not interested in.",
        targetSelector: '[data-tour="content-card"]',
        position: 'top',
        spotlightPadding: 12,
        action: 'hover',
    },
    {
        id: 'avatar-menu',
        title: '👤 Your Personal Hub',
        description:
            'Click your avatar to access your collections (Watch Later, Favorites), rankings, ratings, watch history, and settings.',
        targetSelector: '[data-tour="avatar-button"]',
        position: 'bottom',
        spotlightPadding: 12,
        action: 'click',
    },
    {
        id: 'collections',
        title: '📚 Custom Collections',
        description:
            'Create and manage custom collections with AI-powered smart search. Organize content by genre, mood, or any criteria you want.',
        targetSelector: 'body',
        position: 'center',
    },
    {
        id: 'rankings',
        title: '🏆 Rankings & Community',
        description:
            "Share your top 10 rankings with the community, join forum discussions, comment on others' rankings, and discover what people are watching.",
        targetSelector: 'body',
        position: 'center',
    },
    {
        id: 'child-safety',
        title: '🛡️ Child Safety Mode',
        description:
            'Enable child safety mode to filter content by rating. Set a PIN to protect settings and ensure age-appropriate viewing.',
        targetSelector: 'body',
        position: 'center',
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

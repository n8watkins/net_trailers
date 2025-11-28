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
            "Let's take a quick 60-second tour of the key features. You can skip at any time or use the arrow keys to navigate.",
        targetSelector: 'body',
        position: 'center',
        skippable: true,
    },
    {
        id: 'search',
        title: '🔍 Search Everything',
        description:
            'Search for movies and TV shows instantly. Try typing "action movies" or a specific title. Press "/" to focus the search bar from anywhere.',
        targetSelector: '#navbar-search-input, #navbar-mobile-search-input',
        position: 'bottom',
        action: 'focus',
        spotlightPadding: 12,
    },
    {
        id: 'content-cards',
        title: '🎬 Discover Content',
        description:
            'Click any poster to watch trailers, read details, and add to your collections. Hover to see quick actions.',
        targetSelector: '[data-tour="content-card"]',
        position: 'top',
        action: 'hover',
    },
    {
        id: 'collections',
        title: '📚 Your Collections',
        description:
            'Save content to Watch Later, Favorites, or create custom collections. Access them anytime from the avatar menu or collections page.',
        targetSelector: '[data-tour="avatar-button"]',
        position: 'bottom',
        spotlightPadding: 12,
        action: 'click',
    },
    {
        id: 'custom-rows',
        title: '✨ Create Custom Collections',
        description:
            'Build your own collections with genre filters, AI queries, or manual picks. Auto-updating collections refresh daily with new content!',
        targetSelector: '[data-tour="collections-link"]',
        position: 'bottom',
    },
    {
        id: 'rankings',
        title: '🏆 Share Your Rankings',
        description:
            'Create and share your top 10 lists. Browse community rankings, leave comments, and discover what others are watching.',
        targetSelector: '[data-tour="community-link"]',
        position: 'bottom',
    },
    {
        id: 'settings',
        title: '⚙️ Personalize Your Experience',
        description:
            'Customize content ratings, enable child safety mode, manage your data, and adjust your preferences in settings.',
        targetSelector: '[data-tour="settings-link"]',
        position: 'bottom',
    },
    {
        id: 'complete',
        title: "🎉 You're All Set!",
        description:
            "You've completed the tour! Explore at your own pace. You can restart this tour anytime from Help & Tutorial in the footer.",
        targetSelector: 'body',
        position: 'center',
        skippable: false,
    },
]

// Tour step count for progress tracking
export const TOTAL_TOUR_STEPS = TOUR_STEPS.length

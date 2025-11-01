/**
 * Centralized application constants
 *
 * All hardcoded values should be defined here for consistency and easy maintenance.
 */

/**
 * Toast notification configuration
 */
export const TOAST_CONFIG = {
    /** Duration in ms before toast auto-dismisses */
    DURATION: 3000,
    /** Maximum number of toasts displayed simultaneously */
    MAX_DISPLAY: 2,
    /** Duration of exit animation in ms */
    EXIT_ANIMATION_DURATION: 500,
} as const

/**
 * Cache configuration for different storage mechanisms
 */
export const CACHE_CONFIG = {
    /** TTL for main page cache (30 minutes) */
    MAIN_PAGE_TTL: 30 * 60 * 1000,
    /** TTL for Firestore cache (5 minutes) */
    FIRESTORE_TTL: 5 * 60 * 1000,
    /** SessionStorage key for main page data */
    SESSION_STORAGE_KEY: 'nettrailer-main-page-data',
    /** LocalStorage prefix for guest data */
    GUEST_DATA_PREFIX: 'nettrailer_guest_data_',
} as const

/**
 * Theme colors used throughout the application
 */
export const THEME_COLORS = {
    /** Primary Netflix red */
    NETFLIX_RED: '#E50914',
    /** Primary blue for actions */
    PRIMARY_BLUE: '#3B82F6',
    /** Success state green */
    SUCCESS_GREEN: '#10B981',
    /** Warning state yellow */
    WARNING_YELLOW: '#F59E0B',
    /** Error state red */
    ERROR_RED: '#EF4444',
    /** Info/neutral gray */
    INFO_GRAY: '#6B7280',
} as const

/**
 * User list configuration and limits
 */
export const LIST_CONFIG = {
    /** Maximum length for list names */
    MAX_NAME_LENGTH: 100,
    /** Maximum number of custom lists per user */
    MAX_LISTS_PER_USER: 50,
    /** Default watchlist ID (virtual list) */
    DEFAULT_WATCHLIST_ID: 'default-watchlist',
    /** Default watchlist name */
    DEFAULT_WATCHLIST_NAME: 'Watchlist',
    /** Default watchlist emoji */
    DEFAULT_WATCHLIST_EMOJI: '📺',
    /** Default watchlist color */
    DEFAULT_WATCHLIST_COLOR: '#E50914',
} as const

/**
 * TMDB API configuration
 */
export const TMDB_CONFIG = {
    /** API rate limit (requests per second) */
    RATE_LIMIT: 40,
    /** Base URL for TMDB images */
    IMAGE_BASE_URL: 'https://image.tmdb.org/t/p/',
    /** Available poster sizes */
    POSTER_SIZES: ['w92', 'w154', 'w185', 'w342', 'w500', 'w780', 'original'] as const,
    /** Available backdrop sizes */
    BACKDROP_SIZES: ['w300', 'w780', 'w1280', 'original'] as const,
} as const

/**
 * Firebase configuration
 */
export const FIREBASE_CONFIG = {
    /** Timeout for Firestore operations (5 seconds) */
    OPERATION_TIMEOUT: 5000,
    /** Collection name for user data */
    USERS_COLLECTION: 'users',
} as const

/**
 * Session and authentication configuration
 */
export const SESSION_CONFIG = {
    /** LocalStorage key for session persistence */
    SESSION_STORAGE_KEY: 'nettrailer_active_session',
    /** Default session type for new users */
    DEFAULT_SESSION_TYPE: 'guest' as const,
} as const

/**
 * Content and media configuration
 */
export const CONTENT_CONFIG = {
    /** Minimum search query length */
    MIN_SEARCH_LENGTH: 2,
    /** Search debounce delay in ms */
    SEARCH_DEBOUNCE_MS: 300,
    /** Items per page for paginated results */
    ITEMS_PER_PAGE: 20,
    /** Maximum pages to fetch for search results */
    MAX_SEARCH_PAGES: 10,
} as const

/**
 * User preferences defaults
 */
export const USER_PREFERENCES_DEFAULTS = {
    /** Auto-mute videos by default */
    AUTO_MUTE: true,
    /** Default volume level (0-100) */
    DEFAULT_VOLUME: 50,
    /** Child safety mode disabled by default */
    CHILD_SAFETY_MODE: false,
} as const

/**
 * Debug and logging configuration
 */
export const DEBUG_CONFIG = {
    /** Enable debug logging in development */
    ENABLE_LOGGING: process.env.NODE_ENV === 'development',
    /** Log prefix for auth operations */
    AUTH_PREFIX: '[Auth]',
    /** Log prefix for cache operations */
    CACHE_PREFIX: '[Cache]',
    /** Log prefix for session operations */
    SESSION_PREFIX: '[Session]',
} as const

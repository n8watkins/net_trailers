/**
 * Profile Page Configuration
 *
 * Centralized constants for profile pages
 */

export const PROFILE_CONFIG = {
    /** Number of items to preview in Watch Later section */
    WATCH_LATER_PREVIEW_LIMIT: 12,

    /** Number of items to preview in collections/rankings sections */
    CONTENT_PREVIEW_LIMIT: 12,

    /** Number of rankings to display on profile */
    RANKINGS_PREVIEW_COUNT: 3,

    /** Number of collections to display on profile */
    COLLECTIONS_PREVIEW_COUNT: 3,

    /** Number of forum threads to display */
    THREADS_PREVIEW_COUNT: 3,

    /** Number of polls to display */
    POLLS_PREVIEW_COUNT: 3,

    /** Number of public rankings to load (max) */
    MAX_PUBLIC_RANKINGS: 20,

    /** Number of forum thread summaries to load */
    MAX_THREAD_SUMMARIES: 10,

    /** Number of poll summaries to load */
    MAX_POLL_SUMMARIES: 10,
} as const

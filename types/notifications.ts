/**
 * Notification System Types
 *
 * Defines data structures for in-app notifications.
 * Supports different notification types with metadata and actions.
 */

/**
 * Notification types
 */
export type NotificationType =
    | 'collection_update' // New content added to followed collection
    | 'new_release' // Movie/show from watchlist released
    | 'trending_update' // New content entered trending
    | 'system' // App updates, announcements

/**
 * Notification
 *
 * Represents a single notification for a user.
 * Stored in Firestore at /users/{userId}/notifications/{notificationId}
 */
export interface Notification {
    /** Unique notification ID */
    id: string

    /** User ID this notification belongs to */
    userId: string

    /** Type of notification */
    type: NotificationType

    /** Notification title (short) */
    title: string

    /** Notification message (detailed) */
    message: string

    /** Related TMDB content ID (if applicable) */
    contentId?: number

    /** Media type for content (movie or tv) */
    mediaType?: 'movie' | 'tv'

    /** Related collection ID (if applicable) */
    collectionId?: string

    /** Share ID (for share_activity notifications) */
    shareId?: string

    /** Deep link URL (e.g., /collections/{id}, /shared/{shareId}) */
    actionUrl?: string

    /** Poster image URL for visual appeal */
    imageUrl?: string

    /** Whether notification has been read */
    isRead: boolean

    /** Creation timestamp */
    createdAt: number

    /** Expiration timestamp (auto-delete old notifications) */
    expiresAt?: number
}

/**
 * Notification creation request
 */
export interface CreateNotificationRequest {
    type: NotificationType
    title: string
    message: string
    contentId?: number
    mediaType?: 'movie' | 'tv'
    collectionId?: string
    shareId?: string
    actionUrl?: string
    imageUrl?: string
    expiresIn?: number // Days until expiration (default: 30)
}

/**
 * Notification statistics
 */
export interface NotificationStats {
    /** Total notifications */
    total: number

    /** Unread notifications */
    unread: number

    /** Notifications by type */
    byType: {
        collection_update: number
        new_release: number
        trending_update: number
        system: number
    }

    /** Most recent notification */
    mostRecent?: Notification
}

/**
 * Notification preferences (future feature)
 */
export interface NotificationPreferences {
    /** Enable in-app notifications */
    inApp: boolean

    /** Enable email notifications */
    email: boolean

    /** Enable push notifications */
    push: boolean

    /** Notification types to receive */
    types: {
        collection_update: boolean
        new_release: boolean
        trending_update: boolean
        system: boolean
    }

    /** Email digest frequency */
    emailDigest: 'instant' | 'daily' | 'weekly' | 'never'
}

/**
 * Default notification preferences
 */
export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
    inApp: true,
    email: false, // Disabled by default (not implemented yet)
    push: false, // Disabled by default (not implemented yet)
    types: {
        collection_update: true,
        new_release: true,
        trending_update: false, // Disabled by default (opt-in required)
        system: true,
    },
    emailDigest: 'never',
}

/**
 * Notification constraints
 */
export const NOTIFICATION_CONSTRAINTS = {
    /** Maximum notifications to keep per user */
    MAX_NOTIFICATIONS: 100,

    /** Default expiration (days) */
    DEFAULT_EXPIRATION_DAYS: 30,

    /** Fetch limit for notification list */
    FETCH_LIMIT: 50,

    /** Auto-cleanup threshold (days) */
    CLEANUP_THRESHOLD_DAYS: 60,
} as const

/**
 * Notification icons/colors by type
 */
export const NOTIFICATION_META = {
    collection_update: {
        icon: 'SparklesIcon', // HeroIcon name
        color: 'text-purple-500',
        bgColor: 'bg-purple-600/20',
    },
    new_release: {
        icon: 'FilmIcon',
        color: 'text-blue-500',
        bgColor: 'bg-blue-600/20',
    },
    trending_update: {
        icon: 'FireIcon',
        color: 'text-orange-500',
        bgColor: 'bg-orange-600/20',
    },
    system: {
        icon: 'BellIcon',
        color: 'text-gray-500',
        bgColor: 'bg-gray-600/20',
    },
} as const

/**
 * Collection Sharing Types
 *
 * Defines data structures for sharing collections with others via unique links.
 * Supports expiration, view tracking, and access control.
 */

/**
 * Shareable Link
 *
 * Represents a unique share link for a collection.
 * Stored in Firestore at /shares/{shareId}
 */
export interface ShareableLink {
    /** Unique share ID (nanoid or uuid) */
    id: string

    /** Collection being shared */
    collectionId: string

    /** Owner user ID */
    userId: string

    /** Collection name (denormalized for performance) */
    collectionName: string

    /** Number of items in collection (denormalized) */
    itemCount: number

    /** Timestamp when link was created */
    createdAt: number

    /** Timestamp when link expires (null = never expires) */
    expiresAt: number | null

    /** Whether link is active (can be deactivated without deleting) */
    isActive: boolean

    /** Number of times this link has been viewed */
    viewCount: number

    /** Allow viewers to duplicate collection to their account */
    allowDuplicates: boolean

    /** Share settings */
    settings: ShareSettings
}

/**
 * Share Settings
 *
 * Controls visibility and features for shared collections
 */
export interface ShareSettings {
    /** Visibility level */
    visibility: 'private' | 'public' | 'link-only'

    /** Show owner's display name on shared page */
    showOwnerName: boolean

    /** Allow comments (future feature) */
    allowComments: boolean
}

/**
 * Default share settings
 */
export const DEFAULT_SHARE_SETTINGS: ShareSettings = {
    visibility: 'link-only', // Default to link-only (not discoverable)
    showOwnerName: true, // Show creator by default
    allowComments: false, // Comments not implemented yet
}

/**
 * Share expiration options
 */
export type ShareExpirationOption = 'never' | '7days' | '30days' | '90days'

/**
 * Share expiration durations in milliseconds
 */
export const SHARE_EXPIRATION_DURATIONS: Record<ShareExpirationOption, number | null> = {
    never: null,
    '7days': 7 * 24 * 60 * 60 * 1000, // 7 days
    '30days': 30 * 24 * 60 * 60 * 1000, // 30 days
    '90days': 90 * 24 * 60 * 60 * 1000, // 90 days
}

/**
 * Share creation request
 */
export interface CreateShareRequest {
    /** Collection ID to share */
    collectionId: string

    /** Expiration option */
    expiresIn?: ShareExpirationOption

    /** Share settings */
    settings?: Partial<ShareSettings>

    /** Allow duplicates */
    allowDuplicates?: boolean
}

/**
 * Share creation response
 */
export interface CreateShareResponse {
    /** Generated share ID */
    shareId: string

    /** Full shareable URL */
    shareUrl: string

    /** Created share link object */
    share: ShareableLink
}

/**
 * Shared collection data (for public view)
 */
export interface SharedCollectionData {
    /** Share link metadata */
    share: ShareableLink

    /** Collection content IDs */
    contentIds: number[]

    /** Owner display name (if settings allow) */
    ownerName?: string

    /** Whether viewer can duplicate */
    canDuplicate: boolean
}

/**
 * Share validation result
 */
export interface ShareValidationResult {
    /** Whether share is valid and accessible */
    valid: boolean

    /** Error message if invalid */
    error?: string

    /** Share data if valid */
    share?: ShareableLink
}

/**
 * Share statistics
 */
export interface ShareStats {
    /** Total shares created by user */
    totalShares: number

    /** Active shares */
    activeShares: number

    /** Total views across all shares */
    totalViews: number

    /** Most viewed share */
    mostViewedShare?: {
        shareId: string
        collectionName: string
        viewCount: number
    }
}

/**
 * Share constraints
 */
export const SHARE_CONSTRAINTS = {
    /** Maximum shares per user */
    MAX_SHARES_PER_USER: 50,

    /** Maximum active shares per user */
    MAX_ACTIVE_SHARES: 25,

    /** Minimum shareId length */
    MIN_SHARE_ID_LENGTH: 8,

    /** Maximum shareId length */
    MAX_SHARE_ID_LENGTH: 32,

    /** View count increment cooldown (ms) - prevent spam */
    VIEW_COUNT_COOLDOWN: 60 * 1000, // 1 minute
} as const

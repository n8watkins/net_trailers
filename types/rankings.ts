import { Content } from '../typings'
import { ShareSettings } from './sharing'

// Re-export Content for convenience
export type { Content }

/**
 * Individual ranked item in a ranking
 * Position determines the order (1 = first place, 2 = second, etc.)
 */
export interface RankedItem {
    position: number // 1, 2, 3, ...
    content: Content // Movie or TVShow
    note?: string // Optional user commentary on why this is ranked here
    addedAt: number // Timestamp when added
}

/**
 * Main Ranking interface
 * Rankings are finite, ordered lists that users create and share
 * Public by default but can be made private
 */
export interface Ranking {
    // Core identification
    id: string
    userId: string // Creator's user ID
    userName: string // Creator's display name (for community display)
    userAvatar: string | null // Creator's avatar URL (for community display)
    userUsername?: string // Creator's unique username for profile links

    // Content
    title: string // e.g., "Top 10 Psychological Thrillers"
    description?: string // Optional context about the ranking
    rankedItems: RankedItem[] // Ordered array of ranked content

    // Settings
    isPublic: boolean // Default: true
    itemCount: number // How many items in this ranking (5, 10, 20, etc.)

    // Timestamps
    createdAt: number
    updatedAt: number

    // Engagement metrics (only meaningful for public rankings)
    likes: number // Total like count
    comments: number // Total comment count
    views: number // Total view count

    // Search optimization (denormalized for faster queries)
    contentIds: number[] // All TMDB content IDs in this ranking
    contentTitles: string[] // All content titles (for search)

    // Sharing
    shareSettings?: ShareSettings
    sharedLinkId?: string // Active share link ID
}

/**
 * Comment on a ranking
 * Can be on the overall ranking OR on a specific position
 * Supports one level of replies
 */
export interface RankingComment {
    id: string
    rankingId: string
    userId: string
    userName: string // Display name
    userAvatar: string | null // Avatar URL

    // Comment type and target
    type: 'ranking' | 'position' // Overall ranking or specific position
    positionNumber?: number | null // If type='position', which position (1, 2, 3, etc.)

    // Content
    text: string

    // Timestamps
    createdAt: number
    updatedAt?: number

    // Engagement
    likes: number // Comment likes

    // One level of replies
    replies?: RankingComment[] // Nested comments (one level only)
    parentCommentId?: string | null // If this is a reply, parent comment ID
}

/**
 * Like record for a ranking
 */
export interface RankingLike {
    id: string
    rankingId: string
    userId: string
    likedAt: number
}

/**
 * Like record for a comment
 */
export interface CommentLike {
    id: string
    commentId: string
    userId: string
    likedAt: number
}

/**
 * Request type for creating a new ranking
 */
export interface CreateRankingRequest {
    title: string
    description?: string
    isPublic?: boolean // Defaults to true
    itemCount: number // 5, 10, 20, etc.
}

/**
 * Request type for updating an existing ranking
 */
export interface UpdateRankingRequest {
    id: string
    title?: string
    description?: string
    isPublic?: boolean
    itemCount?: number
    rankedItems?: RankedItem[]
}

/**
 * Request type for adding content to a ranking
 */
export interface AddToRankingRequest {
    rankingId: string
    content: Content
    position: number // Where to insert (1-based)
    note?: string
}

/**
 * Request type for removing content from a ranking
 */
export interface RemoveFromRankingRequest {
    rankingId: string
    contentId: number
}

/**
 * Request type for reordering items in a ranking
 */
export interface ReorderRankingRequest {
    rankingId: string
    rankedItems: RankedItem[] // New ordered array
}

/**
 * Request type for creating a comment
 */
export interface CreateCommentRequest {
    rankingId: string
    type: 'ranking' | 'position'
    positionNumber?: number
    text: string
    parentCommentId?: string // For replies
}

/**
 * Validation constraints for rankings
 */
export const RANKING_CONSTRAINTS = {
    MAX_RANKINGS_PER_AUTH_USER: 50, // Authenticated users can create up to 50 rankings
    MAX_RANKINGS_PER_GUEST_USER: 0, // Guest users cannot create rankings (view only)
    MIN_ITEM_COUNT: 3,
    MAX_ITEM_COUNT: 100,
    DEFAULT_ITEM_COUNT: 10,
    MIN_TITLE_LENGTH: 5,
    MAX_TITLE_LENGTH: 100,
    MAX_DESCRIPTION_LENGTH: 500,
    MAX_NOTE_LENGTH: 200,
    MAX_COMMENT_LENGTH: 500,
    MAX_REPLIES_PER_COMMENT: 50, // Maximum replies per comment (prevents document size issues)
    MAX_TAGS: 10,
    MAX_TAG_LENGTH: 30,
} as const

/**
 * Helper to check if user can create rankings
 */
export function canCreateRankings(isGuest: boolean): boolean {
    return !isGuest // Only auth users can create
}

/**
 * Helper to get max rankings based on user type
 */
export function getMaxRankingsForUser(isGuest: boolean): number {
    return isGuest
        ? RANKING_CONSTRAINTS.MAX_RANKINGS_PER_GUEST_USER
        : RANKING_CONSTRAINTS.MAX_RANKINGS_PER_AUTH_USER
}

/**
 * Validation errors for ranking operations
 */
export type RankingValidationError =
    | 'MAX_RANKINGS_EXCEEDED'
    | 'AUTH_REQUIRED'
    | 'TITLE_TOO_SHORT'
    | 'TITLE_TOO_LONG'
    | 'DESCRIPTION_TOO_LONG'
    | 'NOTE_TOO_LONG'
    | 'COMMENT_TOO_LONG'
    | 'ITEM_COUNT_TOO_LOW'
    | 'ITEM_COUNT_TOO_HIGH'
    | 'INVALID_POSITION'
    | 'DUPLICATE_CONTENT'
    | 'TOO_MANY_TAGS'
    | 'TAG_TOO_LONG'
    | 'NOT_OWNER'
    | 'RANKING_NOT_FOUND'
    | 'CONTENT_NOT_IN_RANKING'

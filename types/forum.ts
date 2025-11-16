/**
 * Forum Types
 *
 * Type definitions for community forum features including
 * discussion threads, polls, and enhanced user profiles
 */

import { Timestamp } from 'firebase/firestore'

// Forum Categories
export type ForumCategory =
    | 'general'
    | 'movies'
    | 'tv-shows'
    | 'recommendations'
    | 'rankings'
    | 'announcements'

export interface CategoryInfo {
    id: ForumCategory
    name: string
    description: string
    icon: string
    color: string
}

// Discussion Thread
export interface Thread {
    id: string
    title: string
    content: string
    category: ForumCategory
    userId: string
    userName: string
    userAvatar?: string
    createdAt: Timestamp
    updatedAt: Timestamp
    isPinned: boolean
    isLocked: boolean
    views: number
    replyCount: number
    lastReplyAt?: Timestamp
    lastReplyBy?: {
        userId: string
        userName: string
    }
    tags?: string[]
    likes: number
    images?: string[] // Image URLs uploaded with the thread
}

// Thread Reply
export interface ThreadReply {
    id: string
    threadId: string
    content: string
    userId: string
    userName: string
    userAvatar?: string
    createdAt: Timestamp
    updatedAt?: Timestamp
    isEdited: boolean
    likes: number
    // For nested replies
    parentReplyId?: string
    mentions?: string[] // userIds mentioned in reply
    images?: string[] // Image URLs uploaded with the reply
}

// Poll
export interface Poll {
    id: string
    question: string
    description?: string
    category: ForumCategory
    userId: string
    userName: string
    userAvatar?: string
    createdAt: Timestamp
    expiresAt?: Timestamp
    options: PollOption[]
    totalVotes: number
    isMultipleChoice: boolean
    allowAddOptions: boolean
    tags?: string[]
}

export interface PollOption {
    id: string
    text: string
    votes: number
    percentage: number
}

export interface PollVote {
    id: string
    pollId: string
    userId: string
    optionIds: string[] // Can be multiple if poll allows
    votedAt: Timestamp
}

// Thread summary for profile pages (without Firestore Timestamp dependencies)
export interface ThreadSummary {
    id: string
    title: string
    content: string
    category: ForumCategory
    likes: number
    views: number
    replyCount: number
    createdAt: number | null
    updatedAt: number | null
}

// Poll summary for profile pages (without Firestore Timestamp dependencies)
export interface PollSummary {
    id: string
    question: string
    category: ForumCategory
    totalVotes: number
    isMultipleChoice: boolean
    allowAddOptions: boolean
    options: PollOptionSummary[]
    createdAt: number | null
    expiresAt: number | null
}

// Poll option summary (without percentage calculation needed)
export interface PollOptionSummary {
    id: string
    text: string
    votes: number
    percentage?: number
}

// User Activity for Enhanced Profiles
export interface UserActivity {
    id: string
    userId: string
    type: ActivityType
    timestamp: Timestamp
    // Reference to the activity item
    referenceId: string
    referenceType: 'thread' | 'reply' | 'poll' | 'ranking' | 'comment'
    // Preview data for display
    preview: {
        title: string
        content?: string
        imageUrl?: string
    }
}

export type ActivityType =
    | 'created_thread'
    | 'replied_to_thread'
    | 'created_poll'
    | 'voted_on_poll'
    | 'created_ranking'
    | 'commented_on_ranking'
    | 'liked_thread'
    | 'liked_reply'

// User Badge System
export interface UserBadge {
    id: string
    name: string
    description: string
    icon: string
    color: string
    unlockedAt: Timestamp
}

export type BadgeType =
    | 'first_post'
    | 'first_ranking'
    | 'contributor'
    | 'popular_creator'
    | 'discussion_starter'
    | 'helpful'
    | 'early_adopter'

// User Following
export interface UserFollow {
    id: string
    followerId: string
    followingId: string
    createdAt: Timestamp
}

// Enhanced User Profile Stats
export interface UserStats {
    userId: string
    threadsCreated: number
    repliesPosted: number
    pollsCreated: number
    rankingsCreated: number
    totalLikesReceived: number
    followersCount: number
    followingCount: number
    badges: BadgeType[]
    joinedAt: Timestamp
    lastActive: Timestamp
}

// Thread Like
export interface ThreadLike {
    id: string
    threadId: string
    userId: string
    createdAt: Timestamp
}

// Reply Like
export interface ReplyLike {
    id: string
    replyId: string
    userId: string
    createdAt: Timestamp
}

// Forum Sorting Options
export type ForumSortBy = 'recent' | 'popular' | 'most-replied' | 'trending'

// Forum Filter State
export interface ForumFilters {
    category: ForumCategory | 'all'
    sortBy: ForumSortBy
    searchQuery: string
    tags: string[]
}

// Report/Flag Content
export type ReportReason =
    | 'spam'
    | 'harassment'
    | 'inappropriate'
    | 'misinformation'
    | 'off-topic'
    | 'other'

export type ReportContentType = 'thread' | 'reply' | 'poll'

export interface ContentReport {
    id: string
    contentId: string
    contentType: ReportContentType
    reportedBy: string
    reporterName: string
    reason: ReportReason
    details?: string
    createdAt: Timestamp
    status: 'pending' | 'reviewed' | 'resolved' | 'dismissed'
    reviewedBy?: string
    reviewedAt?: Timestamp
}

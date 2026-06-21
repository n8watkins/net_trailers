/**
 * Drizzle schema for Turso (libSQL / SQLite).
 *
 * Replaces the Firestore data model. Two groups of tables:
 *  - Auth.js adapter tables (`user`, `account`, `session`, `verificationToken`)
 *  - Application tables (migrated 1:1 from the former Firestore collections)
 *
 * Nested arrays / objects that Firestore stored inside a document
 * (e.g. `Content[]`, `rankedItems`, poll `options`, `advancedFilters`) are
 * stored as JSON text columns (`{ mode: 'json' }`). Epoch-millisecond numbers
 * are stored as plain integers to match the existing `number` timestamps used
 * throughout the app's types.
 */

import { sql } from 'drizzle-orm'
import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'
import type { AdapterAccountType } from 'next-auth/adapters'

import type { Content } from '@/typings'
import type { AdvancedFilters, UserList } from '@/types/collections'
import type { PollOption } from '@/types/forum'
import type { NotificationPreferences } from '@/types/notifications'
import type { ProfileVisibility } from '@/types/profile'
import type { RankedItem } from '@/types/rankings'
import type { ShareSettings } from '@/types/sharing'
import type { UserPreferences } from '@/types/shared'

const uuid = () => crypto.randomUUID()

/* -------------------------------------------------------------------------- */
/*  Auth.js (NextAuth v5) adapter tables                                       */
/* -------------------------------------------------------------------------- */

export const users = sqliteTable('user', {
    id: text('id').primaryKey().$defaultFn(uuid),
    name: text('name'),
    email: text('email').unique(),
    emailVerified: integer('emailVerified', { mode: 'timestamp_ms' }),
    image: text('image'),
    // GitHub login handle, stamped from the OAuth profile in the signIn callback.
    // Used for admin identification (ADMIN_GITHUB_LOGIN) without needing the
    // generated user id up front.
    githubLogin: text('githubLogin'),
})

export const accounts = sqliteTable(
    'account',
    {
        userId: text('userId')
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),
        type: text('type').$type<AdapterAccountType>().notNull(),
        provider: text('provider').notNull(),
        providerAccountId: text('providerAccountId').notNull(),
        refresh_token: text('refresh_token'),
        access_token: text('access_token'),
        expires_at: integer('expires_at'),
        token_type: text('token_type'),
        scope: text('scope'),
        id_token: text('id_token'),
        session_state: text('session_state'),
    },
    (account) => [primaryKey({ columns: [account.provider, account.providerAccountId] })]
)

export const sessions = sqliteTable('session', {
    sessionToken: text('sessionToken').primaryKey(),
    userId: text('userId')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    expires: integer('expires', { mode: 'timestamp_ms' }).notNull(),
})

export const verificationTokens = sqliteTable(
    'verificationToken',
    {
        identifier: text('identifier').notNull(),
        token: text('token').notNull(),
        expires: integer('expires', { mode: 'timestamp_ms' }).notNull(),
    },
    (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })]
)

/* -------------------------------------------------------------------------- */
/*  User data                                                                  */
/* -------------------------------------------------------------------------- */

/** The former `users/{userId}` document blob (watchlists, ratings, settings). */
export const userPreferences = sqliteTable('user_preferences', {
    userId: text('userId')
        .primaryKey()
        .references(() => users.id, { onDelete: 'cascade' }),
    data: text('data', { mode: 'json' }).$type<UserPreferences>().notNull(),
    updatedAt: integer('updatedAt').notNull(),
})

export const profiles = sqliteTable(
    'profiles',
    {
        userId: text('userId')
            .primaryKey()
            .references(() => users.id, { onDelete: 'cascade' }),
        email: text('email'),
        displayName: text('displayName'),
        username: text('username').unique(),
        avatarUrl: text('avatarUrl'),
        avatarSource: text('avatarSource'),
        description: text('description'),
        favoriteGenres: text('favoriteGenres', { mode: 'json' }).$type<string[]>(),
        rankingsCount: integer('rankingsCount').notNull().default(0),
        publicCollectionsCount: integer('publicCollectionsCount').notNull().default(0),
        totalLikes: integer('totalLikes').notNull().default(0),
        totalViews: integer('totalViews').notNull().default(0),
        isPublic: integer('isPublic', { mode: 'boolean' }).notNull().default(false),
        visibility: text('visibility', { mode: 'json' }).$type<ProfileVisibility>(),
        createdAt: integer('createdAt').notNull(),
        updatedAt: integer('updatedAt').notNull(),
        lastLoginAt: integer('lastLoginAt'),
    },
    (t) => [index('profiles_username_idx').on(t.username)]
)

export const interactions = sqliteTable(
    'interactions',
    {
        id: text('id').primaryKey().$defaultFn(uuid),
        userId: text('userId')
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),
        contentId: integer('contentId').notNull(),
        mediaType: text('mediaType').notNull(),
        interactionType: text('interactionType').notNull(),
        genreIds: text('genreIds', { mode: 'json' }).$type<number[]>(),
        timestamp: integer('timestamp').notNull(),
        trailerDuration: integer('trailerDuration'),
        searchQuery: text('searchQuery'),
        collectionId: text('collectionId'),
        source: text('source'),
    },
    (t) => [
        index('interactions_user_idx').on(t.userId),
        index('interactions_user_ts_idx').on(t.userId, t.timestamp),
    ]
)

/** Aggregated interaction summary (one row per user). */
export const interactionSummary = sqliteTable('interaction_summary', {
    userId: text('userId')
        .primaryKey()
        .references(() => users.id, { onDelete: 'cascade' }),
    totalInteractions: integer('totalInteractions').notNull().default(0),
    genrePreferences: text('genrePreferences', { mode: 'json' }),
    topContentIds: text('topContentIds', { mode: 'json' }).$type<number[]>(),
    lastUpdated: integer('lastUpdated').notNull(),
})

export const notifications = sqliteTable(
    'notifications',
    {
        id: text('id').primaryKey().$defaultFn(uuid),
        userId: text('userId')
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),
        type: text('type').notNull(),
        title: text('title'),
        message: text('message'),
        isRead: integer('isRead', { mode: 'boolean' }).notNull().default(false),
        createdAt: integer('createdAt').notNull(),
        data: text('data', { mode: 'json' }),
    },
    (t) => [
        index('notifications_user_idx').on(t.userId),
        index('notifications_user_created_idx').on(t.userId, t.createdAt),
    ]
)

export const watchHistory = sqliteTable(
    'watch_history',
    {
        id: text('id').primaryKey().$defaultFn(uuid),
        userId: text('userId')
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),
        contentId: integer('contentId').notNull(),
        mediaType: text('mediaType').notNull(),
        watchedAt: integer('watchedAt').notNull(),
        content: text('content', { mode: 'json' }).$type<Content>(),
    },
    (t) => [
        index('watch_history_user_idx').on(t.userId),
        index('watch_history_user_watched_idx').on(t.userId, t.watchedAt),
    ]
)

/** Child-safety PIN (bcrypt hash). Was `users/{userId}/settings/childSafety`. */
export const childSafetyPins = sqliteTable('child_safety_pins', {
    userId: text('userId')
        .primaryKey()
        .references(() => users.id, { onDelete: 'cascade' }),
    pinHash: text('pinHash').notNull(),
    updatedAt: integer('updatedAt').notNull(),
})

/* -------------------------------------------------------------------------- */
/*  Rankings                                                                   */
/* -------------------------------------------------------------------------- */

export const rankings = sqliteTable(
    'rankings',
    {
        id: text('id').primaryKey().$defaultFn(uuid),
        userId: text('userId')
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),
        userName: text('userName'),
        userAvatar: text('userAvatar'),
        userUsername: text('userUsername'),
        title: text('title').notNull(),
        description: text('description'),
        rankedItems: text('rankedItems', { mode: 'json' }).$type<RankedItem[]>().notNull(),
        isPublic: integer('isPublic', { mode: 'boolean' }).notNull().default(false),
        itemCount: integer('itemCount').notNull().default(0),
        createdAt: integer('createdAt').notNull(),
        updatedAt: integer('updatedAt').notNull(),
        likes: integer('likes').notNull().default(0),
        comments: integer('comments').notNull().default(0),
        views: integer('views').notNull().default(0),
        contentIds: text('contentIds', { mode: 'json' }).$type<number[]>(),
        contentTitles: text('contentTitles', { mode: 'json' }).$type<string[]>(),
        shareSettings: text('shareSettings', { mode: 'json' }).$type<ShareSettings>(),
        sharedLinkId: text('sharedLinkId'),
    },
    (t) => [
        index('rankings_user_idx').on(t.userId),
        index('rankings_public_created_idx').on(t.isPublic, t.createdAt),
    ]
)

export const rankingComments = sqliteTable(
    'ranking_comments',
    {
        id: text('id').primaryKey().$defaultFn(uuid),
        rankingId: text('rankingId').notNull(),
        userId: text('userId')
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),
        userName: text('userName'),
        userAvatar: text('userAvatar'),
        type: text('type').notNull().default('ranking'),
        positionNumber: integer('positionNumber'),
        text: text('text').notNull(),
        parentCommentId: text('parentCommentId'),
        likes: integer('likes').notNull().default(0),
        createdAt: integer('createdAt').notNull(),
        updatedAt: integer('updatedAt'),
    },
    (t) => [
        index('ranking_comments_ranking_idx').on(t.rankingId),
        index('ranking_comments_user_idx').on(t.userId),
    ]
)

export const rankingLikes = sqliteTable(
    'ranking_likes',
    {
        id: text('id').primaryKey().$defaultFn(uuid),
        rankingId: text('rankingId').notNull(),
        userId: text('userId')
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),
        createdAt: integer('createdAt').notNull(),
    },
    // UNIQUE so a double-like conflicts (onConflictDoNothing) instead of
    // inserting a duplicate row + inflating the denormalised counter.
    (t) => [uniqueIndex('ranking_likes_ranking_user_idx').on(t.rankingId, t.userId)]
)

export const commentLikes = sqliteTable(
    'comment_likes',
    {
        id: text('id').primaryKey().$defaultFn(uuid),
        commentId: text('commentId').notNull(),
        userId: text('userId')
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),
        createdAt: integer('createdAt').notNull(),
    },
    (t) => [uniqueIndex('comment_likes_comment_user_idx').on(t.commentId, t.userId)]
)

/* -------------------------------------------------------------------------- */
/*  Forum: threads, replies, polls, votes                                      */
/* -------------------------------------------------------------------------- */

export const threads = sqliteTable(
    'threads',
    {
        id: text('id').primaryKey().$defaultFn(uuid),
        title: text('title').notNull(),
        content: text('content').notNull(),
        category: text('category').notNull(),
        userId: text('userId')
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),
        userName: text('userName'),
        userAvatar: text('userAvatar'),
        createdAt: integer('createdAt').notNull(),
        updatedAt: integer('updatedAt').notNull(),
        isPinned: integer('isPinned', { mode: 'boolean' }).notNull().default(false),
        isLocked: integer('isLocked', { mode: 'boolean' }).notNull().default(false),
        views: integer('views').notNull().default(0),
        replyCount: integer('replyCount').notNull().default(0),
        lastReplyAt: integer('lastReplyAt'),
        lastReplyBy: text('lastReplyBy', { mode: 'json' }),
        tags: text('tags', { mode: 'json' }).$type<string[]>(),
        likes: integer('likes').notNull().default(0),
        images: text('images', { mode: 'json' }).$type<string[]>(),
    },
    (t) => [
        index('threads_user_idx').on(t.userId),
        index('threads_category_created_idx').on(t.category, t.createdAt),
    ]
)

export const threadReplies = sqliteTable(
    'thread_replies',
    {
        id: text('id').primaryKey().$defaultFn(uuid),
        threadId: text('threadId').notNull(),
        userId: text('userId')
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),
        userName: text('userName'),
        userAvatar: text('userAvatar'),
        content: text('content').notNull(),
        createdAt: integer('createdAt').notNull(),
        updatedAt: integer('updatedAt'),
        isEdited: integer('isEdited', { mode: 'boolean' }).notNull().default(false),
        likes: integer('likes').notNull().default(0),
        parentReplyId: text('parentReplyId'),
        mentions: text('mentions', { mode: 'json' }).$type<string[]>(),
        images: text('images', { mode: 'json' }).$type<string[]>(),
    },
    (t) => [
        index('thread_replies_thread_idx').on(t.threadId),
        index('thread_replies_user_idx').on(t.userId),
    ]
)

export const threadLikes = sqliteTable(
    'thread_likes',
    {
        id: text('id').primaryKey().$defaultFn(uuid),
        threadId: text('threadId').notNull(),
        userId: text('userId')
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),
        createdAt: integer('createdAt').notNull(),
    },
    (t) => [
        uniqueIndex('thread_likes_thread_user_idx').on(t.threadId, t.userId),
        // Leading-userId index for the "threads liked by user" lookups
        // (getLikedThreadIds, public-profile "threads voted").
        index('thread_likes_user_idx').on(t.userId),
    ]
)

export const replyLikes = sqliteTable(
    'reply_likes',
    {
        id: text('id').primaryKey().$defaultFn(uuid),
        replyId: text('replyId').notNull(),
        userId: text('userId')
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),
        createdAt: integer('createdAt').notNull(),
    },
    (t) => [uniqueIndex('reply_likes_reply_user_idx').on(t.replyId, t.userId)]
)

export const polls = sqliteTable(
    'polls',
    {
        id: text('id').primaryKey().$defaultFn(uuid),
        question: text('question').notNull(),
        description: text('description'),
        category: text('category').notNull(),
        userId: text('userId')
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),
        userName: text('userName'),
        userAvatar: text('userAvatar'),
        createdAt: integer('createdAt').notNull(),
        expiresAt: integer('expiresAt'),
        options: text('options', { mode: 'json' }).$type<PollOption[]>().notNull(),
        totalVotes: integer('totalVotes').notNull().default(0),
        isMultipleChoice: integer('isMultipleChoice', { mode: 'boolean' }).notNull().default(false),
        allowAddOptions: integer('allowAddOptions', { mode: 'boolean' }).notNull().default(false),
        isHidden: integer('isHidden', { mode: 'boolean' }).notNull().default(false),
        tags: text('tags', { mode: 'json' }).$type<string[]>(),
    },
    (t) => [
        index('polls_user_idx').on(t.userId),
        index('polls_category_created_idx').on(t.category, t.createdAt),
    ]
)

export const pollVotes = sqliteTable(
    'poll_votes',
    {
        id: text('id').primaryKey().$defaultFn(uuid),
        pollId: text('pollId').notNull(),
        userId: text('userId')
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),
        optionIds: text('optionIds', { mode: 'json' }).$type<string[]>().notNull(),
        votedAt: integer('votedAt').notNull(),
    },
    (t) => [
        // UNIQUE: one vote row per (poll, user).
        uniqueIndex('poll_votes_poll_user_idx').on(t.pollId, t.userId),
        // Leading-userId index for "polls voted by user" (public profile).
        index('poll_votes_user_idx').on(t.userId),
    ]
)

/* -------------------------------------------------------------------------- */
/*  Social & misc                                                              */
/* -------------------------------------------------------------------------- */

export const shares = sqliteTable(
    'shares',
    {
        id: text('id').primaryKey().$defaultFn(uuid),
        collectionId: text('collectionId').notNull(),
        userId: text('userId')
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),
        collectionName: text('collectionName'),
        itemCount: integer('itemCount').notNull().default(0),
        createdAt: integer('createdAt').notNull(),
        expiresAt: integer('expiresAt'),
        isActive: integer('isActive', { mode: 'boolean' }).notNull().default(true),
        viewCount: integer('viewCount').notNull().default(0),
        lastViewedAt: integer('lastViewedAt'),
        allowDuplicates: integer('allowDuplicates', { mode: 'boolean' }).notNull().default(false),
        settings: text('settings', { mode: 'json' }).$type<ShareSettings>(),
        // Snapshot of the shared collection content (public read).
        snapshot: text('snapshot', { mode: 'json' }).$type<{
            items: Content[]
            advancedFilters?: AdvancedFilters
            collection?: UserList
        }>(),
    },
    (t) => [index('shares_user_idx').on(t.userId), index('shares_active_idx').on(t.isActive)]
)

export const userActivity = sqliteTable(
    'user_activity',
    {
        id: text('id').primaryKey().$defaultFn(uuid),
        userId: text('userId')
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),
        type: text('type').notNull(),
        timestamp: integer('timestamp').notNull(),
        referenceId: text('referenceId'),
        referenceType: text('referenceType'),
        preview: text('preview', { mode: 'json' }),
    },
    (t) => [
        index('user_activity_user_idx').on(t.userId),
        index('user_activity_user_ts_idx').on(t.userId, t.timestamp),
    ]
)

export const userBadges = sqliteTable(
    'user_badges',
    {
        id: text('id').primaryKey().$defaultFn(uuid),
        userId: text('userId')
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),
        name: text('name').notNull(),
        description: text('description'),
        icon: text('icon'),
        color: text('color'),
        unlockedAt: integer('unlockedAt').notNull(),
    },
    (t) => [index('user_badges_user_idx').on(t.userId)]
)

export const userFollows = sqliteTable(
    'user_follows',
    {
        id: text('id').primaryKey().$defaultFn(uuid),
        followerId: text('followerId')
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),
        followingId: text('followingId')
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),
        createdAt: integer('createdAt').notNull(),
    },
    (t) => [
        index('user_follows_follower_idx').on(t.followerId),
        index('user_follows_following_idx').on(t.followingId),
        index('user_follows_pair_idx').on(t.followerId, t.followingId),
    ]
)

export const contentReports = sqliteTable(
    'content_reports',
    {
        id: text('id').primaryKey().$defaultFn(uuid),
        contentId: text('contentId').notNull(),
        contentType: text('contentType').notNull(),
        reportedBy: text('reportedBy')
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),
        reporterName: text('reporterName'),
        reason: text('reason').notNull(),
        details: text('details'),
        createdAt: integer('createdAt').notNull(),
        status: text('status').notNull().default('pending'),
        reviewedBy: text('reviewedBy'),
        reviewedAt: integer('reviewedAt'),
    },
    (t) => [index('content_reports_reporter_idx').on(t.reportedBy)]
)

/** Admin email send history (counts only — PII minimised). */
export const adminEmails = sqliteTable('admin_emails', {
    id: text('id').primaryKey().$defaultFn(uuid),
    type: text('type').notNull(),
    subject: text('subject'),
    sentCount: integer('sentCount').notNull().default(0),
    failedCount: integer('failedCount').notNull().default(0),
    targetFilter: text('targetFilter'),
    sentAt: integer('sentAt').notNull(),
    sentBy: text('sentBy'),
})

export const signupLog = sqliteTable(
    'signup_log',
    {
        id: text('id').primaryKey().$defaultFn(uuid),
        userId: text('userId'),
        email: text('email'),
        timestamp: integer('timestamp')
            .notNull()
            .default(sql`(unixepoch() * 1000)`),
    },
    (t) => [index('signup_log_user_idx').on(t.userId)]
)

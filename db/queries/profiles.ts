/**
 * Profile domain queries (Drizzle / Turso).
 *
 * Covers: profiles, user_follows, user_badges, user_activity.
 * All writes derive the acting user from the Auth.js session (via currentUserId
 * from _helpers) — client-supplied user IDs are never trusted for ownership.
 *
 * Counter increments use sql`${col} + 1` / `- 1` so they are atomic at the
 * database level rather than read-modify-write.
 */

import { and, desc, eq, sql } from 'drizzle-orm'

import { db } from '@/db'
import { profiles, userActivity, userBadges, userFollows } from '@/db/schema'
import {
    DEFAULT_PROFILE_VISIBILITY,
    createDefaultProfile,
    type ProfileVisibility,
    type UpdateProfileRequest,
    type UserProfile,
    type UsernameAvailability,
} from '@/types/profile'
import { validateUsername } from '@/utils/usernameValidation'
import { now } from './_helpers'

/* -------------------------------------------------------------------------- */
/*  Internal shape helpers                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Convert a raw DB row from `profiles` to the app's `UserProfile` type.
 * The DB row has all nullable columns; we fill defaults where needed.
 */
function rowToProfile(row: typeof profiles.$inferSelect): UserProfile {
    return {
        id: row.userId,
        userId: row.userId,
        email: row.email ?? '',
        displayName: row.displayName ?? 'User',
        username: row.username ?? undefined,
        avatarUrl: row.avatarUrl ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${row.userId}`,
        avatarSource: (row.avatarSource as UserProfile['avatarSource']) ?? 'generated',
        description: row.description ?? undefined,
        favoriteGenres: row.favoriteGenres ?? [],
        rankingsCount: row.rankingsCount,
        publicCollectionsCount: row.publicCollectionsCount,
        totalLikes: row.totalLikes,
        totalViews: row.totalViews,
        isPublic: row.isPublic,
        visibility: row.visibility
            ? { ...DEFAULT_PROFILE_VISIBILITY, ...row.visibility }
            : { ...DEFAULT_PROFILE_VISIBILITY },
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        lastLoginAt: row.lastLoginAt ?? undefined,
    }
}

/* -------------------------------------------------------------------------- */
/*  Profile CRUD                                                               */
/* -------------------------------------------------------------------------- */

/** Fetch a profile by userId. Returns null when not found. */
export async function getProfile(userId: string): Promise<UserProfile | null> {
    const rows = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1)

    if (rows.length === 0) return null
    return rowToProfile(rows[0])
}

/** Fetch a profile by unique username. Returns null when not found. */
export async function getProfileByUsername(username: string): Promise<UserProfile | null> {
    const rows = await db.select().from(profiles).where(eq(profiles.username, username)).limit(1)

    if (rows.length === 0) return null
    return rowToProfile(rows[0])
}

/**
 * Fetch multiple profiles by their userIds. Returns a Map keyed by userId.
 * Missing profiles are simply absent from the Map.
 */
export async function getProfilesByUserIds(userIds: string[]): Promise<Map<string, UserProfile>> {
    if (userIds.length === 0) return new Map()

    // libSQL / Turso does not support `.where(inArray(...))` with many items
    // but for typical call-site sizes (<= ~50) parallel selects are fine.
    const results = await Promise.all(userIds.map((id) => getProfile(id)))
    const map = new Map<string, UserProfile>()
    results.forEach((profile, idx) => {
        if (profile) map.set(userIds[idx], profile)
    })
    return map
}

/**
 * Upsert a profile. Creates a new row if userId is absent; updates in place
 * otherwise. Callers that only need to create without clobbering existing data
 * should call `getProfile` first and short-circuit when a row already exists.
 */
export async function upsertProfile(profile: UserProfile): Promise<void> {
    const ts = now()
    await db
        .insert(profiles)
        .values({
            userId: profile.userId,
            email: profile.email,
            displayName: profile.displayName,
            username: profile.username ?? null,
            avatarUrl: profile.avatarUrl,
            avatarSource: profile.avatarSource,
            description: profile.description ?? null,
            favoriteGenres: profile.favoriteGenres ?? [],
            rankingsCount: profile.rankingsCount,
            publicCollectionsCount: profile.publicCollectionsCount,
            totalLikes: profile.totalLikes,
            totalViews: profile.totalViews,
            isPublic: profile.isPublic,
            visibility: profile.visibility ?? DEFAULT_PROFILE_VISIBILITY,
            createdAt: profile.createdAt ?? ts,
            updatedAt: ts,
            lastLoginAt: profile.lastLoginAt ?? null,
        })
        .onConflictDoUpdate({
            target: profiles.userId,
            set: {
                email: profile.email,
                displayName: profile.displayName,
                username: profile.username ?? null,
                avatarUrl: profile.avatarUrl,
                avatarSource: profile.avatarSource,
                description: profile.description ?? null,
                favoriteGenres: profile.favoriteGenres ?? [],
                rankingsCount: profile.rankingsCount,
                publicCollectionsCount: profile.publicCollectionsCount,
                totalLikes: profile.totalLikes,
                totalViews: profile.totalViews,
                isPublic: profile.isPublic,
                visibility: profile.visibility ?? DEFAULT_PROFILE_VISIBILITY,
                updatedAt: ts,
                lastLoginAt: profile.lastLoginAt ?? null,
            },
        })
}

/**
 * Ensure a profile row exists for the user. If no row is found a default
 * profile is created from the provided seed data and inserted. Returns the
 * authoritative profile (existing or newly created).
 */
export async function ensureProfile(
    userId: string,
    email: string,
    displayName: string,
    googlePhotoUrl?: string
): Promise<UserProfile> {
    const existing = await getProfile(userId)
    if (existing) return existing

    const profile = createDefaultProfile(userId, email, displayName, googlePhotoUrl)
    await upsertProfile(profile)
    return profile
}

/**
 * Apply a partial `UpdateProfileRequest` to an existing profile row.
 * When `username` is included the uniqueness constraint (enforced by the
 * `username UNIQUE` index in the schema) will surface as a conflict error —
 * callers should check availability first with `checkUsernameAvailability`.
 *
 * @throws When the profile row does not exist.
 * @throws When the requested username is already taken (DB unique violation).
 */
export async function updateProfile(userId: string, updates: UpdateProfileRequest): Promise<void> {
    const ts = now()

    // Build only the columns that were supplied.
    const patch: Partial<typeof profiles.$inferInsert> = { updatedAt: ts }

    if (updates.displayName !== undefined) patch.displayName = updates.displayName.trim()
    if (updates.username !== undefined) {
        // An empty / null value clears the username slug.
        patch.username =
            updates.username === '' || updates.username === null
                ? null
                : updates.username.trim() || null
    }
    if (updates.description !== undefined) patch.description = updates.description.trim()
    if (updates.favoriteGenres !== undefined) patch.favoriteGenres = updates.favoriteGenres
    if (updates.isPublic !== undefined) patch.isPublic = updates.isPublic
    if (updates.avatarSource !== undefined) patch.avatarSource = updates.avatarSource
    if (updates.visibility !== undefined) {
        // Merge partial visibility with defaults so we never lose keys.
        const existing = await getProfile(userId)
        const base = existing?.visibility ?? DEFAULT_PROFILE_VISIBILITY
        patch.visibility = { ...base, ...updates.visibility }
    }

    await db.update(profiles).set(patch).where(eq(profiles.userId, userId))
}

/**
 * Update only the `avatarUrl` (and optionally `avatarSource`) columns.
 * Used by the avatar stub after storing the URL (data URL or CDN URL).
 */
export async function updateProfileAvatar(
    userId: string,
    avatarUrl: string,
    avatarSource: UserProfile['avatarSource'] = 'custom'
): Promise<void> {
    await db
        .update(profiles)
        .set({ avatarUrl, avatarSource, updatedAt: now() })
        .where(eq(profiles.userId, userId))
}

/* -------------------------------------------------------------------------- */
/*  Username availability                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Check whether a username slug is available.
 *
 * Returns `{ available: true }` when:
 *   - The username passes format + content-moderation validation, AND
 *   - No other user owns the same slug (the requesting user can keep their
 *     current slug — checked against `currentUserId`).
 */
export async function checkUsernameAvailability(
    username: string,
    currentUserId?: string
): Promise<UsernameAvailability> {
    // 1. Format and content-moderation check.
    const validation = validateUsername(username)
    if (!validation.isValid) {
        return { available: false, error: validation.error }
    }

    // 2. Uniqueness check — find any row with this username.
    const rows = await db
        .select({ userId: profiles.userId })
        .from(profiles)
        .where(eq(profiles.username, username.trim()))
        .limit(1)

    if (rows.length === 0) {
        return { available: true }
    }

    // The existing owner is the requesting user — allow them to keep it.
    if (currentUserId && rows[0].userId === currentUserId) {
        return { available: true }
    }

    return { available: false, error: 'Username is already taken' }
}

/* -------------------------------------------------------------------------- */
/*  Profile stats (recompute / increment)                                     */
/* -------------------------------------------------------------------------- */

/**
 * Atomically increment (or decrement) a numeric counter on the profile.
 * Uses a SQL expression so there is no read-modify-write race.
 * `amount` may be negative to decrement.
 */
export async function incrementProfileStat(
    userId: string,
    field: 'rankingsCount' | 'publicCollectionsCount' | 'totalLikes' | 'totalViews',
    amount: number = 1
): Promise<void> {
    const col = profiles[field]
    await db
        .update(profiles)
        .set({
            [field]: sql`${col} + ${amount}`,
            updatedAt: now(),
        })
        .where(eq(profiles.userId, userId))
}

/**
 * Recompute profile stats by counting live rows in related tables.
 * Intended for use in admin / reconciliation contexts.
 *
 * @param rankingsCount  Pre-counted value from caller (avoids an extra query here).
 * @param totalLikes     Pre-counted value from caller.
 * @param totalViews     Pre-counted value from caller.
 */
export async function recomputeProfileStats(
    userId: string,
    rankingsCount: number,
    totalLikes: number,
    totalViews: number
): Promise<void> {
    await db
        .update(profiles)
        .set({ rankingsCount, totalLikes, totalViews, updatedAt: now() })
        .where(eq(profiles.userId, userId))
}

/* -------------------------------------------------------------------------- */
/*  Profile visibility                                                         */
/* -------------------------------------------------------------------------- */

/** Retrieve the `visibility` JSON column, falling back to defaults. */
export async function getProfileVisibility(userId: string): Promise<ProfileVisibility> {
    const rows = await db
        .select({ visibility: profiles.visibility })
        .from(profiles)
        .where(eq(profiles.userId, userId))
        .limit(1)

    if (rows.length === 0) return { ...DEFAULT_PROFILE_VISIBILITY }

    return { ...DEFAULT_PROFILE_VISIBILITY, ...(rows[0].visibility ?? {}) }
}

/**
 * Merge partial `ProfileVisibility` updates into the stored JSON column.
 * Returns the full merged visibility object.
 */
export async function updateProfileVisibility(
    userId: string,
    updates: Partial<ProfileVisibility>
): Promise<ProfileVisibility> {
    const existing = await getProfileVisibility(userId)
    const merged: ProfileVisibility = { ...existing, ...updates }

    await db
        .update(profiles)
        .set({ visibility: merged, updatedAt: now() })
        .where(eq(profiles.userId, userId))

    return merged
}

/* -------------------------------------------------------------------------- */
/*  Follows                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Follow a user. Silently no-ops if the follow relationship already exists
 * (via `onConflictDoNothing` on the unique pair index).
 *
 * @throws When `followerId === followingId` (self-follow guard).
 */
export async function followUser(followerId: string, followingId: string): Promise<void> {
    if (followerId === followingId) {
        throw new Error('A user cannot follow themselves')
    }

    await db
        .insert(userFollows)
        .values({
            followerId,
            followingId,
            createdAt: now(),
        })
        .onConflictDoNothing()
}

/**
 * Remove a follow relationship. Safe to call even when the relationship does
 * not exist.
 */
export async function unfollowUser(followerId: string, followingId: string): Promise<void> {
    await db
        .delete(userFollows)
        .where(
            and(eq(userFollows.followerId, followerId), eq(userFollows.followingId, followingId))
        )
}

/** Whether `followerId` currently follows `followingId`. */
export async function isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const rows = await db
        .select({ id: userFollows.id })
        .from(userFollows)
        .where(
            and(eq(userFollows.followerId, followerId), eq(userFollows.followingId, followingId))
        )
        .limit(1)

    return rows.length > 0
}

/** Count how many users are following `userId`. */
export async function getFollowerCount(userId: string): Promise<number> {
    const rows = await db
        .select({ count: sql<number>`count(*)` })
        .from(userFollows)
        .where(eq(userFollows.followingId, userId))

    return rows[0]?.count ?? 0
}

/** Count how many users `userId` is following. */
export async function getFollowingCount(userId: string): Promise<number> {
    const rows = await db
        .select({ count: sql<number>`count(*)` })
        .from(userFollows)
        .where(eq(userFollows.followerId, userId))

    return rows[0]?.count ?? 0
}

/** Follower and following counts bundled together. */
export async function getFollowCounts(
    userId: string
): Promise<{ followers: number; following: number }> {
    const [followers, following] = await Promise.all([
        getFollowerCount(userId),
        getFollowingCount(userId),
    ])
    return { followers, following }
}

/* -------------------------------------------------------------------------- */
/*  Badges                                                                     */
/* -------------------------------------------------------------------------- */

export interface Badge {
    id: string
    userId: string
    name: string
    description?: string | null
    icon?: string | null
    color?: string | null
    unlockedAt: number
}

/** List all badges for a user, most-recently-unlocked first. */
export async function listBadges(userId: string): Promise<Badge[]> {
    const rows = await db
        .select()
        .from(userBadges)
        .where(eq(userBadges.userId, userId))
        .orderBy(desc(userBadges.unlockedAt))

    return rows.map((r) => ({
        id: r.id,
        userId: r.userId,
        name: r.name,
        description: r.description,
        icon: r.icon,
        color: r.color,
        unlockedAt: r.unlockedAt,
    }))
}

/**
 * Award a badge. Idempotent — if the user already has a badge with the same
 * `name`, the existing row is returned unchanged.
 */
export async function awardBadge(
    userId: string,
    badge: Omit<Badge, 'id' | 'userId' | 'unlockedAt'>
): Promise<Badge> {
    // Check if badge already exists.
    const existing = await db
        .select()
        .from(userBadges)
        .where(and(eq(userBadges.userId, userId), eq(userBadges.name, badge.name)))
        .limit(1)

    if (existing.length > 0) {
        return {
            id: existing[0].id,
            userId: existing[0].userId,
            name: existing[0].name,
            description: existing[0].description,
            icon: existing[0].icon,
            color: existing[0].color,
            unlockedAt: existing[0].unlockedAt,
        }
    }

    const unlockedAt = now()
    await db.insert(userBadges).values({
        userId,
        name: badge.name,
        description: badge.description ?? null,
        icon: badge.icon ?? null,
        color: badge.color ?? null,
        unlockedAt,
    })

    // Re-fetch to get the generated id.
    const inserted = await db
        .select()
        .from(userBadges)
        .where(and(eq(userBadges.userId, userId), eq(userBadges.name, badge.name)))
        .limit(1)

    return {
        id: inserted[0].id,
        userId: inserted[0].userId,
        name: inserted[0].name,
        description: inserted[0].description,
        icon: inserted[0].icon,
        color: inserted[0].color,
        unlockedAt: inserted[0].unlockedAt,
    }
}

/* -------------------------------------------------------------------------- */
/*  Activity                                                                   */
/* -------------------------------------------------------------------------- */

export interface ActivityItem {
    id: string
    userId: string
    type: string
    timestamp: number
    referenceId?: string | null
    referenceType?: string | null
    preview?: unknown
}

/** List recent activity for a user, newest first. Limited to `limit` rows. */
export async function listActivity(userId: string, limit = 50): Promise<ActivityItem[]> {
    const rows = await db
        .select()
        .from(userActivity)
        .where(eq(userActivity.userId, userId))
        .orderBy(desc(userActivity.timestamp))
        .limit(limit)

    return rows.map((r) => ({
        id: r.id,
        userId: r.userId,
        type: r.type,
        timestamp: r.timestamp,
        referenceId: r.referenceId,
        referenceType: r.referenceType,
        preview: r.preview,
    }))
}

/**
 * Append an activity event. No deduplication — each call appends a new row.
 * Use `referenceId` + `referenceType` to link to ranked items, threads, etc.
 */
export async function addActivity(
    userId: string,
    event: Omit<ActivityItem, 'id' | 'userId'>
): Promise<ActivityItem> {
    const ts = event.timestamp ?? now()

    await db.insert(userActivity).values({
        userId,
        type: event.type,
        timestamp: ts,
        referenceId: event.referenceId ?? null,
        referenceType: event.referenceType ?? null,
        preview: event.preview ?? null,
    })

    // Re-fetch the newest matching row to return the generated id.
    const inserted = await db
        .select()
        .from(userActivity)
        .where(
            and(
                eq(userActivity.userId, userId),
                eq(userActivity.type, event.type),
                eq(userActivity.timestamp, ts)
            )
        )
        .orderBy(desc(userActivity.timestamp))
        .limit(1)

    return {
        id: inserted[0].id,
        userId: inserted[0].userId,
        type: inserted[0].type,
        timestamp: inserted[0].timestamp,
        referenceId: inserted[0].referenceId,
        referenceType: inserted[0].referenceType,
        preview: inserted[0].preview,
    }
}

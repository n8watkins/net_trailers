/**
 * Shares Drizzle query module.
 *
 * Replaces utils/firestore/shares.ts. Operates on the `shares` table defined
 * in db/schema.ts. All Firestore primitives are mapped:
 *   - FieldValue.increment()      → sql`${col} + 1`
 *   - collection().where()        → db.select().where()
 *   - doc().set() / doc().update() → db.insert() / db.update()
 *   - doc().delete()              → db.delete()
 *
 * The key architectural difference from the Firestore version: the shared
 * content snapshot (collection items + advancedFilters + collection metadata)
 * is captured at share-creation time and stored in `shares.snapshot`. The
 * public read path therefore never needs to touch the user's own preferences
 * row, which eliminates the cross-domain read that the old code required.
 *
 * Ownership is always derived from the Auth.js session by the API route layer
 * (via withAuth); the functions here trust the userId passed by the route.
 */

import { and, desc, eq, sql } from 'drizzle-orm'

import { db } from '@/db'
import { profiles, shares, users } from '@/db/schema'
import type { UserList } from '@/types/collections'
import type {
    CreateShareRequest,
    CreateShareResponse,
    ShareableLink,
    ShareSettings,
    ShareStats,
    SharedCollectionData,
    ShareValidationResult,
} from '@/types/sharing'
import { DEFAULT_SHARE_SETTINGS, SHARE_EXPIRATION_DURATIONS } from '@/types/sharing'
import type { Content } from '@/typings'

/* -------------------------------------------------------------------------- */
/*  Internal helpers                                                           */
/* -------------------------------------------------------------------------- */

/** Max shares per user (mirrors SHARE_CONSTRAINTS.MAX_SHARES_PER_USER). */
const MAX_SHARES_PER_USER = 50

/** Max active shares per user (mirrors SHARE_CONSTRAINTS.MAX_ACTIVE_SHARES). */
const MAX_ACTIVE_SHARES = 25

/** Validate a share ID string (same rules as the old Firestore helper). */
function isValidShareId(shareId: string): boolean {
    if (!shareId || typeof shareId !== 'string') return false
    const len = shareId.length
    return len >= 8 && len <= 32 && /^[A-Za-z0-9_-]+$/.test(shareId)
}

/** Resolve the public base URL (copied from the old utils module). */
function resolveShareBaseUrl(): string {
    if (typeof window !== 'undefined' && window.location) {
        return window.location.origin
    }
    const envUrl =
        process.env.NEXT_PUBLIC_APP_URL ||
        process.env.APP_URL ||
        process.env.VERCEL_URL ||
        process.env.VERCEL_PROJECT_PRODUCTION_URL ||
        ''

    if (envUrl.startsWith('http://') || envUrl.startsWith('https://')) {
        return envUrl.replace(/\/$/, '')
    }

    if (envUrl) {
        return `https://${envUrl}`.replace(/\/$/, '')
    }

    return 'http://localhost:3000'
}

/**
 * Map a raw `shares` table row to a `ShareableLink` DTO.
 *
 * The `expiresAt` column is nullable in SQLite (stored as integer | null).
 * ShareableLink.expiresAt is `number | null`, so the cast is safe.
 */
function rowToShareableLink(row: typeof shares.$inferSelect): ShareableLink {
    return {
        id: row.id,
        collectionId: row.collectionId,
        userId: row.userId,
        collectionName: row.collectionName ?? '',
        itemCount: row.itemCount,
        createdAt: row.createdAt,
        expiresAt: row.expiresAt ?? null,
        isActive: row.isActive,
        viewCount: row.viewCount,
        lastViewedAt: row.lastViewedAt ?? undefined,
        allowDuplicates: row.allowDuplicates,
        settings: (row.settings ?? DEFAULT_SHARE_SETTINGS) as ShareSettings,
    }
}

/** Whether the link has passed its expiry timestamp. */
function isShareExpired(share: ShareableLink): boolean {
    return share.expiresAt !== null && Date.now() > share.expiresAt
}

/* -------------------------------------------------------------------------- */
/*  Public query functions                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Create a new share link.
 *
 * The caller MUST pass the collection object (so we can build the snapshot
 * at write time). The route layer fetches the collection from userPreferences
 * before calling here — this function is pure persistence.
 *
 * @param userId       Authenticated user id (from session — never trusted from client).
 * @param collectionId The collection being shared.
 * @param collection   The live UserList object (used to build snapshot + metadata).
 * @param request      CreateShareRequest body from the API caller.
 */
export async function createShare(
    userId: string,
    collectionId: string,
    collection: UserList,
    request: CreateShareRequest
): Promise<CreateShareResponse> {
    // --- Enforce per-user share limits ---
    const userShareRows = await db
        .select({ id: shares.id, isActive: shares.isActive })
        .from(shares)
        .where(eq(shares.userId, userId))

    if (userShareRows.length >= MAX_SHARES_PER_USER) {
        throw new Error(
            `Maximum ${MAX_SHARES_PER_USER} shares reached. Delete old shares to create new ones.`
        )
    }

    const activeCount = userShareRows.filter((r) => r.isActive).length
    if (activeCount >= MAX_ACTIVE_SHARES) {
        throw new Error(
            `Maximum ${MAX_ACTIVE_SHARES} active shares reached. Deactivate some shares first.`
        )
    }

    // --- Compute expiry ---
    const expiresIn = request.expiresIn ?? 'never'
    const expirationMs = SHARE_EXPIRATION_DURATIONS[expiresIn]
    const expiresAt = expirationMs ? Date.now() + expirationMs : null

    // --- Merge settings ---
    const settings: ShareSettings = {
        ...DEFAULT_SHARE_SETTINGS,
        ...request.settings,
    }

    // --- Build the snapshot stored for public read ---
    const snapshot: NonNullable<(typeof shares.$inferSelect)['snapshot']> = {
        items: collection.items,
        advancedFilters: collection.advancedFilters,
        collection,
    }

    // --- Persist ---
    const ts = Date.now()
    const inserted = await db
        .insert(shares)
        .values({
            collectionId,
            userId,
            collectionName: collection.name,
            itemCount: collection.items.length,
            createdAt: ts,
            expiresAt,
            isActive: true,
            viewCount: 0,
            allowDuplicates: request.allowDuplicates !== false,
            settings,
            snapshot,
        })
        .returning()

    const row = inserted[0]
    const share = rowToShareableLink(row)

    const baseUrl = resolveShareBaseUrl()
    return {
        shareId: share.id,
        shareUrl: `${baseUrl}/shared/${share.id}`,
        share,
    }
}

/**
 * Validate and return a share by ID (public — no auth required).
 *
 * Enforces isActive and expiry server-side.
 */
export async function getShareById(shareId: string): Promise<ShareValidationResult> {
    if (!isValidShareId(shareId)) {
        return { valid: false, error: 'Invalid share link format' }
    }

    const rows = await db.select().from(shares).where(eq(shares.id, shareId)).limit(1)

    if (rows.length === 0) {
        return { valid: false, error: 'Share link not found or has been deleted' }
    }

    const share = rowToShareableLink(rows[0])

    if (!share.isActive) {
        return { valid: false, error: 'This share link has been deactivated by the owner' }
    }

    if (isShareExpired(share)) {
        return { valid: false, error: 'This share link has expired' }
    }

    return { valid: true, share }
}

/**
 * Fetch the full shared-collection payload for the public view page.
 *
 * Returns null when the share is invalid, inactive, or expired.
 * The `snapshot` column holds the collection content captured at creation time,
 * so this requires no cross-domain read into userPreferences.
 *
 * `ownerName` is resolved from the `profiles` table (displayName → username →
 * users.name → users.email → 'Anonymous') when `settings.showOwnerName` is true.
 */
export async function getSharedCollectionData(
    shareId: string
): Promise<SharedCollectionData | null> {
    // Single query: fetch the full row so we can validate AND read the snapshot
    // in one round-trip (avoids the double-select from calling getShareById + raw).
    if (!isValidShareId(shareId)) return null

    const rows = await db.select().from(shares).where(eq(shares.id, shareId)).limit(1)

    if (rows.length === 0) return null

    const row = rows[0]
    const share = rowToShareableLink(row)

    if (!share.isActive || isShareExpired(share)) return null

    // Extract content IDs from the snapshot (fallback to empty if snapshot missing).
    const snapshot = row.snapshot
    const contentIds: number[] = snapshot?.items?.map((item: Content) => item.id) ?? []

    // Resolve owner name when the share settings allow it.
    let ownerName: string | undefined
    if (share.settings.showOwnerName) {
        // Try profiles table first (has displayName / username).
        const profileRows = await db
            .select({
                displayName: profiles.displayName,
                username: profiles.username,
            })
            .from(profiles)
            .where(eq(profiles.userId, share.userId))
            .limit(1)

        if (profileRows.length > 0) {
            const p = profileRows[0]
            ownerName = p.displayName ?? p.username ?? undefined
        }

        // Fall back to the Auth.js `user` table (name / email).
        if (!ownerName) {
            const userRows = await db
                .select({ name: users.name, email: users.email })
                .from(users)
                .where(eq(users.id, share.userId))
                .limit(1)

            if (userRows.length > 0) {
                const u = userRows[0]
                ownerName = u.name ?? u.email ?? 'Anonymous'
            }
        }
    }

    return {
        share,
        contentIds,
        ownerName,
        canDuplicate: share.allowDuplicates,
    }
}

/**
 * Increment viewCount and stamp lastViewedAt for a share.
 *
 * Fire-and-forget from the client (POST to the shareId route).
 * Does NOT validate isActive/expiry — that check happens in the POST handler
 * before this is called.
 */
export async function incrementViewCount(shareId: string): Promise<void> {
    try {
        await db
            .update(shares)
            .set({
                viewCount: sql`${shares.viewCount} + 1`,
                lastViewedAt: Date.now(),
            })
            .where(eq(shares.id, shareId))
    } catch (error) {
        // Non-fatal: view tracking should never break the page.
        console.error('Error incrementing share view count:', error)
    }
}

/**
 * Toggle the isActive flag for a share (activate / deactivate).
 *
 * Only the owner (matched by userId) may call this.
 */
export async function toggleShare(
    shareId: string,
    userId: string,
    isActive: boolean
): Promise<void> {
    const rows = await db
        .select({ id: shares.id, userId: shares.userId })
        .from(shares)
        .where(eq(shares.id, shareId))
        .limit(1)

    if (rows.length === 0) {
        throw new Error('Share link not found')
    }

    if (rows[0].userId !== userId) {
        throw new Error('Only the owner can modify this share link')
    }

    await db
        .update(shares)
        .set({ isActive })
        .where(and(eq(shares.id, shareId), eq(shares.userId, userId)))
}

/**
 * Permanently delete a share record.
 *
 * Only the owner (matched by userId) may call this.
 */
export async function deleteShare(shareId: string, userId: string): Promise<void> {
    const rows = await db
        .select({ id: shares.id, userId: shares.userId })
        .from(shares)
        .where(eq(shares.id, shareId))
        .limit(1)

    if (rows.length === 0) {
        throw new Error('Share link not found')
    }

    if (rows[0].userId !== userId) {
        throw new Error('Only the owner can delete this share link')
    }

    await db.delete(shares).where(and(eq(shares.id, shareId), eq(shares.userId, userId)))
}

/**
 * Fetch all shares for a user, sorted newest-first.
 */
export async function getUserShares(userId: string): Promise<ShareableLink[]> {
    const rows = await db
        .select()
        .from(shares)
        .where(eq(shares.userId, userId))
        .orderBy(desc(shares.createdAt))

    return rows.map(rowToShareableLink)
}

/**
 * Compute share statistics for a user (total, active, views, most-viewed).
 */
export async function getShareStats(userId: string): Promise<ShareStats> {
    const userShares = await getUserShares(userId)

    const activeShares = userShares.filter((s) => s.isActive).length
    const totalViews = userShares.reduce((sum, s) => sum + s.viewCount, 0)

    let mostViewedShare: ShareStats['mostViewedShare']
    if (userShares.length > 0) {
        const top = userShares.reduce((max, s) => (s.viewCount > max.viewCount ? s : max))
        if (top.viewCount > 0) {
            mostViewedShare = {
                shareId: top.id,
                collectionName: top.collectionName,
                viewCount: top.viewCount,
            }
        }
    }

    return {
        totalShares: userShares.length,
        activeShares,
        totalViews,
        mostViewedShare,
    }
}

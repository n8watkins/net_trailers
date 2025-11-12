/**
 * Firestore Interactions Utilities
 * Phase 7.1 - User interaction tracking for recommendations
 */

import { db } from '@/firebase'
import {
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    query,
    where,
    orderBy,
    limit,
    Timestamp,
    writeBatch,
    deleteDoc,
    runTransaction,
} from 'firebase/firestore'
import { nanoid } from 'nanoid'
import {
    UserInteraction,
    InteractionType,
    UserInteractionSummary,
    GenrePreference,
    InteractionAnalytics,
    INTERACTION_WEIGHTS,
    INTERACTION_CONSTRAINTS,
    InteractionSource,
} from '@/types/interactions'
import { Content } from '@/typings'

/**
 * Get Firestore reference to interactions collection
 */
function getInteractionsCollection(userId: string) {
    return collection(db, 'users', userId, 'interactions')
}

/**
 * Get Firestore reference to single interaction document
 */
function getInteractionDocRef(userId: string, interactionId: string) {
    return doc(db, 'users', userId, 'interactions', interactionId)
}

/**
 * Get Firestore reference to interaction summary document
 */
function getInteractionSummaryRef(userId: string) {
    return doc(db, 'users', userId, 'interactionSummary', 'summary')
}

/**
 * Log a user interaction
 *
 * @param userId - User ID
 * @param interaction - Interaction data (without id and timestamp)
 * @returns Promise<UserInteraction>
 */
export async function logInteraction(
    userId: string,
    interaction: Omit<UserInteraction, 'id' | 'timestamp' | 'userId'>
): Promise<UserInteraction> {
    const interactionId = nanoid(12)
    const now = Date.now()

    const fullInteraction: UserInteraction = {
        id: interactionId,
        userId,
        timestamp: now,
        ...interaction,
    }

    try {
        await setDoc(getInteractionDocRef(userId, interactionId), fullInteraction)

        // Trigger summary refresh if needed (async, don't await)
        refreshInteractionSummaryIfNeeded(userId).catch((err) =>
            console.error('Failed to refresh interaction summary:', err)
        )

        return fullInteraction
    } catch (error) {
        console.error('Failed to log interaction:', error)
        throw error
    }
}

/**
 * Log multiple interactions in a batch
 *
 * @param userId - User ID
 * @param interactions - Array of interactions (without id and timestamp)
 * @returns Promise<UserInteraction[]>
 */
export async function logInteractionBatch(
    userId: string,
    interactions: Omit<UserInteraction, 'id' | 'timestamp' | 'userId'>[]
): Promise<UserInteraction[]> {
    if (interactions.length === 0) return []
    if (interactions.length > INTERACTION_CONSTRAINTS.MAX_BATCH_SIZE) {
        throw new Error(
            `Batch size ${interactions.length} exceeds maximum ${INTERACTION_CONSTRAINTS.MAX_BATCH_SIZE}`
        )
    }

    const batch = writeBatch(db)
    const now = Date.now()
    const fullInteractions: UserInteraction[] = []

    interactions.forEach((interaction) => {
        const interactionId = nanoid(12)
        const fullInteraction: UserInteraction = {
            id: interactionId,
            userId,
            timestamp: now,
            ...interaction,
        }

        batch.set(getInteractionDocRef(userId, interactionId), fullInteraction)
        fullInteractions.push(fullInteraction)
    })

    try {
        await batch.commit()

        // Trigger summary refresh if needed (async, don't await)
        refreshInteractionSummaryIfNeeded(userId).catch((err) =>
            console.error('Failed to refresh interaction summary:', err)
        )

        return fullInteractions
    } catch (error) {
        console.error('Failed to log interaction batch:', error)
        throw error
    }
}

/**
 * Get recent interactions for a user
 *
 * @param userId - User ID
 * @param limitCount - Maximum number of interactions to return
 * @returns Promise<UserInteraction[]>
 */
export async function getRecentInteractions(
    userId: string,
    limitCount: number = 50
): Promise<UserInteraction[]> {
    try {
        const q = query(
            getInteractionsCollection(userId),
            orderBy('timestamp', 'desc'),
            limit(limitCount)
        )

        const querySnapshot = await getDocs(q)
        const interactions: UserInteraction[] = []

        querySnapshot.forEach((doc) => {
            interactions.push(doc.data() as UserInteraction)
        })

        return interactions
    } catch (error) {
        console.error('Failed to get recent interactions:', error)
        return []
    }
}

/**
 * Get interactions by type
 *
 * @param userId - User ID
 * @param interactionType - Type of interaction
 * @param limitCount - Maximum number of interactions to return
 * @returns Promise<UserInteraction[]>
 */
export async function getInteractionsByType(
    userId: string,
    interactionType: InteractionType,
    limitCount: number = 50
): Promise<UserInteraction[]> {
    try {
        const q = query(
            getInteractionsCollection(userId),
            where('interactionType', '==', interactionType),
            orderBy('timestamp', 'desc'),
            limit(limitCount)
        )

        const querySnapshot = await getDocs(q)
        const interactions: UserInteraction[] = []

        querySnapshot.forEach((doc) => {
            interactions.push(doc.data() as UserInteraction)
        })

        return interactions
    } catch (error) {
        console.error('Failed to get interactions by type:', error)
        return []
    }
}

/**
 * Get interaction summary for a user
 *
 * @param userId - User ID
 * @returns Promise<UserInteractionSummary | null>
 */
export async function getInteractionSummary(
    userId: string
): Promise<UserInteractionSummary | null> {
    try {
        const docSnap = await getDoc(getInteractionSummaryRef(userId))

        if (docSnap.exists()) {
            return docSnap.data() as UserInteractionSummary
        }

        return null
    } catch (error) {
        console.error('Failed to get interaction summary:', error)
        return null
    }
}

/**
 * Calculate and save interaction summary
 *
 * @param userId - User ID
 * @returns Promise<UserInteractionSummary>
 */
export async function calculateInteractionSummary(userId: string): Promise<UserInteractionSummary> {
    try {
        // Get all interactions
        const allInteractions = await getRecentInteractions(
            userId,
            INTERACTION_CONSTRAINTS.MAX_INTERACTIONS_PER_USER
        )

        // Calculate genre preferences
        const genreScores: Record<number, { score: number; count: number }> = {}

        allInteractions.forEach((interaction) => {
            const weight = INTERACTION_WEIGHTS[interaction.interactionType]

            interaction.genreIds.forEach((genreId) => {
                if (!genreScores[genreId]) {
                    genreScores[genreId] = { score: 0, count: 0 }
                }

                genreScores[genreId].score += weight
                genreScores[genreId].count += 1
            })
        })

        // Convert to GenrePreference array and sort by score
        const genrePreferences: GenrePreference[] = Object.entries(genreScores)
            .map(([genreId, data]) => ({
                genreId: parseInt(genreId, 10),
                genreName: getGenreName(parseInt(genreId, 10)),
                score: data.score,
                count: data.count,
            }))
            .filter((pref) => pref.score > 0) // Only positive scores
            .sort((a, b) => b.score - a.score) // Sort descending

        // Get top content IDs (most interacted-with)
        const contentIdCounts: Record<number, number> = {}

        allInteractions.forEach((interaction) => {
            contentIdCounts[interaction.contentId] =
                (contentIdCounts[interaction.contentId] || 0) + 1
        })

        const topContentIds = Object.entries(contentIdCounts)
            .sort((a, b) => b[1] - a[1]) // Sort by count descending
            .slice(0, 20) // Top 20
            .map(([id]) => parseInt(id, 10))

        // Create summary
        const summary: UserInteractionSummary = {
            userId,
            totalInteractions: allInteractions.length,
            genrePreferences,
            topContentIds,
            lastUpdated: Date.now(),
        }

        // Save to Firestore
        await setDoc(getInteractionSummaryRef(userId), summary)

        return summary
    } catch (error) {
        console.error('Failed to calculate interaction summary:', error)
        throw error
    }
}

/**
 * Refresh interaction summary if it's stale
 * Uses transaction to prevent race conditions from concurrent refresh attempts
 *
 * @param userId - User ID
 * @returns Promise<UserInteractionSummary | null>
 */
export async function refreshInteractionSummaryIfNeeded(
    userId: string
): Promise<UserInteractionSummary | null> {
    try {
        const summaryRef = getInteractionSummaryRef(userId)
        const now = Date.now()
        const refreshThreshold = INTERACTION_CONSTRAINTS.SUMMARY_REFRESH_HOURS * 60 * 60 * 1000

        // Use transaction to atomically check and set calculating flag
        const needsRefresh = await runTransaction(db, async (transaction) => {
            const summaryDoc = await transaction.get(summaryRef)
            const existingSummary = summaryDoc.exists()
                ? (summaryDoc.data() as UserInteractionSummary)
                : null

            // Check if refresh is needed
            if (!existingSummary || now - existingSummary.lastUpdated > refreshThreshold) {
                // Check if another process is already calculating
                const isCalculating = (existingSummary as any)?.calculating === true

                if (isCalculating) {
                    // Another process is calculating, return false
                    return false
                }

                // Set calculating flag to prevent concurrent updates
                transaction.set(
                    summaryRef,
                    {
                        ...existingSummary,
                        calculating: true,
                        lastUpdated: existingSummary?.lastUpdated || now,
                    },
                    { merge: true }
                )
                return true
            }

            // Summary is fresh, no refresh needed
            return false
        })

        if (!needsRefresh) {
            // Either fresh or already calculating, return existing
            return await getInteractionSummary(userId)
        }

        // Perform the actual calculation outside the transaction
        const newSummary = await calculateInteractionSummary(userId)

        // Clear calculating flag (already done by calculateInteractionSummary via setDoc)
        return newSummary
    } catch (error) {
        console.error('Failed to refresh interaction summary:', error)

        // Clear calculating flag on error
        try {
            const summaryRef = getInteractionSummaryRef(userId)
            await setDoc(summaryRef, { calculating: false }, { merge: true })
        } catch (cleanupError) {
            console.error('Failed to clear calculating flag:', cleanupError)
        }

        return null
    }
}

/**
 * Get interaction analytics for a user
 *
 * @param userId - User ID
 * @returns Promise<InteractionAnalytics>
 */
export async function getInteractionAnalytics(userId: string): Promise<InteractionAnalytics> {
    try {
        const allInteractions = await getRecentInteractions(
            userId,
            INTERACTION_CONSTRAINTS.MAX_INTERACTIONS_PER_USER
        )

        // Count interactions by type
        const interactionsByType: Record<InteractionType, number> = {} as Record<
            InteractionType,
            number
        >

        let totalTrailerPlays = 0
        let totalTrailerDuration = 0

        allInteractions.forEach((interaction) => {
            interactionsByType[interaction.interactionType] =
                (interactionsByType[interaction.interactionType] || 0) + 1

            if (interaction.interactionType === 'play_trailer' && interaction.trailerDuration) {
                totalTrailerPlays++
                totalTrailerDuration += interaction.trailerDuration
            }
        })

        // Get summary for genre preferences
        const summary = await getInteractionSummary(userId)

        return {
            totalInteractions: allInteractions.length,
            interactionsByType,
            topGenres: summary?.genrePreferences.slice(0, 5) || [],
            recentInteractions: allInteractions.slice(0, 10),
            trailerEngagement: {
                totalPlays: totalTrailerPlays,
                averageDuration:
                    totalTrailerPlays > 0 ? totalTrailerDuration / totalTrailerPlays : 0,
                totalDuration: totalTrailerDuration,
            },
        }
    } catch (error) {
        console.error('Failed to get interaction analytics:', error)
        throw error
    }
}

/**
 * Delete old interactions (data retention)
 *
 * @param userId - User ID
 * @param retentionDays - Number of days to keep interactions
 * @returns Promise<number> - Number of interactions deleted
 */
export async function cleanupOldInteractions(
    userId: string,
    retentionDays: number = INTERACTION_CONSTRAINTS.RETENTION_DAYS
): Promise<number> {
    try {
        const cutoffTimestamp = Date.now() - retentionDays * 24 * 60 * 60 * 1000

        const q = query(getInteractionsCollection(userId), where('timestamp', '<', cutoffTimestamp))

        const querySnapshot = await getDocs(q)
        const batch = writeBatch(db)
        let deleteCount = 0

        querySnapshot.forEach((docSnap) => {
            batch.delete(docSnap.ref)
            deleteCount++
        })

        if (deleteCount > 0) {
            await batch.commit()
            console.log(`Deleted ${deleteCount} old interactions for user ${userId}`)
        }

        return deleteCount
    } catch (error) {
        console.error('Failed to cleanup old interactions:', error)
        return 0
    }
}

/**
 * Helper to get genre name from ID
 * Uses a simplified genre map - should be synced with MOVIE_GENRES/TV_GENRES constants
 */
function getGenreName(genreId: number): string {
    const genreMap: Record<number, string> = {
        28: 'Action',
        12: 'Adventure',
        16: 'Animation',
        35: 'Comedy',
        80: 'Crime',
        99: 'Documentary',
        18: 'Drama',
        10751: 'Family',
        14: 'Fantasy',
        36: 'History',
        27: 'Horror',
        10402: 'Music',
        9648: 'Mystery',
        10749: 'Romance',
        878: 'Science Fiction',
        10770: 'TV Movie',
        53: 'Thriller',
        10752: 'War',
        37: 'Western',
        // TV-specific genres
        10759: 'Action & Adventure',
        10762: 'Kids',
        10763: 'News',
        10764: 'Reality',
        10765: 'Sci-Fi & Fantasy',
        10766: 'Soap',
        10767: 'Talk',
        10768: 'War & Politics',
    }

    return genreMap[genreId] || 'Unknown'
}

/**
 * Helper function to create interaction from content
 * Extracts necessary data from Content object
 */
export function createInteractionFromContent(
    content: Content,
    interactionType: InteractionType,
    options?: {
        trailerDuration?: number
        searchQuery?: string
        collectionId?: string
        source?: InteractionSource
    }
): Omit<UserInteraction, 'id' | 'timestamp' | 'userId'> {
    return {
        contentId: content.id,
        mediaType: content.media_type,
        interactionType,
        genreIds: content.genre_ids || [],
        ...options,
    }
}

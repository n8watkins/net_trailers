/**
 * Rankings Firestore Utilities
 *
 * Handles all Firestore operations for rankings:
 * - Create/read/update/delete rankings
 * - Comments and likes
 * - View tracking
 * - Search and filtering
 */

import { nanoid } from 'nanoid'
import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
    query,
    where,
    orderBy,
    limit as firestoreLimit,
    increment,
    runTransaction,
    QueryConstraint,
} from 'firebase/firestore'
import { db } from '../../firebase'
import {
    Ranking,
    RankedItem,
    CreateRankingRequest,
    UpdateRankingRequest,
} from '../../types/rankings'
import { NotFoundError, UnauthorizedError } from './errors'
import {
    validateRankingCreation,
    validateRankingUpdate,
    validateUserId,
    validateRankingId,
} from './validation'

/**
 * Collection references
 */
const COLLECTIONS = {
    rankings: 'rankings',
    comments: 'ranking_comments',
    likes: 'ranking_likes',
    commentLikes: 'comment_likes',
    views: 'ranking_views',
}

/**
 * Get ranking document reference
 */
function getRankingDocRef(rankingId: string) {
    return doc(db, COLLECTIONS.rankings, rankingId)
}

/**
 * Create denormalized content data for search
 */
function extractContentMetadata(rankedItems: RankedItem[]) {
    const contentIds: number[] = []
    const contentTitles: string[] = []
    const contentActors: string[] = []
    const contentDirectors: string[] = []

    rankedItems.forEach((item) => {
        contentIds.push(item.content.id)

        // Extract title
        const title = 'title' in item.content ? item.content.title : item.content.name
        if (title) contentTitles.push(title)

        // Extract actors (if available in content data)
        // Note: TMDB content might not have full cast info in cached data
        // This is placeholder for when we fetch full details

        // Extract directors (if available)
    })

    return {
        contentIds,
        contentTitles,
        contentActors,
        contentDirectors,
    }
}

/**
 * Create a new ranking
 */
export async function createRanking(
    userId: string,
    username: string,
    userAvatar: string | undefined,
    request: CreateRankingRequest
): Promise<string> {
    // Validate inputs
    validateUserId(userId)
    validateRankingCreation(request)

    const rankingId = nanoid(12)
    const now = Date.now()

    const ranking: Ranking = {
        id: rankingId,
        userId,
        userName: username,
        userAvatar: userAvatar || null,
        title: request.title.trim(),
        description: request.description?.trim(),
        rankedItems: [],
        isPublic: request.isPublic ?? true,
        itemCount: request.itemCount,
        createdAt: now,
        updatedAt: now,
        likes: 0,
        comments: 0,
        views: 0,
        contentIds: [],
        contentTitles: [],
        tags: request.tags,
    }

    const rankingRef = getRankingDocRef(rankingId)
    await setDoc(rankingRef, ranking)

    return rankingId
}

/**
 * Get ranking by ID
 */
export async function getRanking(rankingId: string): Promise<Ranking | null> {
    try {
        const rankingRef = getRankingDocRef(rankingId)
        const rankingDoc = await getDoc(rankingRef)

        if (!rankingDoc.exists()) {
            return null
        }

        return rankingDoc.data() as Ranking
    } catch (error) {
        console.error('Error getting ranking:', error)
        throw error
    }
}

/**
 * Get user's rankings
 */
export async function getUserRankings(userId: string): Promise<Ranking[]> {
    try {
        const rankingsRef = collection(db, COLLECTIONS.rankings)
        const q = query(rankingsRef, where('userId', '==', userId), orderBy('updatedAt', 'desc'))

        const snapshot = await getDocs(q)
        const rankings: Ranking[] = []

        snapshot.forEach((doc) => {
            rankings.push(doc.data() as Ranking)
        })

        return rankings
    } catch (error) {
        console.error('Error getting user rankings:', error)
        throw error
    }
}

/**
 * Get public rankings for community page
 */
export async function getPublicRankings(
    sortBy: 'recent' | 'popular' | 'most-liked' | 'most-viewed',
    limit: number = 50
): Promise<Ranking[]> {
    try {
        const rankingsRef = collection(db, COLLECTIONS.rankings)
        const constraints: QueryConstraint[] = [
            where('isPublic', '==', true),
            firestoreLimit(limit),
        ]

        // Add sorting
        switch (sortBy) {
            case 'recent':
                constraints.push(orderBy('createdAt', 'desc'))
                break
            case 'most-liked':
                constraints.push(orderBy('likes', 'desc'))
                break
            case 'most-viewed':
                constraints.push(orderBy('views', 'desc'))
                break
            case 'popular':
                // Popularity = combination of likes + views + comments
                // For now, sort by likes (would need computed field for true popularity)
                constraints.push(orderBy('likes', 'desc'))
                break
        }

        const q = query(rankingsRef, ...constraints)
        const snapshot = await getDocs(q)
        const rankings: Ranking[] = []

        snapshot.forEach((doc) => {
            rankings.push(doc.data() as Ranking)
        })

        return rankings
    } catch (error) {
        console.error('Error getting public rankings:', error)
        throw error
    }
}

/**
 * Update ranking
 */
export async function updateRanking(
    userId: string,
    rankingId: string,
    updates: UpdateRankingRequest
): Promise<void> {
    // Validate inputs
    validateUserId(userId)
    validateRankingId(rankingId)
    validateRankingUpdate(updates)

    // Use transaction to prevent TOCTOU vulnerability
    await runTransaction(db, async (transaction) => {
        const rankingRef = getRankingDocRef(rankingId)
        const rankingDoc = await transaction.get(rankingRef)

        if (!rankingDoc.exists()) {
            throw new NotFoundError('Ranking', rankingId)
        }

        const ranking = rankingDoc.data() as Ranking
        if (ranking.userId !== userId) {
            throw new UnauthorizedError('update this ranking')
        }

        // If updating rankedItems, extract metadata
        let metadata = {}
        if (updates.rankedItems) {
            metadata = extractContentMetadata(updates.rankedItems)
        }

        // Trim text fields
        const sanitizedUpdates = {
            ...updates,
            title: updates.title?.trim(),
            description: updates.description?.trim(),
        }

        transaction.update(rankingRef, {
            ...sanitizedUpdates,
            ...metadata,
            updatedAt: Date.now(),
        })
    })
}

/**
 * Delete ranking
 */
export async function deleteRanking(userId: string, rankingId: string): Promise<void> {
    validateUserId(userId)
    validateRankingId(rankingId)

    await runTransaction(db, async (transaction) => {
        const rankingRef = getRankingDocRef(rankingId)
        const rankingDoc = await transaction.get(rankingRef)

        if (!rankingDoc.exists()) {
            throw new NotFoundError('Ranking', rankingId)
        }

        const ranking = rankingDoc.data() as Ranking
        if (ranking.userId !== userId) {
            throw new UnauthorizedError('delete this ranking')
        }

        // Delete ranking
        transaction.delete(rankingRef)

        // Note: Comments, likes, and views will be orphaned but that's OK
        // Could add cleanup job later, or use Firestore security rules to cascade
    })
}

/**
 * Like ranking
 */
export async function likeRanking(userId: string, rankingId: string): Promise<void> {
    try {
        const likeId = `${userId}_${rankingId}`
        const likeRef = doc(db, COLLECTIONS.likes, likeId)
        const rankingRef = getRankingDocRef(rankingId)

        await runTransaction(db, async (transaction) => {
            // Check if already liked
            const likeDoc = await transaction.get(likeRef)
            if (likeDoc.exists()) {
                return // Already liked
            }

            // Create like record
            transaction.set(likeRef, {
                id: likeId,
                rankingId,
                userId,
                likedAt: Date.now(),
            })

            // Increment ranking likes count
            transaction.update(rankingRef, {
                likes: increment(1),
            })
        })
    } catch (error) {
        console.error('Error liking ranking:', error)
        throw error
    }
}

/**
 * Unlike ranking
 */
export async function unlikeRanking(userId: string, rankingId: string): Promise<void> {
    try {
        const likeId = `${userId}_${rankingId}`
        const likeRef = doc(db, COLLECTIONS.likes, likeId)
        const rankingRef = getRankingDocRef(rankingId)

        await runTransaction(db, async (transaction) => {
            // Check if liked
            const likeDoc = await transaction.get(likeRef)
            if (!likeDoc.exists()) {
                return // Not liked
            }

            // Delete like record
            transaction.delete(likeRef)

            // Decrement ranking likes count
            transaction.update(rankingRef, {
                likes: increment(-1),
            })
        })
    } catch (error) {
        console.error('Error unliking ranking:', error)
        throw error
    }
}

/**
 * Check if user has liked a ranking
 */
export async function hasUserLikedRanking(userId: string, rankingId: string): Promise<boolean> {
    try {
        const likeId = `${userId}_${rankingId}`
        const likeRef = doc(db, COLLECTIONS.likes, likeId)
        const likeDoc = await getDoc(likeRef)

        return likeDoc.exists()
    } catch (error) {
        console.error('Error checking if user liked ranking:', error)
        return false
    }
}

/**
 * Increment view count (debounced on client)
 */
export async function incrementRankingView(rankingId: string, userId?: string): Promise<void> {
    try {
        const rankingRef = getRankingDocRef(rankingId)

        // Don't track view if it's the ranking owner
        if (userId) {
            const rankingDoc = await getDoc(rankingRef)
            if (rankingDoc.exists()) {
                const ranking = rankingDoc.data() as Ranking
                if (ranking.userId === userId) {
                    return // Don't count owner's views
                }
            }
        }

        // Simple increment - could add more sophisticated tracking with view records
        await updateDoc(rankingRef, {
            views: increment(1),
        })
    } catch (error) {
        console.error('Error incrementing ranking view:', error)
        // Don't throw - view tracking shouldn't block user experience
    }
}

/**
 * Search rankings by title/description/content
 */
export async function searchRankings(searchQuery: string, limit: number = 20): Promise<Ranking[]> {
    try {
        // Firestore doesn't support full-text search
        // This is basic implementation - use Algolia for production
        const rankingsRef = collection(db, COLLECTIONS.rankings)
        const q = query(
            rankingsRef,
            where('isPublic', '==', true),
            firestoreLimit(100) // Get more to filter client-side
        )

        const snapshot = await getDocs(q)
        const rankings: Ranking[] = []
        const lowerQuery = searchQuery.toLowerCase()

        snapshot.forEach((doc) => {
            const ranking = doc.data() as Ranking

            // Search in title, description, and content titles
            const matchesTitle = ranking.title.toLowerCase().includes(lowerQuery)
            const matchesDescription = ranking.description?.toLowerCase().includes(lowerQuery)
            const matchesContent = ranking.contentTitles.some((title) =>
                title.toLowerCase().includes(lowerQuery)
            )

            if (matchesTitle || matchesDescription || matchesContent) {
                rankings.push(ranking)
            }
        })

        return rankings.slice(0, limit)
    } catch (error) {
        console.error('Error searching rankings:', error)
        throw error
    }
}

/**
 * Ranking Comments Firestore Utilities
 *
 * Handles all Firestore operations for ranking comments:
 * - Create/read/delete comments
 * - One-level replies
 * - Comment likes
 */

import { nanoid } from 'nanoid'
import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit as firestoreLimit,
    increment,
    runTransaction,
    arrayUnion,
    arrayRemove,
    DocumentSnapshot,
    startAfter,
} from 'firebase/firestore'
import { db } from '../../firebase'
import { RankingComment, CreateCommentRequest, RANKING_CONSTRAINTS } from '../../types/rankings'
import { NotFoundError, UnauthorizedError, ValidationError } from './errors'
import { validateCommentText, validateUserId, validateRankingId } from './validation'
import { PaginatedResult, createPaginatedResult } from '../../types/pagination'

const COLLECTIONS = {
    comments: 'ranking_comments',
    commentLikes: 'comment_likes',
    rankings: 'rankings',
}

/**
 * Remove undefined values from an object recursively
 * Firestore doesn't accept undefined values
 */
function removeUndefined(obj: any): any {
    if (obj === null || obj === undefined) {
        return null
    }
    if (Array.isArray(obj)) {
        return obj.map((item) => removeUndefined(item))
    }
    if (typeof obj === 'object') {
        const cleaned: any = {}
        for (const [key, value] of Object.entries(obj)) {
            if (value !== undefined) {
                cleaned[key] = removeUndefined(value)
            }
        }
        return cleaned
    }
    return obj
}

/**
 * Get comment document reference
 */
function getCommentDocRef(commentId: string) {
    return doc(db, COLLECTIONS.comments, commentId)
}

/**
 * Create a new comment
 */
export async function createComment(
    userId: string,
    username: string,
    userAvatar: string | undefined,
    request: CreateCommentRequest
): Promise<RankingComment> {
    // Validate inputs
    validateUserId(userId)
    validateRankingId(request.rankingId)
    validateCommentText(request.text)

    const commentId = nanoid(12)
    const now = Date.now()

    const comment: RankingComment = {
        id: commentId,
        rankingId: request.rankingId,
        userId,
        userName: username,
        userAvatar: userAvatar || null,
        type: request.type,
        positionNumber: request.positionNumber ?? null,
        text: request.text,
        createdAt: now,
        likes: 0,
        parentCommentId: request.parentCommentId ?? null,
    }

    // Remove undefined values before saving to Firestore
    const cleanedComment = removeUndefined(comment)

    await runTransaction(db, async (transaction) => {
        // IMPORTANT: All reads must happen before all writes in Firestore transactions

        // Read parent comment if this is a reply (must be before any writes)
        let parentDoc = null
        if (request.parentCommentId) {
            const parentRef = getCommentDocRef(request.parentCommentId)
            parentDoc = await transaction.get(parentRef)

            if (!parentDoc.exists()) {
                throw new NotFoundError('Parent comment', request.parentCommentId)
            }

            const parent = parentDoc.data() as RankingComment

            // Prevent nested replies (only one level deep)
            if (parent.parentCommentId) {
                throw new ValidationError(
                    'Cannot reply to a reply. Only one level of replies is supported.'
                )
            }

            // Check reply limit to prevent unbounded array growth
            const currentReplyCount = parent.replies?.length || 0
            if (currentReplyCount >= RANKING_CONSTRAINTS.MAX_REPLIES_PER_COMMENT) {
                throw new ValidationError(
                    `Comment has reached the maximum of ${RANKING_CONSTRAINTS.MAX_REPLIES_PER_COMMENT} replies.`
                )
            }
        }

        // Now perform all writes after reads are complete

        // Create comment
        const commentRef = getCommentDocRef(commentId)
        transaction.set(commentRef, cleanedComment)

        // If reply, add to parent's replies array using arrayUnion (atomic operation)
        if (request.parentCommentId && parentDoc) {
            const parentRef = getCommentDocRef(request.parentCommentId)
            transaction.update(parentRef, {
                replies: arrayUnion(cleanedComment),
            })
        }

        // Increment ranking comment count
        const rankingRef = doc(db, COLLECTIONS.rankings, request.rankingId)
        transaction.update(rankingRef, {
            comments: increment(1),
        })
    })

    return comment
}

/**
 * Get comments for a ranking (with pagination support)
 */
export async function getRankingComments(
    rankingId: string,
    limit: number = 50,
    startAfterDoc?: DocumentSnapshot | null
): Promise<PaginatedResult<RankingComment>> {
    try {
        const commentsRef = collection(db, COLLECTIONS.comments)
        const constraints: any[] = [
            where('rankingId', '==', rankingId),
            where('parentCommentId', '==', null),
            orderBy('createdAt', 'desc'),
            firestoreLimit(limit),
        ]

        // Add cursor if provided
        if (startAfterDoc) {
            constraints.push(startAfter(startAfterDoc))
        }

        const q = query(commentsRef, ...constraints)
        const snapshot = await getDocs(q)
        const comments: RankingComment[] = []

        snapshot.forEach((doc) => {
            comments.push(doc.data() as RankingComment)
        })

        // Return with cursor
        const lastDoc = snapshot.docs[snapshot.docs.length - 1] || null
        return createPaginatedResult(comments, lastDoc, limit)
    } catch (error) {
        console.error('Error getting ranking comments:', error)
        throw error
    }
}

/**
 * Get comments for a specific position in ranking (with pagination support)
 */
export async function getPositionComments(
    rankingId: string,
    position: number,
    limit: number = 50,
    startAfterDoc?: DocumentSnapshot | null
): Promise<PaginatedResult<RankingComment>> {
    try {
        const commentsRef = collection(db, COLLECTIONS.comments)
        const constraints: any[] = [
            where('rankingId', '==', rankingId),
            where('type', '==', 'position'),
            where('positionNumber', '==', position),
            where('parentCommentId', '==', null),
            orderBy('createdAt', 'desc'),
            firestoreLimit(limit),
        ]

        // Add cursor if provided
        if (startAfterDoc) {
            constraints.push(startAfter(startAfterDoc))
        }

        const q = query(commentsRef, ...constraints)
        const snapshot = await getDocs(q)
        const comments: RankingComment[] = []

        snapshot.forEach((doc) => {
            comments.push(doc.data() as RankingComment)
        })

        // Return with cursor
        const lastDoc = snapshot.docs[snapshot.docs.length - 1] || null
        return createPaginatedResult(comments, lastDoc, limit)
    } catch (error) {
        console.error('Error getting position comments:', error)
        throw error
    }
}

/**
 * Delete comment
 * Can be deleted by comment author or ranking owner
 */
export async function deleteComment(
    userId: string,
    commentId: string,
    rankingOwnerId: string
): Promise<void> {
    validateUserId(userId)

    await runTransaction(db, async (transaction) => {
        const commentRef = getCommentDocRef(commentId)
        const commentDoc = await transaction.get(commentRef)

        if (!commentDoc.exists()) {
            throw new NotFoundError('Comment', commentId)
        }

        const comment = commentDoc.data() as RankingComment

        // Check permissions: comment owner or ranking owner can delete
        if (comment.userId !== userId && rankingOwnerId !== userId) {
            throw new UnauthorizedError('delete this comment')
        }

        // Delete comment
        transaction.delete(commentRef)

        // If this is a reply, remove from parent's replies array
        if (comment.parentCommentId) {
            const parentRef = getCommentDocRef(comment.parentCommentId)
            const parentDoc = await transaction.get(parentRef)

            if (parentDoc.exists()) {
                const parent = parentDoc.data() as RankingComment
                // Filter by ID instead of using arrayRemove to handle modified objects
                // arrayRemove fails if the comment object has been updated (e.g., likes changed)
                const updatedReplies = (parent.replies || []).filter((r) => r.id !== comment.id)
                transaction.update(parentRef, {
                    replies: updatedReplies,
                })
            }
        }

        // Decrement ranking comment count (but don't go below 0)
        const rankingRef = doc(db, COLLECTIONS.rankings, comment.rankingId)
        const rankingDoc = await transaction.get(rankingRef)

        if (rankingDoc.exists()) {
            transaction.update(rankingRef, {
                comments: increment(-1),
            })
        }
    })
}

/**
 * Like comment
 */
export async function likeComment(userId: string, commentId: string): Promise<void> {
    try {
        const likeId = `${userId}_${commentId}`
        const likeRef = doc(db, COLLECTIONS.commentLikes, likeId)
        const commentRef = getCommentDocRef(commentId)

        await runTransaction(db, async (transaction) => {
            // Check if already liked
            const likeDoc = await transaction.get(likeRef)
            if (likeDoc.exists()) {
                return // Already liked
            }

            // Create like record
            transaction.set(likeRef, {
                id: likeId,
                commentId,
                userId,
                likedAt: Date.now(),
            })

            // Increment comment likes count
            transaction.update(commentRef, {
                likes: increment(1),
            })
        })
    } catch (error) {
        console.error('Error liking comment:', error)
        throw error
    }
}

/**
 * Unlike comment
 */
export async function unlikeComment(userId: string, commentId: string): Promise<void> {
    try {
        const likeId = `${userId}_${commentId}`
        const likeRef = doc(db, COLLECTIONS.commentLikes, likeId)
        const commentRef = getCommentDocRef(commentId)

        await runTransaction(db, async (transaction) => {
            // Check if liked
            const likeDoc = await transaction.get(likeRef)
            if (!likeDoc.exists()) {
                return // Not liked
            }

            // Delete like record
            transaction.delete(likeRef)

            // Decrement comment likes count
            transaction.update(commentRef, {
                likes: increment(-1),
            })
        })
    } catch (error) {
        console.error('Error unliking comment:', error)
        throw error
    }
}

/**
 * Check if user has liked a comment
 */
export async function hasUserLikedComment(userId: string, commentId: string): Promise<boolean> {
    try {
        const likeId = `${userId}_${commentId}`
        const likeRef = doc(db, COLLECTIONS.commentLikes, likeId)
        const likeDoc = await getDoc(likeRef)

        return likeDoc.exists()
    } catch (error) {
        console.error('Error checking if user liked comment:', error)
        return false
    }
}

/**
 * Get all comments by a specific user across all rankings (with pagination support)
 */
export async function getUserComments(
    userId: string,
    limit: number = 50,
    startAfterDoc?: DocumentSnapshot | null
): Promise<PaginatedResult<RankingComment>> {
    try {
        const commentsRef = collection(db, COLLECTIONS.comments)
        const constraints: any[] = [
            where('userId', '==', userId),
            orderBy('createdAt', 'desc'),
            firestoreLimit(limit),
        ]

        // Add cursor if provided
        if (startAfterDoc) {
            constraints.push(startAfter(startAfterDoc))
        }

        const q = query(commentsRef, ...constraints)
        const snapshot = await getDocs(q)
        const comments: RankingComment[] = []

        snapshot.forEach((doc) => {
            comments.push(doc.data() as RankingComment)
        })

        // Return with cursor
        const lastDoc = snapshot.docs[snapshot.docs.length - 1] || null
        return createPaginatedResult(comments, lastDoc, limit)
    } catch (error) {
        console.error('Error getting user comments:', error)
        throw error
    }
}

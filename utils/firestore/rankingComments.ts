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
} from 'firebase/firestore'
import { db } from '../../firebase'
import { RankingComment, CreateCommentRequest } from '../../types/rankings'

const COLLECTIONS = {
    comments: 'ranking_comments',
    commentLikes: 'comment_likes',
    rankings: 'rankings',
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
    try {
        const commentId = nanoid(12)
        const now = Date.now()

        const comment: RankingComment = {
            id: commentId,
            rankingId: request.rankingId,
            userId,
            userName: username,
            userAvatar,
            type: request.type,
            positionNumber: request.positionNumber,
            text: request.text,
            createdAt: now,
            likes: 0,
            parentCommentId: request.parentCommentId,
        }

        await runTransaction(db, async (transaction) => {
            // Create comment
            const commentRef = getCommentDocRef(commentId)
            transaction.set(commentRef, comment)

            // If reply, add to parent's replies array
            if (request.parentCommentId) {
                const parentRef = getCommentDocRef(request.parentCommentId)
                const parentDoc = await transaction.get(parentRef)

                if (parentDoc.exists()) {
                    const parent = parentDoc.data() as RankingComment
                    const replies = parent.replies || []
                    replies.push(comment)

                    transaction.update(parentRef, { replies })
                }
            }

            // Increment ranking comment count
            const rankingRef = doc(db, COLLECTIONS.rankings, request.rankingId)
            transaction.update(rankingRef, {
                comments: increment(1),
            })
        })

        return comment
    } catch (error) {
        console.error('Error creating comment:', error)
        throw error
    }
}

/**
 * Get comments for a ranking
 */
export async function getRankingComments(
    rankingId: string,
    limit: number = 50
): Promise<RankingComment[]> {
    try {
        const commentsRef = collection(db, COLLECTIONS.comments)

        // Get top-level comments only (no parentCommentId)
        const q = query(
            commentsRef,
            where('rankingId', '==', rankingId),
            where('parentCommentId', '==', null),
            orderBy('createdAt', 'desc'),
            firestoreLimit(limit)
        )

        const snapshot = await getDocs(q)
        const comments: RankingComment[] = []

        snapshot.forEach((doc) => {
            comments.push(doc.data() as RankingComment)
        })

        return comments
    } catch (error) {
        console.error('Error getting ranking comments:', error)
        throw error
    }
}

/**
 * Get comments for a specific position in ranking
 */
export async function getPositionComments(
    rankingId: string,
    position: number
): Promise<RankingComment[]> {
    try {
        const commentsRef = collection(db, COLLECTIONS.comments)
        const q = query(
            commentsRef,
            where('rankingId', '==', rankingId),
            where('type', '==', 'position'),
            where('positionNumber', '==', position),
            where('parentCommentId', '==', null),
            orderBy('createdAt', 'desc')
        )

        const snapshot = await getDocs(q)
        const comments: RankingComment[] = []

        snapshot.forEach((doc) => {
            comments.push(doc.data() as RankingComment)
        })

        return comments
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
    try {
        await runTransaction(db, async (transaction) => {
            const commentRef = getCommentDocRef(commentId)
            const commentDoc = await transaction.get(commentRef)

            if (!commentDoc.exists()) {
                throw new Error('Comment not found')
            }

            const comment = commentDoc.data() as RankingComment

            // Check permissions
            if (comment.userId !== userId && rankingOwnerId !== userId) {
                throw new Error('Not authorized to delete this comment')
            }

            // Delete comment
            transaction.delete(commentRef)

            // If this is a reply, remove from parent's replies array
            if (comment.parentCommentId) {
                const parentRef = getCommentDocRef(comment.parentCommentId)
                const parentDoc = await transaction.get(parentRef)

                if (parentDoc.exists()) {
                    const parent = parentDoc.data() as RankingComment
                    const replies = (parent.replies || []).filter((r) => r.id !== commentId)
                    transaction.update(parentRef, { replies })
                }
            }

            // Decrement ranking comment count
            const rankingRef = doc(db, COLLECTIONS.rankings, comment.rankingId)
            transaction.update(rankingRef, {
                comments: increment(-1),
            })
        })
    } catch (error) {
        console.error('Error deleting comment:', error)
        throw error
    }
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

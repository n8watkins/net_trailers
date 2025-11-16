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
    writeBatch,
} from 'firebase/firestore'
import { db } from '../../firebase'
import { RankingComment, CreateCommentRequest, RANKING_CONSTRAINTS } from '../../types/rankings'
import { NotFoundError, UnauthorizedError, ValidationError } from './errors'
import { validateCommentText, validateUserId, validateRankingId } from './validation'
import { PaginatedResult, createPaginatedResult } from '../../types/pagination'
import { EmailService } from '../../lib/email/email-service'

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

    // Send email notification after successful comment creation
    // Don't await to avoid blocking the comment creation
    sendCommentEmailNotification(userId, username, comment, request.parentCommentId ?? null).catch(
        (error) => {
            console.error('Error sending comment email notification:', error)
            // Don't throw - email failure shouldn't fail comment creation
        }
    )

    return comment
}

/**
 * Send email notification for new comment/reply
 * Notifies ranking owner for comments, or parent comment author for replies
 */
async function sendCommentEmailNotification(
    commenterId: string,
    commenterName: string,
    comment: RankingComment,
    parentCommentId: string | null
): Promise<void> {
    try {
        // Get ranking details
        const rankingRef = doc(db, COLLECTIONS.rankings, comment.rankingId)
        const rankingSnap = await getDoc(rankingRef)

        if (!rankingSnap.exists()) {
            return
        }

        const ranking = rankingSnap.data() as any
        const isReply = !!parentCommentId

        // Determine recipient
        let recipientId: string
        let parentCommentText: string | undefined

        if (isReply) {
            // Get parent comment to notify its author
            const parentCommentRef = getCommentDocRef(parentCommentId)
            const parentCommentSnap = await getDoc(parentCommentRef)

            if (!parentCommentSnap.exists()) {
                return
            }

            const parentComment = parentCommentSnap.data() as RankingComment
            recipientId = parentComment.userId
            parentCommentText = parentComment.text

            // Don't notify if replying to yourself
            if (recipientId === commenterId) {
                return
            }
        } else {
            // Notify ranking owner
            recipientId = ranking.userId

            // Don't notify if commenting on your own ranking
            if (recipientId === commenterId) {
                return
            }
        }

        // Get recipient's profile for email and preferences
        const userRef = doc(db, 'users', recipientId)
        const userSnap = await getDoc(userRef)

        if (!userSnap.exists()) {
            return
        }

        const userData = userSnap.data()
        const email = userData?.profile?.email || userData?.email
        const username = userData?.profile?.username || userData?.username

        // Check email notification preferences
        const notificationPreferences = userData?.notificationPreferences
        const emailEnabled = notificationPreferences?.email === true

        if (!email || !emailEnabled) {
            return
        }

        // Send email using EmailService
        await EmailService.sendRankingComment({
            to: email,
            userName: username,
            rankingTitle: ranking.title,
            rankingId: comment.rankingId,
            commenterName,
            commentText: comment.text,
            commentId: comment.id,
            isReply,
            parentCommentText,
        })

        console.log(`Sent comment email notification to ${email} for ranking "${ranking.title}"`)
    } catch (error) {
        console.error('Error in sendCommentEmailNotification:', error)
        throw error
    }
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

/**
 * Update denormalized username across all comments and replies authored by a user
 */
export async function updateRankingCommentsUsername(
    userId: string,
    newUsername: string
): Promise<void> {
    try {
        const commentsRef = collection(db, COLLECTIONS.comments)
        const commentsSnapshot = await getDocs(query(commentsRef, where('userId', '==', userId)))

        if (commentsSnapshot.empty) {
            return
        }

        let batch = writeBatch(db)
        let operations = 0
        const replyParentMap = new Map<string, Set<string>>()

        for (const commentDoc of commentsSnapshot.docs) {
            batch.update(commentDoc.ref, { userName: newUsername })
            operations++

            const commentData = commentDoc.data() as RankingComment
            if (commentData.parentCommentId) {
                if (!replyParentMap.has(commentData.parentCommentId)) {
                    replyParentMap.set(commentData.parentCommentId, new Set<string>())
                }
                replyParentMap.get(commentData.parentCommentId)!.add(commentData.id)
            }

            if (operations === 500) {
                await batch.commit()
                batch = writeBatch(db)
                operations = 0
            }
        }

        if (operations > 0) {
            await batch.commit()
        }

        // Update embedded reply entries on parent comments
        for (const [parentId, replyIds] of replyParentMap.entries()) {
            const parentRef = getCommentDocRef(parentId)
            const parentSnap = await getDoc(parentRef)
            if (!parentSnap.exists()) {
                continue
            }

            const parentData = parentSnap.data() as RankingComment
            const replies = parentData.replies || []
            let hasChanges = false

            const updatedReplies = replies.map((reply) => {
                if (replyIds.has(reply.id)) {
                    hasChanges = true
                    return { ...reply, userName: newUsername }
                }
                return reply
            })

            if (hasChanges) {
                await updateDoc(parentRef, {
                    replies: updatedReplies,
                })
            }
        }
    } catch (error) {
        console.error('Error updating ranking comment usernames:', error)
        throw error
    }
}

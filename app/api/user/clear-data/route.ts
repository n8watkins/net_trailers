/**
 * Server-Side User Data Clearing API
 *
 * Clears ALL user data using Firebase Admin SDK to bypass security rules.
 * This includes:
 * - Collections/watchlists
 * - Watch history
 * - Notifications
 * - Rankings (and associated comments/likes)
 * - Forum threads (and associated replies/likes)
 * - Forum polls (and associated votes)
 *
 * POST /api/user/clear-data
 */

import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { validateOrigin } from '../../../../lib/csrfProtection'
import { verifyIdToken } from '../../../../lib/firebase-admin'
import { getAdminDb } from '../../../../lib/firebase-admin'

export async function POST(request: NextRequest) {
    // CSRF protection
    const headersList = await headers()
    if (!validateOrigin(headersList)) {
        return NextResponse.json({ error: 'Invalid origin' }, { status: 403 })
    }

    console.log('\n🗑️ === SERVER-SIDE USER DATA CLEARING ===\n')

    try {
        // Verify authentication
        const authHeader = headersList.get('authorization')
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Missing or invalid authorization' }, { status: 401 })
        }

        const idToken = authHeader.substring(7)
        const decodedToken = await verifyIdToken(idToken)
        const userId = decodedToken.uid

        console.log(`👤 Clearing data for user: ${userId}`)

        const adminDb = getAdminDb()

        // === 1. Clear Collections/Watchlists/Watch History from main user document ===
        console.log('\n📊 Step 1: Clearing collections and watch history...')
        const userRef = adminDb.collection('users').doc(userId)
        await userRef.update({
            defaultWatchlist: [],
            likedMovies: [],
            hiddenMovies: [],
            userCreatedWatchlists: [],
            lastActive: Date.now(),
        })
        console.log('   ✅ Cleared collections and watchlists')

        // Clear watch history subcollection document
        const watchHistoryRef = userRef.collection('data').doc('watchHistory')
        await watchHistoryRef.set(
            {
                history: [],
                updatedAt: Date.now(),
            },
            { merge: true }
        )
        console.log('   ✅ Cleared watch history')

        // === 2. Clear Notifications ===
        console.log('\n🔔 Step 2: Clearing notifications...')
        const notificationsSnapshot = await userRef.collection('notifications').get()
        let batch = adminDb.batch()
        let operations = 0

        for (const doc of notificationsSnapshot.docs) {
            batch.delete(doc.ref)
            operations++

            if (operations >= 500) {
                await batch.commit()
                console.log(`   💾 Committed batch (${operations} notifications)`)
                batch = adminDb.batch()
                operations = 0
            }
        }

        if (operations > 0) {
            await batch.commit()
            console.log(`   💾 Committed final batch (${operations} notifications)`)
        }
        console.log(`   ✅ Deleted ${notificationsSnapshot.size} notifications`)

        // === 3. Clear Rankings (and associated data) ===
        console.log('\n🏆 Step 3: Clearing rankings...')
        const rankingsSnapshot = await adminDb
            .collection('rankings')
            .where('userId', '==', userId)
            .get()

        let rankingsDeleted = 0
        let commentsDeleted = 0
        let rankingLikesDeleted = 0
        let commentLikesDeleted = 0

        for (const rankingDoc of rankingsSnapshot.docs) {
            const rankingId = rankingDoc.id
            console.log(`   → Deleting ranking: ${rankingId}`)

            // Delete ranking likes
            const rankingLikesSnapshot = await adminDb
                .collection('ranking_likes')
                .where('rankingId', '==', rankingId)
                .get()

            batch = adminDb.batch()
            operations = 0

            for (const likeDoc of rankingLikesSnapshot.docs) {
                batch.delete(likeDoc.ref)
                operations++
            }
            rankingLikesDeleted += rankingLikesSnapshot.size

            // Get comments for this ranking
            const commentsSnapshot = await adminDb
                .collection('ranking_comments')
                .where('rankingId', '==', rankingId)
                .get()

            // Delete comment likes for each comment
            for (const commentDoc of commentsSnapshot.docs) {
                const commentLikesSnapshot = await adminDb
                    .collection('comment_likes')
                    .where('commentId', '==', commentDoc.id)
                    .get()

                for (const likeDoc of commentLikesSnapshot.docs) {
                    batch.delete(likeDoc.ref)
                    operations++
                }
                commentLikesDeleted += commentLikesSnapshot.size
            }

            // Commit likes batch
            if (operations > 0) {
                await batch.commit()
                batch = adminDb.batch()
                operations = 0
            }

            // Delete comments
            for (const commentDoc of commentsSnapshot.docs) {
                batch.delete(commentDoc.ref)
                operations++
            }
            commentsDeleted += commentsSnapshot.size

            // Delete ranking itself
            batch.delete(rankingDoc.ref)
            operations++
            rankingsDeleted++

            // Commit final batch for this ranking
            if (operations > 0) {
                await batch.commit()
                batch = adminDb.batch()
                operations = 0
            }

            console.log(`   ✅ Deleted ranking ${rankingId} with all associated data`)
        }

        console.log(
            `   ✅ Total rankings deleted: ${rankingsDeleted} (${commentsDeleted} comments, ${rankingLikesDeleted} ranking likes, ${commentLikesDeleted} comment likes)`
        )

        // === 4. Clear Forum Threads (and associated data) ===
        console.log('\n💬 Step 4: Clearing forum threads...')
        const threadsSnapshot = await adminDb
            .collection('threads')
            .where('userId', '==', userId)
            .get()

        let threadsDeleted = 0
        let repliesDeleted = 0
        let threadLikesDeleted = 0
        let replyLikesDeleted = 0

        for (const threadDoc of threadsSnapshot.docs) {
            const threadId = threadDoc.id
            console.log(`   → Deleting thread: ${threadId}`)

            batch = adminDb.batch()
            operations = 0

            // Delete thread likes
            const threadLikesSnapshot = await adminDb
                .collection('thread_likes')
                .where('threadId', '==', threadId)
                .get()

            for (const likeDoc of threadLikesSnapshot.docs) {
                batch.delete(likeDoc.ref)
                operations++
            }
            threadLikesDeleted += threadLikesSnapshot.size

            // Get replies for this thread
            const repliesSnapshot = await adminDb
                .collection('thread_replies')
                .where('threadId', '==', threadId)
                .get()

            // Delete reply likes for each reply
            for (const replyDoc of repliesSnapshot.docs) {
                const replyLikesSnapshot = await adminDb
                    .collection('reply_likes')
                    .where('replyId', '==', replyDoc.id)
                    .get()

                for (const likeDoc of replyLikesSnapshot.docs) {
                    batch.delete(likeDoc.ref)
                    operations++
                }
                replyLikesDeleted += replyLikesSnapshot.size
            }

            // Commit likes batch
            if (operations > 0) {
                await batch.commit()
                batch = adminDb.batch()
                operations = 0
            }

            // Delete replies
            for (const replyDoc of repliesSnapshot.docs) {
                batch.delete(replyDoc.ref)
                operations++
            }
            repliesDeleted += repliesSnapshot.size

            // Delete thread itself
            batch.delete(threadDoc.ref)
            operations++
            threadsDeleted++

            // Commit final batch for this thread
            if (operations > 0) {
                await batch.commit()
                batch = adminDb.batch()
                operations = 0
            }

            console.log(`   ✅ Deleted thread ${threadId} with all associated data`)
        }

        console.log(
            `   ✅ Total threads deleted: ${threadsDeleted} (${repliesDeleted} replies, ${threadLikesDeleted} thread likes, ${replyLikesDeleted} reply likes)`
        )

        // === 5. Clear Forum Polls (and associated votes) ===
        console.log('\n📊 Step 5: Clearing forum polls...')
        const pollsSnapshot = await adminDb.collection('polls').where('userId', '==', userId).get()

        let pollsDeleted = 0
        let votesDeleted = 0

        for (const pollDoc of pollsSnapshot.docs) {
            const pollId = pollDoc.id
            console.log(`   → Deleting poll: ${pollId}`)

            batch = adminDb.batch()
            operations = 0

            // Delete poll votes
            const votesSnapshot = await adminDb
                .collection('poll_votes')
                .where('pollId', '==', pollId)
                .get()

            for (const voteDoc of votesSnapshot.docs) {
                batch.delete(voteDoc.ref)
                operations++
            }
            votesDeleted += votesSnapshot.size

            // Delete poll itself
            batch.delete(pollDoc.ref)
            operations++
            pollsDeleted++

            // Commit batch
            if (operations > 0) {
                await batch.commit()
            }

            console.log(`   ✅ Deleted poll ${pollId} with all votes`)
        }

        console.log(`   ✅ Total polls deleted: ${pollsDeleted} (${votesDeleted} votes)`)

        // === Summary ===
        const result = {
            success: true,
            message: 'All user data cleared successfully',
            deleted: {
                collections: 'cleared',
                watchHistory: 'cleared',
                notifications: notificationsSnapshot.size,
                rankings: rankingsDeleted,
                rankingComments: commentsDeleted,
                rankingLikes: rankingLikesDeleted,
                commentLikes: commentLikesDeleted,
                threads: threadsDeleted,
                threadReplies: repliesDeleted,
                threadLikes: threadLikesDeleted,
                replyLikes: replyLikesDeleted,
                polls: pollsDeleted,
                pollVotes: votesDeleted,
            },
        }

        console.log('\n✅ === SUCCESS! ===')
        console.log(JSON.stringify(result, null, 2))
        console.log('\n')

        return NextResponse.json(result)
    } catch (error) {
        console.error('\n❌ === ERROR! ===')
        console.error(error)
        console.error('\n')

        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : 'Failed to clear user data',
                details: error instanceof Error ? error.stack : undefined,
            },
            { status: 500 }
        )
    }
}

/**
 * Delete Ranking API Route (Server-Side)
 *
 * Uses Firebase Admin SDK to delete rankings and all associated data,
 * bypassing client-side security rules that can cause permission errors
 * with nested get() calls.
 */

import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { validateServerActionOrigin } from '@/lib/csrfProtection'
import { getAdminDb } from '@/lib/firebase-admin'
import { verifyIdToken } from '@/lib/firebase-admin'

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        // CSRF protection
        const headersList = await headers()
        if (!validateServerActionOrigin(headersList)) {
            return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 })
        }

        const { id: rankingId } = await params

        if (!rankingId) {
            return NextResponse.json({ error: 'Ranking ID is required' }, { status: 400 })
        }

        // Get auth token from request
        const authHeader = headersList.get('authorization')
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
        }

        const idToken = authHeader.substring(7)

        // Verify the token and get user ID
        let userId: string
        try {
            const decodedToken = await verifyIdToken(idToken)
            userId = decodedToken.uid
        } catch (error) {
            console.error('Token verification failed:', error)
            return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 })
        }

        console.log(`🗑️ Server-side delete requested for ranking ${rankingId} by user ${userId}`)

        const adminDb = getAdminDb()

        // Verify ownership
        const rankingRef = adminDb.collection('rankings').doc(rankingId)
        const rankingDoc = await rankingRef.get()

        if (!rankingDoc.exists) {
            return NextResponse.json({ error: 'Ranking not found' }, { status: 404 })
        }

        const ranking = rankingDoc.data()
        if (ranking?.userId !== userId) {
            return NextResponse.json(
                { error: 'Unauthorized: You can only delete your own rankings' },
                { status: 403 }
            )
        }

        // Start deletion process (use Admin SDK - bypasses security rules)
        console.log('  📝 Verified ownership, starting deletion...')

        // STEP 1: Get all comments for this ranking
        console.log('  📊 STEP 1: Querying comments...')
        let commentsSnapshot
        try {
            commentsSnapshot = await adminDb
                .collection('ranking_comments')
                .where('rankingId', '==', rankingId)
                .get()
            const commentIds = commentsSnapshot.docs.map((doc) => doc.id)
            console.log(`    ✅ Found ${commentIds.length} comments:`, commentIds)
        } catch (error) {
            console.error('    ❌ ERROR querying comments:', error)
            throw new Error(
                `Failed to query comments: ${error instanceof Error ? error.message : 'Unknown error'}`
            )
        }

        // Create batches (Firestore batch limit is 500)
        let batch = adminDb.batch()
        let operations = 0

        // STEP 2: Delete ranking likes
        console.log('  📊 STEP 2: Querying and deleting ranking likes...')
        let rankingLikesSnapshot
        try {
            rankingLikesSnapshot = await adminDb
                .collection('ranking_likes')
                .where('rankingId', '==', rankingId)
                .get()
            console.log(`    ℹ️  Found ${rankingLikesSnapshot.size} ranking likes`)

            for (const doc of rankingLikesSnapshot.docs) {
                try {
                    batch.delete(doc.ref)
                    operations++
                    console.log(`      → Deleting ranking_like: ${doc.id}`)

                    if (operations >= 450) {
                        console.log(`      💾 Committing batch (${operations} operations)...`)
                        await batch.commit()
                        console.log(`      ✅ Batch committed successfully`)
                        batch = adminDb.batch()
                        operations = 0
                    }
                } catch (error) {
                    console.error(`    ❌ ERROR deleting ranking_like ${doc.id}:`, error)
                    throw error
                }
            }
            console.log(`    ✅ Deleted ${rankingLikesSnapshot.size} ranking likes`)
        } catch (error) {
            console.error('    ❌ ERROR in ranking likes deletion:', error)
            throw new Error(
                `Failed to delete ranking likes: ${error instanceof Error ? error.message : 'Unknown error'}`
            )
        }

        // STEP 3: Delete comment likes
        console.log('  📊 STEP 3: Querying and deleting comment likes...')
        let commentLikesDeleted = 0
        const commentIds = commentsSnapshot.docs.map((doc) => doc.id)
        try {
            for (const commentId of commentIds) {
                console.log(`    ℹ️  Processing comment ${commentId}...`)
                const commentLikesSnapshot = await adminDb
                    .collection('comment_likes')
                    .where('commentId', '==', commentId)
                    .get()
                console.log(`      → Found ${commentLikesSnapshot.size} likes for this comment`)

                for (const doc of commentLikesSnapshot.docs) {
                    try {
                        batch.delete(doc.ref)
                        operations++
                        commentLikesDeleted++
                        console.log(`      → Deleting comment_like: ${doc.id}`)

                        if (operations >= 450) {
                            console.log(`      💾 Committing batch (${operations} operations)...`)
                            await batch.commit()
                            console.log(`      ✅ Batch committed successfully`)
                            batch = adminDb.batch()
                            operations = 0
                        }
                    } catch (error) {
                        console.error(`    ❌ ERROR deleting comment_like ${doc.id}:`, error)
                        throw error
                    }
                }
            }
            console.log(`    ✅ Deleted ${commentLikesDeleted} comment likes`)
        } catch (error) {
            console.error('    ❌ ERROR in comment likes deletion:', error)
            throw new Error(
                `Failed to delete comment likes: ${error instanceof Error ? error.message : 'Unknown error'}`
            )
        }

        // Commit any pending operations
        if (operations > 0) {
            console.log(`  💾 Committing pending batch (${operations} operations)...`)
            try {
                await batch.commit()
                console.log(`  ✅ Pending batch committed successfully`)
                batch = adminDb.batch()
                operations = 0
            } catch (error) {
                console.error('  ❌ ERROR committing pending batch:', error)
                throw error
            }
        }

        // STEP 4: Delete comments
        console.log('  📊 STEP 4: Deleting comments...')
        try {
            for (const doc of commentsSnapshot.docs) {
                batch.delete(doc.ref)
                operations++
                console.log(`    → Deleting comment: ${doc.id}`)

                if (operations >= 450) {
                    console.log(`    💾 Committing batch (${operations} operations)...`)
                    await batch.commit()
                    console.log(`    ✅ Batch committed successfully`)
                    batch = adminDb.batch()
                    operations = 0
                }
            }
            console.log(`    ✅ Deleted ${commentsSnapshot.size} comments`)
        } catch (error) {
            console.error('    ❌ ERROR in comments deletion:', error)
            throw new Error(
                `Failed to delete comments: ${error instanceof Error ? error.message : 'Unknown error'}`
            )
        }

        // STEP 5: Delete the ranking itself
        console.log('  📊 STEP 5: Deleting ranking document...')
        try {
            batch.delete(rankingRef)
            operations++
            console.log(`    → Deleting ranking: ${rankingId}`)

            // Final commit
            console.log(`  💾 Final commit (${operations} operations)...`)
            await batch.commit()
            console.log(`  ✅ Final batch committed successfully`)
        } catch (error) {
            console.error('    ❌ ERROR deleting ranking:', error)
            throw new Error(
                `Failed to delete ranking: ${error instanceof Error ? error.message : 'Unknown error'}`
            )
        }

        console.log(`  ✅ Successfully deleted ranking ${rankingId} and all associated data`)

        return NextResponse.json({
            success: true,
            message: 'Ranking deleted successfully',
            deleted: {
                rankingLikes: rankingLikesSnapshot.size,
                commentLikes: commentLikesDeleted,
                comments: commentsSnapshot.size,
                ranking: 1,
            },
        })
    } catch (error) {
        console.error('Server-side ranking delete error:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to delete ranking' },
            { status: 500 }
        )
    }
}

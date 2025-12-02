/**
 * Admin API: Cleanup Orphaned Comments
 *
 * Removes comments that reference rankings that no longer exist.
 * GET /api/admin/cleanup-orphaned-comments
 */

import { NextResponse } from 'next/server'
import { getAdminDb } from '../../../../lib/firebase-admin'

export async function GET() {
    // Only allow in development
    if (process.env.NODE_ENV !== 'development') {
        return NextResponse.json({ error: 'Only available in development' }, { status: 403 })
    }

    console.log('\n🧹 === STARTING ORPHANED COMMENTS CLEANUP ===\n')

    try {
        const adminDb = getAdminDb()

        // Step 1: Get all comments
        console.log('📊 Step 1: Fetching all comments...')
        const commentsSnapshot = await adminDb.collection('ranking_comments').get()
        console.log(`   Found ${commentsSnapshot.size} total comments\n`)

        let orphanedCount = 0
        let checkedCount = 0
        const orphanedComments: string[] = []

        // Step 2: Check each comment's ranking exists
        console.log('📊 Step 2: Checking for orphaned comments...')
        for (const commentDoc of commentsSnapshot.docs) {
            checkedCount++
            const comment = commentDoc.data()
            const rankingId = comment.rankingId

            if (!rankingId) {
                console.log(`   ⚠️  Comment ${commentDoc.id} has no rankingId`)
                orphanedComments.push(commentDoc.id)
                orphanedCount++
                continue
            }

            // Check if ranking exists
            const rankingDoc = await adminDb.collection('rankings').doc(rankingId).get()

            if (!rankingDoc.exists) {
                console.log(
                    `   ❌ Comment ${commentDoc.id} references non-existent ranking ${rankingId}`
                )
                orphanedComments.push(commentDoc.id)
                orphanedCount++
            }

            // Progress indicator every 10 comments
            if (checkedCount % 10 === 0) {
                console.log(`   Progress: ${checkedCount}/${commentsSnapshot.size} checked...`)
            }
        }

        console.log(`\n   ✅ Checked ${checkedCount} comments`)
        console.log(`   ⚠️  Found ${orphanedCount} orphaned comments\n`)

        if (orphanedCount === 0) {
            console.log('✅ No orphaned comments found! Database is clean.')
            return NextResponse.json({
                success: true,
                message: 'No orphaned comments found',
                stats: {
                    totalChecked: checkedCount,
                    orphanedFound: 0,
                    commentsDeleted: 0,
                    likesDeleted: 0,
                },
            })
        }

        // Step 3: Delete orphaned comments and their likes
        console.log('🗑️  Step 3: Deleting orphaned comments and their likes...\n')

        let batch = adminDb.batch()
        let operations = 0
        let deletedComments = 0
        let deletedLikes = 0

        for (const commentId of orphanedComments) {
            // Delete comment likes first
            const likesSnapshot = await adminDb
                .collection('comment_likes')
                .where('commentId', '==', commentId)
                .get()

            for (const likeDoc of likesSnapshot.docs) {
                batch.delete(likeDoc.ref)
                operations++
                deletedLikes++

                if (operations >= 450) {
                    console.log(`   💾 Committing batch (${operations} operations)...`)
                    await batch.commit()
                    batch = adminDb.batch()
                    operations = 0
                }
            }

            // Delete comment itself
            const commentRef = adminDb.collection('ranking_comments').doc(commentId)
            batch.delete(commentRef)
            operations++
            deletedComments++

            console.log(
                `   ✅ Deleted comment ${commentId} and ${likesSnapshot.size} associated likes`
            )

            if (operations >= 450) {
                console.log(`   💾 Committing batch (${operations} operations)...`)
                await batch.commit()
                batch = adminDb.batch()
                operations = 0
            }
        }

        // Commit final batch
        if (operations > 0) {
            console.log(`   💾 Committing final batch (${operations} operations)...`)
            await batch.commit()
        }

        const result = {
            success: true,
            message: 'Cleanup complete',
            stats: {
                totalChecked: checkedCount,
                orphanedFound: orphanedCount,
                commentsDeleted: deletedComments,
                likesDeleted: deletedLikes,
            },
        }

        console.log('\n✅ === CLEANUP COMPLETE ===')
        console.log(JSON.stringify(result, null, 2))
        console.log('\n')

        return NextResponse.json(result)
    } catch (error) {
        console.error('\n❌ === ERROR! ===')
        console.error(error)
        console.error('\n')

        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : 'Cleanup failed',
                details: error instanceof Error ? error.stack : undefined,
            },
            { status: 500 }
        )
    }
}

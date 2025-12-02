/**
 * Cleanup Orphaned Comments Script
 *
 * Removes comments that reference rankings that no longer exist.
 * Run with: npx ts-node scripts/cleanup-orphaned-comments.ts
 */

import { getAdminDb } from '../lib/firebase-admin'

const adminDb = getAdminDb()

async function cleanupOrphanedComments() {
    console.log('🧹 Starting orphaned comments cleanup...\n')

    try {
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
            return
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

        console.log('\n✅ === CLEANUP COMPLETE ===')
        console.log(`   Deleted ${deletedComments} orphaned comments`)
        console.log(`   Deleted ${deletedLikes} associated comment likes\n`)
    } catch (error) {
        console.error('\n❌ Error during cleanup:', error)
        throw error
    }
}

// Run the cleanup
cleanupOrphanedComments()
    .then(() => {
        console.log('🏁 Cleanup script complete')
        process.exit(0)
    })
    .catch((error) => {
        console.error('💥 Cleanup script failed:', error)
        process.exit(1)
    })

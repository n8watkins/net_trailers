/**
 * Test Script: Ranking Deletion
 *
 * This script tests the ranking deletion API to diagnose permission issues.
 * Run with: npx ts-node scripts/test-ranking-delete.ts
 */

import { getAdminDb } from '../lib/firebase-admin'

const adminDb = getAdminDb()

async function testRankingDeletion() {
    console.log('🧪 Testing Ranking Deletion...\n')

    try {
        // Step 1: Find a test ranking to delete
        console.log('📊 Step 1: Finding test rankings...')
        const rankingsSnapshot = await adminDb.collection('rankings').limit(1).get()

        if (rankingsSnapshot.empty) {
            console.log('❌ No rankings found. Please seed data first.')
            return
        }

        const rankingDoc = rankingsSnapshot.docs[0]
        const ranking = rankingDoc.data()
        const rankingId = rankingDoc.id

        console.log(`✅ Found ranking: ${ranking.title}`)
        console.log(`   ID: ${rankingId}`)
        console.log(`   User: ${ranking.userId}`)
        console.log(`   Comments: ${ranking.comments || 0}`)
        console.log(`   Likes: ${ranking.likes || 0}\n`)

        // Step 2: Check for associated data
        console.log('📊 Step 2: Checking associated data...')

        const commentsSnapshot = await adminDb
            .collection('ranking_comments')
            .where('rankingId', '==', rankingId)
            .get()
        console.log(`   Comments found: ${commentsSnapshot.size}`)

        const rankingLikesSnapshot = await adminDb
            .collection('ranking_likes')
            .where('rankingId', '==', rankingId)
            .get()
        console.log(`   Ranking likes found: ${rankingLikesSnapshot.size}`)

        let commentLikesCount = 0
        for (const commentDoc of commentsSnapshot.docs) {
            const likesSnapshot = await adminDb
                .collection('comment_likes')
                .where('commentId', '==', commentDoc.id)
                .get()
            commentLikesCount += likesSnapshot.size
        }
        console.log(`   Comment likes found: ${commentLikesCount}\n`)

        // Step 3: Perform deletion
        console.log('🗑️ Step 3: Performing deletion...')
        console.log('   Using Firebase Admin SDK (bypasses security rules)\n')

        let batch = adminDb.batch()
        let operations = 0

        // Delete ranking likes
        console.log('   → Deleting ranking likes...')
        for (const doc of rankingLikesSnapshot.docs) {
            batch.delete(doc.ref)
            operations++
            console.log(`     - Deleted ranking_like: ${doc.id}`)
        }

        // Delete comment likes
        console.log('   → Deleting comment likes...')
        for (const commentDoc of commentsSnapshot.docs) {
            const likesSnapshot = await adminDb
                .collection('comment_likes')
                .where('commentId', '==', commentDoc.id)
                .get()

            for (const likeDoc of likesSnapshot.docs) {
                batch.delete(likeDoc.ref)
                operations++
                console.log(`     - Deleted comment_like: ${likeDoc.id}`)
            }
        }

        // Commit likes batch
        if (operations > 0) {
            console.log(`   💾 Committing batch (${operations} operations)...`)
            await batch.commit()
            console.log(`   ✅ Batch committed successfully\n`)
            batch = adminDb.batch()
            operations = 0
        }

        // Delete comments
        console.log('   → Deleting comments...')
        for (const doc of commentsSnapshot.docs) {
            batch.delete(doc.ref)
            operations++
            console.log(`     - Deleted comment: ${doc.id}`)
        }

        // Delete ranking
        console.log('   → Deleting ranking...')
        batch.delete(rankingDoc.ref)
        operations++
        console.log(`     - Deleted ranking: ${rankingId}`)

        // Final commit
        if (operations > 0) {
            console.log(`   💾 Committing final batch (${operations} operations)...`)
            await batch.commit()
            console.log(`   ✅ Final batch committed successfully\n`)
        }

        console.log('✅ SUCCESS! Ranking deleted without errors.')
        console.log('\nDeleted:')
        console.log(`  - ${rankingLikesSnapshot.size} ranking likes`)
        console.log(`  - ${commentLikesCount} comment likes`)
        console.log(`  - ${commentsSnapshot.size} comments`)
        console.log(`  - 1 ranking`)
    } catch (error) {
        console.error('\n❌ ERROR during deletion:')
        console.error(error)

        if (error instanceof Error) {
            console.error('\nError details:')
            console.error('  Message:', error.message)
            console.error('  Stack:', error.stack)
        }
    }
}

// Run the test
testRankingDeletion()
    .then(() => {
        console.log('\n🏁 Test complete')
        process.exit(0)
    })
    .catch((error) => {
        console.error('\n💥 Test failed:', error)
        process.exit(1)
    })

/**
 * Test API: Delete First Seeded Ranking
 *
 * This endpoint finds and deletes the first seeded ranking to test
 * the deletion functionality. Only works in development mode.
 *
 * Usage: GET /api/test/delete-ranking
 */

import { NextResponse } from 'next/server'
import { getAdminDb } from '@/lib/firebase-admin'

export async function GET() {
    // Only allow in development
    if (process.env.NODE_ENV !== 'development') {
        return NextResponse.json({ error: 'Only available in development' }, { status: 403 })
    }

    console.log('\n🧪 === TESTING RANKING DELETION ===\n')

    try {
        const adminDb = getAdminDb()

        // Find first ranking
        console.log('📊 Step 1: Finding test ranking...')
        const rankingsSnapshot = await adminDb.collection('rankings').limit(1).get()

        if (rankingsSnapshot.empty) {
            return NextResponse.json({ error: 'No rankings found. Please seed data first.' })
        }

        const rankingDoc = rankingsSnapshot.docs[0]
        const ranking = rankingDoc.data()
        const rankingId = rankingDoc.id

        console.log(`✅ Found ranking: ${ranking.title}`)
        console.log(`   ID: ${rankingId}`)
        console.log(`   User: ${ranking.userId}\n`)

        // Check associated data
        console.log('📊 Step 2: Checking associated data...')
        const commentsSnapshot = await adminDb
            .collection('ranking_comments')
            .where('rankingId', '==', rankingId)
            .get()
        console.log(`   Comments: ${commentsSnapshot.size}`)

        const rankingLikesSnapshot = await adminDb
            .collection('ranking_likes')
            .where('rankingId', '==', rankingId)
            .get()
        console.log(`   Ranking likes: ${rankingLikesSnapshot.size}`)

        let commentLikesCount = 0
        for (const commentDoc of commentsSnapshot.docs) {
            const likesSnapshot = await adminDb
                .collection('comment_likes')
                .where('commentId', '==', commentDoc.id)
                .get()
            commentLikesCount += likesSnapshot.size
        }
        console.log(`   Comment likes: ${commentLikesCount}\n`)

        // Perform deletion with detailed logging
        console.log('🗑️ Step 3: Starting deletion process...\n')

        let batch = adminDb.batch()
        let operations = 0

        // Delete ranking likes
        console.log('  → Deleting ranking likes...')
        for (const doc of rankingLikesSnapshot.docs) {
            batch.delete(doc.ref)
            operations++
            console.log(`    - ${doc.id}`)
        }
        console.log(`  ✅ Queued ${rankingLikesSnapshot.size} ranking likes\n`)

        // Delete comment likes
        console.log('  → Deleting comment likes...')
        for (const commentDoc of commentsSnapshot.docs) {
            const likesSnapshot = await adminDb
                .collection('comment_likes')
                .where('commentId', '==', commentDoc.id)
                .get()

            for (const likeDoc of likesSnapshot.docs) {
                batch.delete(likeDoc.ref)
                operations++
                console.log(`    - ${likeDoc.id}`)
            }
        }
        console.log(`  ✅ Queued ${commentLikesCount} comment likes\n`)

        // Commit likes batch
        if (operations > 0) {
            console.log(`  💾 Committing batch (${operations} operations)...`)
            await batch.commit()
            console.log(`  ✅ Batch committed successfully\n`)
            batch = adminDb.batch()
            operations = 0
        }

        // Delete comments
        console.log('  → Deleting comments...')
        for (const doc of commentsSnapshot.docs) {
            batch.delete(doc.ref)
            operations++
            console.log(`    - ${doc.id}`)
        }
        console.log(`  ✅ Queued ${commentsSnapshot.size} comments\n`)

        // Delete ranking
        console.log('  → Deleting ranking...')
        batch.delete(rankingDoc.ref)
        operations++
        console.log(`    - ${rankingId}\n`)

        // Final commit
        console.log(`  💾 Final commit (${operations} operations)...`)
        await batch.commit()
        console.log(`  ✅ Final batch committed successfully\n`)

        const result = {
            success: true,
            message: 'Ranking deleted successfully!',
            ranking: {
                id: rankingId,
                title: ranking.title,
                userId: ranking.userId,
            },
            deleted: {
                rankingLikes: rankingLikesSnapshot.size,
                commentLikes: commentLikesCount,
                comments: commentsSnapshot.size,
                ranking: 1,
            },
        }

        console.log('✅ === SUCCESS! ===\n')
        console.log(JSON.stringify(result, null, 2))
        console.log('\n')

        return NextResponse.json(result)
    } catch (error) {
        console.error('\n❌ === ERROR! ===\n')
        console.error(error)
        console.error('\n')

        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : 'Unknown error',
                stack: error instanceof Error ? error.stack : undefined,
            },
            { status: 500 }
        )
    }
}

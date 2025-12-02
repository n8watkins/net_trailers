/**
 * Admin API: Redistribute Comments
 *
 * Spreads comments across different rankings instead of clustering on one.
 * GET /api/admin/redistribute-comments
 */

import { NextResponse } from 'next/server'
import { getAdminDb } from '../../../../lib/firebase-admin'

export async function GET() {
    // Only allow in development
    if (process.env.NODE_ENV !== 'development') {
        return NextResponse.json({ error: 'Only available in development' }, { status: 403 })
    }

    console.log('\n🔄 === REDISTRIBUTING COMMENTS ===\n')

    try {
        const adminDb = getAdminDb()

        // Get all rankings
        const rankingsSnapshot = await adminDb.collection('rankings').get()
        console.log(`📊 Found ${rankingsSnapshot.size} rankings\n`)

        // Get rankings with 0 comments
        const rankingsWithNoComments = rankingsSnapshot.docs
            .filter((doc) => {
                const data = doc.data()
                return (data.comments || 0) === 0
            })
            .map((doc) => ({
                id: doc.id,
                ref: doc.ref,
                title: doc.data().title,
            }))

        console.log(`   Found ${rankingsWithNoComments.length} rankings with 0 comments\n`)

        if (rankingsWithNoComments.length === 0) {
            return NextResponse.json({
                success: true,
                message: 'No rankings need comments',
                stats: { rankingsWithNoComments: 0, commentsRedistributed: 0 },
            })
        }

        // Get all comments
        const commentsSnapshot = await adminDb.collection('ranking_comments').get()
        console.log(`📊 Found ${commentsSnapshot.size} total comments\n`)

        // Group comments by ranking
        const commentsByRanking = new Map<string, any[]>()
        for (const commentDoc of commentsSnapshot.docs) {
            const comment = commentDoc.data()
            const rankingId = comment.rankingId

            if (!commentsByRanking.has(rankingId)) {
                commentsByRanking.set(rankingId, [])
            }
            commentsByRanking.get(rankingId)!.push({
                id: commentDoc.id,
                ref: commentDoc.ref,
                data: comment,
            })
        }

        // Find rankings with multiple comments
        const rankingsWithMultipleComments = Array.from(commentsByRanking.entries())
            .filter(([_, comments]) => comments.length > 1)
            .sort((a, b) => b[1].length - a[1].length) // Sort by most comments first

        if (rankingsWithMultipleComments.length === 0) {
            return NextResponse.json({
                success: true,
                message: 'No rankings have multiple comments to redistribute',
                stats: {
                    rankingsWithNoComments: rankingsWithNoComments.length,
                    commentsRedistributed: 0,
                },
            })
        }

        console.log('🔄 Redistributing comments...\n')

        let batch = adminDb.batch()
        let operations = 0
        let redistributedCount = 0
        let targetRankingIndex = 0

        // For each ranking with multiple comments, move extras to rankings with 0 comments
        for (const [sourceRankingId, comments] of rankingsWithMultipleComments) {
            // Keep the first comment on the original ranking, redistribute the rest
            const commentsToMove = comments.slice(1)

            for (const comment of commentsToMove) {
                if (targetRankingIndex >= rankingsWithNoComments.length) {
                    console.log('   ⚠️  No more rankings available for redistribution')
                    break
                }

                const targetRanking = rankingsWithNoComments[targetRankingIndex]
                targetRankingIndex++

                console.log(`   📝 Moving comment "${comment.data.text.substring(0, 50)}..."`)
                console.log(`      From: ${sourceRankingId}`)
                console.log(`      To: ${targetRanking.id} (${targetRanking.title})`)

                // Update comment's rankingId
                batch.update(comment.ref, {
                    rankingId: targetRanking.id,
                })

                // Decrement source ranking comment count
                const sourceRankingRef = adminDb.collection('rankings').doc(sourceRankingId)
                batch.update(sourceRankingRef, {
                    comments: Math.max(0, comments.length - (commentsToMove.indexOf(comment) + 1)),
                })

                // Increment target ranking comment count
                batch.update(targetRanking.ref, {
                    comments: 1,
                })

                operations += 3
                redistributedCount++

                if (operations >= 450) {
                    console.log(`   💾 Committing batch (${operations} operations)...`)
                    await batch.commit()
                    batch = adminDb.batch()
                    operations = 0
                }
            }
        }

        // Commit final batch
        if (operations > 0) {
            console.log(`   💾 Committing final batch (${operations} operations)...`)
            await batch.commit()
        }

        const result = {
            success: true,
            message: 'Comments redistributed',
            stats: {
                rankingsWithNoComments: rankingsWithNoComments.length,
                commentsRedistributed: redistributedCount,
            },
        }

        console.log('\n✅ === REDISTRIBUTION COMPLETE ===')
        console.log(JSON.stringify(result, null, 2))
        console.log('\n')

        return NextResponse.json(result)
    } catch (error) {
        console.error('\n❌ === ERROR! ===')
        console.error(error)
        console.error('\n')

        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : 'Redistribution failed',
                details: error instanceof Error ? error.stack : undefined,
            },
            { status: 500 }
        )
    }
}

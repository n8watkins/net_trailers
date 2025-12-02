/**
 * Admin API: Verify Comment-Ranking Relationships
 *
 * Checks if comments in user's comment list actually show up on the ranking page.
 * GET /api/admin/verify-comment-relationships?userId=XXX
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb } from '../../../../lib/firebase-admin'

export async function GET(request: NextRequest) {
    // Only allow in development
    if (process.env.NODE_ENV !== 'development') {
        return NextResponse.json({ error: 'Only available in development' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
        return NextResponse.json({ error: 'userId parameter required' }, { status: 400 })
    }

    console.log('\n🔍 === VERIFYING COMMENT-RANKING RELATIONSHIPS ===\n')
    console.log(`User ID: ${userId}\n`)

    try {
        const adminDb = getAdminDb()

        // Step 1: Get all user's comments
        console.log('📊 Step 1: Fetching user comments...')
        const userCommentsSnapshot = await adminDb
            .collection('ranking_comments')
            .where('userId', '==', userId)
            .get()

        console.log(`   Found ${userCommentsSnapshot.size} comments by user\n`)

        const issues: any[] = []
        let checkedCount = 0

        // Step 2: For each comment, verify the ranking exists and comment appears in ranking query
        console.log('📊 Step 2: Verifying each comment...\n')

        for (const commentDoc of userCommentsSnapshot.docs) {
            checkedCount++
            const comment = commentDoc.data()
            const commentId = commentDoc.id
            const rankingId = comment.rankingId
            const parentCommentId = comment.parentCommentId

            console.log(`   Checking comment ${commentId}:`)
            console.log(`     - Ranking ID: ${rankingId}`)
            console.log(`     - Parent Comment ID: ${parentCommentId || 'null (top-level)'}`)
            console.log(`     - Text: "${comment.text.substring(0, 50)}..."`)

            // Check if ranking exists
            const rankingDoc = await adminDb.collection('rankings').doc(rankingId).get()

            if (!rankingDoc.exists) {
                console.log(`     ❌ Ranking ${rankingId} does not exist!`)
                issues.push({
                    commentId,
                    issue: 'ranking_not_found',
                    rankingId,
                    text: comment.text,
                })
                continue
            }

            // Query comments for this ranking (same way the app does it)
            const rankingCommentsQuery = await adminDb
                .collection('ranking_comments')
                .where('rankingId', '==', rankingId)
                .where('parentCommentId', '==', parentCommentId)
                .get()

            // Check if this comment is in the results
            const commentFoundInQuery = rankingCommentsQuery.docs.some(
                (doc) => doc.id === commentId
            )

            if (!commentFoundInQuery) {
                console.log(`     ❌ Comment NOT found in ranking query results!`)
                console.log(`     Query returned ${rankingCommentsQuery.size} comments`)
                console.log(`     Comment data:`)
                console.log(`       - rankingId: ${comment.rankingId}`)
                console.log(`       - parentCommentId: ${comment.parentCommentId}`)
                console.log(
                    `       - parentCommentId type: ${typeof comment.parentCommentId} (${comment.parentCommentId === null ? 'is null' : comment.parentCommentId === undefined ? 'is undefined' : 'has value'})`
                )

                issues.push({
                    commentId,
                    issue: 'comment_not_in_ranking_query',
                    rankingId,
                    text: comment.text,
                    parentCommentId: comment.parentCommentId,
                    parentCommentIdType: typeof comment.parentCommentId,
                    querySize: rankingCommentsQuery.size,
                })
            } else {
                console.log(`     ✅ Comment found in ranking query`)
            }

            console.log('')
        }

        console.log(`\n   ✅ Checked ${checkedCount} comments`)
        console.log(`   ⚠️  Found ${issues.length} issues\n`)

        const result = {
            success: true,
            stats: {
                totalComments: checkedCount,
                issuesFound: issues.length,
            },
            issues,
        }

        console.log('✅ === VERIFICATION COMPLETE ===')
        console.log(JSON.stringify(result, null, 2))
        console.log('\n')

        return NextResponse.json(result)
    } catch (error) {
        console.error('\n❌ === ERROR! ===')
        console.error(error)
        console.error('\n')

        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : 'Verification failed',
                details: error instanceof Error ? error.stack : undefined,
            },
            { status: 500 }
        )
    }
}

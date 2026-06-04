/**
 * Admin API: Verify ALL Comment-Ranking Relationships
 *
 * Checks all comments to find data inconsistencies.
 * GET /api/admin/verify-all-comments
 */

import { NextResponse } from 'next/server'
import { getAdminDb } from '../../../../lib/firebase-admin'

export async function GET() {
    // Only allow in development
    if (process.env.NODE_ENV !== 'development') {
        return NextResponse.json({ error: 'Only available in development' }, { status: 403 })
    }

    console.log('\n🔍 === VERIFYING ALL COMMENT-RANKING RELATIONSHIPS ===\n')

    try {
        const adminDb = getAdminDb()

        // Get all comments
        console.log('📊 Fetching all comments...')
        const allCommentsSnapshot = await adminDb.collection('ranking_comments').get()
        console.log(`   Found ${allCommentsSnapshot.size} total comments\n`)

        const issues: any[] = []
        let checkedCount = 0
        let parentCommentIdIssues = 0

        console.log('📊 Checking for data inconsistencies...\n')

        for (const commentDoc of allCommentsSnapshot.docs) {
            checkedCount++
            const comment = commentDoc.data()
            const commentId = commentDoc.id
            const rankingId = comment.rankingId
            const parentCommentId = comment.parentCommentId

            // Check for undefined vs null parentCommentId issue
            if (parentCommentId === undefined) {
                console.log(`   ⚠️  Comment ${commentId} has undefined parentCommentId`)
                console.log(`      Should be null for top-level comments`)
                console.log(`      Text: "${comment.text.substring(0, 50)}..."`)
                console.log(`      Ranking: ${rankingId}\n`)

                parentCommentIdIssues++
                issues.push({
                    commentId,
                    issue: 'parentCommentId_undefined',
                    shouldBe: 'null',
                    currentValue: 'undefined',
                    rankingId,
                    text: comment.text.substring(0, 100),
                })
            }

            // Progress every 10 comments
            if (checkedCount % 10 === 0) {
                console.log(`   Progress: ${checkedCount}/${allCommentsSnapshot.size}...`)
            }
        }

        console.log(`\n   ✅ Checked ${checkedCount} comments`)
        console.log(`   ⚠️  Found ${issues.length} total issues`)
        console.log(`      - ${parentCommentIdIssues} have undefined parentCommentId\n`)

        const result = {
            success: true,
            stats: {
                totalComments: checkedCount,
                issuesFound: issues.length,
                parentCommentIdUndefined: parentCommentIdIssues,
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

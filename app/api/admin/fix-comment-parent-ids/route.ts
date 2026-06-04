/**
 * Admin API: Fix Comment ParentCommentId Values
 *
 * Changes undefined parentCommentId to null so queries work correctly.
 * GET /api/admin/fix-comment-parent-ids
 */

import { NextResponse } from 'next/server'
import { getAdminDb } from '../../../../lib/firebase-admin'

export async function GET() {
    // Only allow in development
    if (process.env.NODE_ENV !== 'development') {
        return NextResponse.json({ error: 'Only available in development' }, { status: 403 })
    }

    console.log('\n🔧 === FIXING COMMENT PARENT IDS ===\n')

    try {
        const adminDb = getAdminDb()

        // Get all comments
        console.log('📊 Fetching all comments...')
        const allCommentsSnapshot = await adminDb.collection('ranking_comments').get()
        console.log(`   Found ${allCommentsSnapshot.size} total comments\n`)

        let fixedCount = 0
        let batch = adminDb.batch()
        let operations = 0

        console.log('🔧 Fixing parentCommentId values...\n')

        for (const commentDoc of allCommentsSnapshot.docs) {
            const comment = commentDoc.data()
            const parentCommentId = comment.parentCommentId

            // If parentCommentId is undefined, set it to null
            if (parentCommentId === undefined) {
                console.log(`   Fixing comment ${commentDoc.id}:`)
                console.log(`      Text: "${comment.text.substring(0, 50)}..."`)
                console.log(`      Changing parentCommentId: undefined → null`)

                batch.update(commentDoc.ref, {
                    parentCommentId: null,
                })

                operations++
                fixedCount++

                // Commit batch every 450 operations
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
            message: 'Fixed parentCommentId values',
            stats: {
                totalComments: allCommentsSnapshot.size,
                fixed: fixedCount,
            },
        }

        console.log('\n✅ === FIX COMPLETE ===')
        console.log(JSON.stringify(result, null, 2))
        console.log('\n')

        return NextResponse.json(result)
    } catch (error) {
        console.error('\n❌ === ERROR! ===')
        console.error(error)
        console.error('\n')

        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : 'Fix failed',
                details: error instanceof Error ? error.stack : undefined,
            },
            { status: 500 }
        )
    }
}

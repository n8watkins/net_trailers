/**
 * Admin API: Sync Comment Usernames
 *
 * Updates all comment usernames to match current user profile display names.
 * GET /api/admin/sync-comment-usernames
 */

import { NextResponse } from 'next/server'
import { getAdminDb } from '../../../../lib/firebase-admin'

export async function GET() {
    // Only allow in development
    if (process.env.NODE_ENV !== 'development') {
        return NextResponse.json({ error: 'Only available in development' }, { status: 403 })
    }

    console.log('\n🔄 === SYNCING COMMENT USERNAMES ===\n')

    try {
        const adminDb = getAdminDb()

        // Get all comments
        console.log('📊 Fetching all comments...')
        const commentsSnapshot = await adminDb.collection('ranking_comments').get()
        console.log(`   Found ${commentsSnapshot.size} comments\n`)

        // Group comments by userId
        const commentsByUser = new Map<string, any[]>()
        for (const commentDoc of commentsSnapshot.docs) {
            const comment = commentDoc.data()
            const userId = comment.userId

            if (!commentsByUser.has(userId)) {
                commentsByUser.set(userId, [])
            }
            commentsByUser.get(userId)!.push({
                id: commentDoc.id,
                ref: commentDoc.ref,
                currentUsername: comment.userName,
            })
        }

        console.log(`   Found ${commentsByUser.size} unique users\n`)

        let totalUpdated = 0
        let batch = adminDb.batch()
        let operations = 0

        console.log('🔄 Syncing usernames...\n')

        for (const [userId, comments] of commentsByUser) {
            // Get current user profile
            const userDoc = await adminDb.collection('users').doc(userId).get()

            if (!userDoc.exists) {
                console.log(`   ⚠️  User ${userId} not found, skipping ${comments.length} comments`)
                continue
            }

            const userData = userDoc.data()
            const currentDisplayName =
                userData?.profile?.displayName || userData?.displayName || 'Unknown User'

            // Check if any comments need updating
            const needsUpdate = comments.some((c) => c.currentUsername !== currentDisplayName)

            if (!needsUpdate) {
                console.log(
                    `   ✅ User ${userId} (${currentDisplayName}): ${comments.length} comments already up-to-date`
                )
                continue
            }

            console.log(
                `   🔄 User ${userId}: Updating ${comments.length} comments to "${currentDisplayName}"`
            )

            for (const comment of comments) {
                if (comment.currentUsername !== currentDisplayName) {
                    batch.update(comment.ref, {
                        userName: currentDisplayName,
                    })
                    operations++
                    totalUpdated++

                    console.log(
                        `      - Comment ${comment.id}: "${comment.currentUsername}" → "${currentDisplayName}"`
                    )

                    // Commit batch every 450 operations
                    if (operations >= 450) {
                        console.log(`   💾 Committing batch (${operations} operations)...`)
                        await batch.commit()
                        batch = adminDb.batch()
                        operations = 0
                    }
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
            message: 'Comment usernames synced',
            stats: {
                totalComments: commentsSnapshot.size,
                uniqueUsers: commentsByUser.size,
                commentsUpdated: totalUpdated,
            },
        }

        console.log('\n✅ === SYNC COMPLETE ===')
        console.log(JSON.stringify(result, null, 2))
        console.log('\n')

        return NextResponse.json(result)
    } catch (error) {
        console.error('\n❌ === ERROR! ===')
        console.error(error)
        console.error('\n')

        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : 'Sync failed',
                details: error instanceof Error ? error.stack : undefined,
            },
            { status: 500 }
        )
    }
}

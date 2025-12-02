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

        // Get all comments for this ranking
        const commentsSnapshot = await adminDb
            .collection('ranking_comments')
            .where('rankingId', '==', rankingId)
            .get()

        const commentIds = commentsSnapshot.docs.map((doc) => doc.id)
        console.log(`  📊 Found ${commentIds.length} comments to delete`)

        // Create batches (Firestore batch limit is 500)
        let batch = adminDb.batch()
        let operations = 0

        // Delete ranking likes
        console.log('  🗑️ Deleting ranking likes...')
        const rankingLikesSnapshot = await adminDb
            .collection('ranking_likes')
            .where('rankingId', '==', rankingId)
            .get()

        for (const doc of rankingLikesSnapshot.docs) {
            batch.delete(doc.ref)
            operations++

            if (operations >= 450) {
                await batch.commit()
                batch = adminDb.batch()
                operations = 0
            }
        }
        console.log(`    ✅ Deleted ${rankingLikesSnapshot.size} ranking likes`)

        // Delete comment likes
        console.log('  🗑️ Deleting comment likes...')
        let commentLikesDeleted = 0
        for (const commentId of commentIds) {
            const commentLikesSnapshot = await adminDb
                .collection('comment_likes')
                .where('commentId', '==', commentId)
                .get()

            for (const doc of commentLikesSnapshot.docs) {
                batch.delete(doc.ref)
                operations++
                commentLikesDeleted++

                if (operations >= 450) {
                    await batch.commit()
                    batch = adminDb.batch()
                    operations = 0
                }
            }
        }
        console.log(`    ✅ Deleted ${commentLikesDeleted} comment likes`)

        // Commit any pending operations
        if (operations > 0) {
            await batch.commit()
            batch = adminDb.batch()
            operations = 0
        }

        // Delete comments
        console.log('  🗑️ Deleting comments...')
        for (const doc of commentsSnapshot.docs) {
            batch.delete(doc.ref)
            operations++

            if (operations >= 450) {
                await batch.commit()
                batch = adminDb.batch()
                operations = 0
            }
        }
        console.log(`    ✅ Deleted ${commentsSnapshot.size} comments`)

        // Delete the ranking itself
        console.log('  🗑️ Deleting ranking...')
        batch.delete(rankingRef)
        operations++

        // Final commit
        await batch.commit()

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

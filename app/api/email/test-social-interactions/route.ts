import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb, getAdminAuth } from '@/lib/firebase-admin'
import { nanoid } from 'nanoid'

/**
 * Test Social Interactions Endpoint
 *
 * This endpoint simulates the full social interaction flow:
 * 1. Finds one of the user's rankings
 * 2. Creates fake comments and likes from fake users
 * 3. Those trigger notification creation (normal flow)
 * 4. Then runs the social digest cron to send the batched email
 *
 * This tests the ENTIRE flow from user action → notification → email
 */
export async function POST(req: NextRequest) {
    console.log('🧪 [Test Social] === STARTING TEST SOCIAL INTERACTIONS ===')

    try {
        // Auth check - allow any authenticated user (not just admins)
        console.log('🧪 [Test Social] Step 1: Checking authentication...')
        const authHeader = req.headers.get('authorization')
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            console.error('🧪 ❌ [Test Social] No auth token provided')
            return NextResponse.json({ error: 'Unauthorized - No auth token' }, { status: 401 })
        }

        const idToken = authHeader.substring(7)
        console.log('🧪 [Test Social] Auth token found, verifying...')

        // Verify Firebase ID token
        const auth = getAdminAuth()
        let decodedToken
        try {
            decodedToken = await auth.verifyIdToken(idToken)
            console.log('🧪 ✅ [Test Social] Token verified successfully')
        } catch (error) {
            console.error('🧪 ❌ [Test Social] Token verification failed:', error)
            return NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 })
        }

        const userId = decodedToken.uid

        console.log('🧪 [Test Social] ✅ Authenticated as user:', userId)

        const db = getAdminDb()

        // Step 1: Find one of the user's rankings
        console.log('🧪 [Test Social] Step 2: Finding user rankings...')
        const rankingsSnapshot = await db
            .collection('rankings')
            .where('userId', '==', userId)
            .limit(1)
            .get()

        console.log(`🧪 [Test Social] Found ${rankingsSnapshot.size} ranking(s)`)

        if (rankingsSnapshot.empty) {
            console.error('🧪 ❌ [Test Social] No rankings found for user')
            return NextResponse.json(
                {
                    error: 'No rankings found',
                    message: 'You need to create at least one ranking to test social interactions',
                },
                { status: 400 }
            )
        }

        const rankingDoc = rankingsSnapshot.docs[0]
        const ranking = rankingDoc.data()
        const rankingId = rankingDoc.id

        console.log(`🧪 [Test Social] ✅ Found ranking: "${ranking.title}" (${rankingId})`)

        const now = Date.now()
        const createdItems: { type: string; id: string }[] = []

        console.log('🧪 [Test Social] Step 3: Creating fake comments and likes...')

        // Fake users
        const fakeUsers = [
            { name: 'Sarah Johnson', avatar: null },
            { name: 'Mike Chen', avatar: null },
            { name: 'Alex Rivera', avatar: null },
            { name: 'Emma Davis', avatar: null },
            { name: 'Jordan Lee', avatar: null },
        ]

        // Create 2 comments
        console.log('🧪 [Test Social] Creating 2 fake comments...')
        for (let i = 0; i < 2; i++) {
            const fakeUser = fakeUsers[i]
            const commentId = nanoid(12)

            console.log(`🧪 [Test Social]   - Creating comment ${i + 1} from ${fakeUser.name}...`)

            // Create comment document
            await db
                .collection('ranking_comments')
                .doc(commentId)
                .set({
                    id: commentId,
                    rankingId: rankingId,
                    userId: `test_user_${i}`, // Fake user ID
                    userName: fakeUser.name,
                    userAvatar: fakeUser.avatar,
                    type: 'general',
                    positionNumber: null,
                    text: `Great ranking! I ${i === 0 ? 'loved your choices' : "would've put some of these higher"} 🎬`,
                    createdAt: now - i * 60000, // Stagger by 1 minute
                    likes: 0,
                    parentCommentId: null,
                })

            // Increment ranking comment count
            await db
                .collection('rankings')
                .doc(rankingId)
                .update({
                    comments: (ranking.comments || 0) + (i + 1),
                })

            // Create notification for user (this is what the normal flow does)
            await db
                .collection('users')
                .doc(userId)
                .collection('notifications')
                .doc()
                .set({
                    type: 'ranking_comment',
                    rankingId: rankingId,
                    rankingTitle: ranking.title,
                    commenterName: fakeUser.name,
                    commentText: `Great ranking! I ${i === 0 ? 'loved your choices' : "would've put some of these higher"} 🎬`,
                    commentId: commentId,
                    isReply: false,
                    parentCommentText: null,
                    emailSent: false,
                    createdAt: now - i * 60000,
                    isRead: false,
                })

            createdItems.push({ type: 'comment', id: commentId })
            console.log(`🧪 [Test Social]   ✅ Comment ${i + 1} created with notification`)
        }

        // Create 3 likes
        console.log('🧪 [Test Social] Creating 3 fake likes...')
        const likeUsers = fakeUsers.slice(2, 5) // Use the last 3 fake users
        for (let i = 0; i < 3; i++) {
            const fakeUser = likeUsers[i]
            const likeId = `test_user_${i + 2}_${rankingId}`

            // Create like document
            await db
                .collection('ranking_likes')
                .doc(likeId)
                .set({
                    id: likeId,
                    rankingId: rankingId,
                    userId: `test_user_${i + 2}`, // Fake user ID
                    userName: fakeUser.name,
                    likedAt: now - i * 30000, // Stagger by 30 seconds
                })

            // Increment ranking likes count
            await db
                .collection('rankings')
                .doc(rankingId)
                .update({
                    likes: (ranking.likes || 0) + (i + 1),
                })

            createdItems.push({ type: 'like', id: likeId })
        }

        // Create a single batched notification for all likes
        await db
            .collection('users')
            .doc(userId)
            .collection('notifications')
            .doc()
            .set({
                type: 'ranking_like',
                rankingId: rankingId,
                rankingTitle: ranking.title,
                likerNames: likeUsers.map((u) => u.name),
                emailSent: false,
                createdAt: now,
                isRead: false,
            })

        console.log(`🧪 [Test Social] ✅ Created 3 likes and batch notification`)

        console.log('🧪 [Test Social] Summary:')
        console.log(`🧪 [Test Social]   - Total comments: 2`)
        console.log(`🧪 [Test Social]   - Total likes: 3`)
        console.log(`🧪 [Test Social]   - Total notifications: 3 (2 comment + 1 like batch)`)

        // Step 4: Temporarily enable email notifications for testing
        console.log('🧪 [Test Social] Step 4: Enabling email notifications for test...')
        const userRef = db.collection('users').doc(userId)
        const userDoc = await userRef.get()
        const currentNotifications = userDoc.data()?.notifications || {}

        // Store original settings
        const originalEmailEnabled = currentNotifications.email
        const originalSocialEnabled = currentNotifications.types?.social_interactions

        // Temporarily enable both
        await userRef.update({
            'notifications.email': true,
            'notifications.types.social_interactions': true,
        })
        console.log(
            `🧪 [Test Social] ✅ Temporarily enabled email notifications (will restore after test)`
        )

        // Step 5: Now run the social digest cron job
        console.log('🧪 [Test Social] Step 5: Triggering social digest cron...')

        const cronUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/cron/social-digest`
        console.log(`🧪 [Test Social] Calling: ${cronUrl}`)

        const cronResponse = await fetch(cronUrl, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${process.env.CRON_SECRET}`,
            },
        })

        console.log(`🧪 [Test Social] Cron response status: ${cronResponse.status}`)

        const cronResult = await cronResponse.json()

        console.log('🧪 [Test Social] ✅ Social digest cron completed')
        console.log('🧪 [Test Social] Cron result:', JSON.stringify(cronResult, null, 2))

        // Step 6: Restore original notification settings
        console.log('🧪 [Test Social] Step 6: Restoring original notification settings...')
        await userRef.update({
            'notifications.email': originalEmailEnabled ?? false,
            'notifications.types.social_interactions': originalSocialEnabled ?? true,
        })
        console.log('🧪 [Test Social] ✅ Original settings restored')

        const response = {
            success: true,
            message: 'Social interactions test completed',
            ranking: {
                id: rankingId,
                title: ranking.title,
            },
            created: {
                comments: createdItems.filter((i) => i.type === 'comment').length,
                likes: createdItems.filter((i) => i.type === 'like').length,
            },
            cronResult,
        }

        console.log('🧪 [Test Social] === TEST COMPLETED SUCCESSFULLY ===')
        console.log('🧪 [Test Social] Final response:', JSON.stringify(response, null, 2))

        return NextResponse.json(response)
    } catch (error) {
        console.error('🧪 ❌ [Test Social] === TEST FAILED ===')
        console.error('🧪 ❌ [Test Social] Error:', error)
        console.error(
            '🧪 ❌ [Test Social] Stack:',
            error instanceof Error ? error.stack : 'No stack trace'
        )

        return NextResponse.json(
            {
                error: 'Failed to run social interactions test',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        )
    }
}

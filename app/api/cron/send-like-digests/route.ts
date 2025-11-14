/**
 * Send Ranking Like Digest Emails
 * POST /api/cron/send-like-digests
 *
 * Runs daily (6 PM) to batch ranking likes from past 24 hours
 * Sends one email per user with all their rankings' new likes
 */

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getAdminDb } from '@/lib/firebase-admin'
import { EmailService } from '@/lib/email/email-service'
import { apiLog, apiError, apiWarn } from '@/utils/debugLogger'

export const runtime = 'nodejs'
export const maxDuration = 300 // 5 minutes

interface LikeData {
    id: string
    rankingId: string
    userId: string // Person who liked
    likedAt: number
}

interface RankingData {
    id: string
    title: string
    userId: string // Ranking owner
    userName: string
}

interface UserLikeSummary {
    userId: string // Ranking owner
    email: string
    username: string
    rankings: Array<{
        rankingId: string
        rankingTitle: string
        likerNames: string[]
        totalLikes: number
    }>
}

export async function POST(request: NextRequest) {
    try {
        // Verify authorization
        const authHeader = request.headers.get('authorization')
        const cronSecret = process.env.CRON_SECRET

        if (!cronSecret) {
            apiError('[LikeDigest] CRON_SECRET is not configured')
            return NextResponse.json(
                { success: false, error: 'Cron secret is not configured' },
                { status: 500 }
            )
        }

        // Constant-time comparison
        const expectedHeader = `Bearer ${cronSecret}`

        if (!authHeader || authHeader.length !== expectedHeader.length) {
            apiWarn('[LikeDigest] Unauthorized attempt - invalid header format')
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        const authBuffer = Buffer.from(authHeader)
        const expectedBuffer = Buffer.from(expectedHeader)

        let isValid = false
        try {
            isValid = crypto.timingSafeEqual(authBuffer, expectedBuffer)
        } catch {
            isValid = false
        }

        if (!isValid) {
            apiWarn('[LikeDigest] Unauthorized attempt - invalid credentials')
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        apiLog('[LikeDigest] Starting like digest job...')

        const db = getAdminDb()

        // Get likes from past 24 hours
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000
        const likesSnapshot = await db
            .collection('ranking_likes')
            .where('likedAt', '>=', oneDayAgo)
            .get()

        if (likesSnapshot.empty) {
            apiLog('[LikeDigest] No new likes in past 24 hours')
            return NextResponse.json({
                success: true,
                stats: {
                    likesProcessed: 0,
                    emailsSent: 0,
                },
            })
        }

        const likes: LikeData[] = likesSnapshot.docs.map((doc) => doc.data() as LikeData)

        apiLog(`[LikeDigest] Found ${likes.length} likes from past 24 hours`)

        // Group likes by ranking
        const likesByRanking = new Map<string, LikeData[]>()
        for (const like of likes) {
            if (!likesByRanking.has(like.rankingId)) {
                likesByRanking.set(like.rankingId, [])
            }
            likesByRanking.get(like.rankingId)!.push(like)
        }

        // Get ranking details
        const rankingIds = Array.from(likesByRanking.keys())
        const rankingDataMap = new Map<string, RankingData>()

        for (const rankingId of rankingIds) {
            try {
                const rankingDoc = await db.collection('rankings').doc(rankingId).get()
                if (rankingDoc.exists) {
                    const data = rankingDoc.data()!
                    rankingDataMap.set(rankingId, {
                        id: rankingId,
                        title: data.title,
                        userId: data.userId,
                        userName: data.userName || 'Unknown',
                    })
                }
            } catch (error) {
                apiError(`[LikeDigest] Error fetching ranking ${rankingId}:`, error)
            }
        }

        // Get user details for likers
        const likerIds = new Set(likes.map((like) => like.userId))
        const likerNamesMap = new Map<string, string>()

        for (const userId of likerIds) {
            try {
                const userDoc = await db.collection('users').doc(userId).get()
                if (userDoc.exists) {
                    const userData = userDoc.data()!
                    likerNamesMap.set(
                        userId,
                        userData.profile?.username || userData.username || 'Anonymous'
                    )
                }
            } catch (error) {
                apiError(`[LikeDigest] Error fetching user ${userId}:`, error)
                likerNamesMap.set(userId, 'Anonymous')
            }
        }

        // Group by ranking owner (user who will receive the email)
        const userSummaries = new Map<string, UserLikeSummary>()

        for (const [rankingId, rankingLikes] of likesByRanking.entries()) {
            const ranking = rankingDataMap.get(rankingId)
            if (!ranking) continue

            const ownerId = ranking.userId

            if (!userSummaries.has(ownerId)) {
                // Get owner details
                const ownerDoc = await db.collection('users').doc(ownerId).get()
                if (!ownerDoc.exists) continue

                const ownerData = ownerDoc.data()!
                const notificationPrefs = ownerData.notificationPreferences

                // Check if user wants email notifications
                if (!notificationPrefs?.email) continue

                const email = ownerData.profile?.email || ownerData.email
                if (!email) continue

                userSummaries.set(ownerId, {
                    userId: ownerId,
                    email,
                    username: ownerData.profile?.username || ownerData.username || 'User',
                    rankings: [],
                })
            }

            const summary = userSummaries.get(ownerId)!

            // Get liker names
            const likerNames = rankingLikes.map(
                (like) => likerNamesMap.get(like.userId) || 'Anonymous'
            )

            // Get total likes for this ranking
            const rankingDoc = await db.collection('rankings').doc(rankingId).get()
            const totalLikes = rankingDoc.exists ? rankingDoc.data()!.likes || 0 : 0

            summary.rankings.push({
                rankingId,
                rankingTitle: ranking.title,
                likerNames,
                totalLikes,
            })
        }

        // Send emails
        let emailsSent = 0
        const errors: string[] = []

        for (const summary of userSummaries.values()) {
            try {
                // Send one email per ranking with likes
                for (const ranking of summary.rankings) {
                    await EmailService.sendRankingLike({
                        to: summary.email,
                        userName: summary.username,
                        rankingTitle: ranking.rankingTitle,
                        rankingId: ranking.rankingId,
                        likerNames: ranking.likerNames,
                        totalLikes: ranking.totalLikes,
                    })

                    emailsSent++
                }

                apiLog(`[LikeDigest] Sent ${summary.rankings.length} emails to ${summary.email}`)
            } catch (error) {
                const errorMsg = `Error sending to ${summary.userId}: ${error instanceof Error ? error.message : 'Unknown'}`
                apiError(errorMsg)
                errors.push(errorMsg)
            }
        }

        apiLog('[LikeDigest] Like digest job complete', {
            likesProcessed: likes.length,
            emailsSent,
            errors: errors.length,
        })

        return NextResponse.json({
            success: true,
            stats: {
                likesProcessed: likes.length,
                usersNotified: userSummaries.size,
                emailsSent,
                errors: errors.length,
            },
            errors: errors.length > 0 ? errors : undefined,
        })
    } catch (error) {
        apiError('[LikeDigest] Fatal error:', error)
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        )
    }
}

/**
 * Manual trigger for testing (GET request)
 */
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams
    const secret = searchParams.get('secret')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret || secret !== cronSecret) {
        return NextResponse.json({ success: false, error: 'Invalid secret' }, { status: 401 })
    }

    // Forward to POST handler
    return POST(request)
}

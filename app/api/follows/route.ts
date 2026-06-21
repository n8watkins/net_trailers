/**
 * /api/follows
 *
 * GET  ?targetUserId=<id>
 *   - Authenticated. Returns { isFollowing, followerCount, followingCount }.
 *
 * POST { targetUserId }
 *   - Authenticated. Follow the target user.
 *
 * DELETE { targetUserId }
 *   - Authenticated. Unfollow the target user.
 *
 * The acting user id is always taken from the Auth.js session.
 */

import { NextRequest, NextResponse } from 'next/server'

import { withAuth } from '@/lib/auth-middleware'
import { followUser, getFollowCounts, isFollowing, unfollowUser } from '@/db/queries/profiles'

/* -------------------------------------------------------------------------- */
/*  GET — check follow status + counts                                         */
/* -------------------------------------------------------------------------- */

export const GET = withAuth(async (request: NextRequest, sessionUserId: string) => {
    const { searchParams } = request.nextUrl
    const targetUserId = searchParams.get('targetUserId')?.trim()

    if (!targetUserId) {
        return NextResponse.json(
            { success: false, error: 'targetUserId query parameter is required' },
            { status: 400 }
        )
    }

    try {
        const [following, counts] = await Promise.all([
            isFollowing(sessionUserId, targetUserId),
            getFollowCounts(targetUserId),
        ])

        return NextResponse.json({
            success: true,
            isFollowing: following,
            followerCount: counts.followers,
            followingCount: counts.following,
        })
    } catch (error) {
        console.error('[follows/GET] Error:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to fetch follow status' },
            { status: 500 }
        )
    }
})

/* -------------------------------------------------------------------------- */
/*  POST — follow                                                              */
/* -------------------------------------------------------------------------- */

export const POST = withAuth(async (request: NextRequest, sessionUserId: string) => {
    let body: unknown
    try {
        body = await request.json()
    } catch {
        return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 })
    }

    const targetUserId = (body as { targetUserId?: string })?.targetUserId?.trim()
    if (!targetUserId) {
        return NextResponse.json(
            { success: false, error: 'targetUserId is required' },
            { status: 400 }
        )
    }

    if (targetUserId === sessionUserId) {
        return NextResponse.json(
            { success: false, error: 'Cannot follow yourself' },
            { status: 400 }
        )
    }

    try {
        await followUser(sessionUserId, targetUserId)
        const counts = await getFollowCounts(targetUserId)

        return NextResponse.json({
            success: true,
            isFollowing: true,
            followerCount: counts.followers,
        })
    } catch (error) {
        console.error('[follows/POST] Error:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to follow user' },
            { status: 500 }
        )
    }
})

/* -------------------------------------------------------------------------- */
/*  DELETE — unfollow                                                          */
/* -------------------------------------------------------------------------- */

export const DELETE = withAuth(async (request: NextRequest, sessionUserId: string) => {
    let body: unknown
    try {
        body = await request.json()
    } catch {
        return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 })
    }

    const targetUserId = (body as { targetUserId?: string })?.targetUserId?.trim()
    if (!targetUserId) {
        return NextResponse.json(
            { success: false, error: 'targetUserId is required' },
            { status: 400 }
        )
    }

    try {
        await unfollowUser(sessionUserId, targetUserId)
        const counts = await getFollowCounts(targetUserId)

        return NextResponse.json({
            success: true,
            isFollowing: false,
            followerCount: counts.followers,
        })
    } catch (error) {
        console.error('[follows/DELETE] Error:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to unfollow user' },
            { status: 500 }
        )
    }
})

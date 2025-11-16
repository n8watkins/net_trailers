import { NextRequest, NextResponse } from 'next/server'
import { apiError } from '@/utils/debugLogger'
import {
    buildPublicProfilePayload,
    fetchUserIdForUsername,
    getPublicProfileCacheHeaders,
} from '@/lib/publicProfile'

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ username: string }> }
): Promise<NextResponse> {
    const { username: rawUsername } = await params
    const username = rawUsername?.trim()

    if (!username) {
        return NextResponse.json(
            { error: 'Missing username parameter' },
            { status: 400, headers: getPublicProfileCacheHeaders() }
        )
    }

    try {
        const userId = await fetchUserIdForUsername(username)

        if (!userId) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404, headers: getPublicProfileCacheHeaders() }
            )
        }

        const payload = await buildPublicProfilePayload(userId)

        if (!payload) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404, headers: getPublicProfileCacheHeaders() }
            )
        }

        return NextResponse.json(payload, {
            status: 200,
            headers: getPublicProfileCacheHeaders(),
        })
    } catch (error) {
        const message = (error as Error).message || ''
        apiError('[PublicProfile] Failed to fetch profile by username:', error)
        if (message.includes('Could not load the default credentials')) {
            return NextResponse.json(
                { error: 'Admin credentials not configured' },
                { status: 503, headers: getPublicProfileCacheHeaders() }
            )
        }
        return NextResponse.json(
            {
                error: 'Failed to load profile',
                detail: process.env.NODE_ENV === 'development' ? message : undefined,
            },
            { status: 500, headers: getPublicProfileCacheHeaders() }
        )
    }
}

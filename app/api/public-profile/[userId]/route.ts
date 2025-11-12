import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb } from '@/lib/firebase-admin'

interface PublicProfileResponse {
    username: string
    displayName?: string | null
    avatarUrl?: string | null
    bio?: string | null
    favoriteGenres?: string[]
}

const DEFAULT_RESPONSE_HEADERS = {
    'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
}

export async function GET(
    _request: NextRequest,
    { params }: { params: { userId: string } }
): Promise<NextResponse> {
    const userId = params?.userId?.trim()

    if (!userId) {
        return NextResponse.json(
            { error: 'Missing userId parameter' },
            { status: 400, headers: DEFAULT_RESPONSE_HEADERS }
        )
    }

    try {
        const db = getAdminDb()

        // Prefer dedicated profile documents if they exist
        const profileRef = db.collection('profiles').doc(userId)
        const profileSnap = await profileRef.get()

        if (profileSnap.exists) {
            const data = profileSnap.data() || {}

            // Respect profile visibility flag
            if (data.isPublic === false) {
                return NextResponse.json(
                    { error: 'Profile is private' },
                    { status: 404, headers: DEFAULT_RESPONSE_HEADERS }
                )
            }

            const payload: PublicProfileResponse = {
                username: data.username ?? 'User',
                displayName: data.displayName ?? null,
                avatarUrl: data.avatarUrl ?? null,
                bio: data.description ?? null,
                favoriteGenres: Array.isArray(data.favoriteGenres)
                    ? data.favoriteGenres
                    : undefined,
            }

            return NextResponse.json(payload, {
                status: 200,
                headers: DEFAULT_RESPONSE_HEADERS,
            })
        }

        // Fallback to legacy users collection for minimal public data
        const userRef = db.collection('users').doc(userId)
        const userSnap = await userRef.get()

        if (!userSnap.exists) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404, headers: DEFAULT_RESPONSE_HEADERS }
            )
        }

        const legacyData = userSnap.data() || {}
        const legacyProfile = legacyData.profile || {}

        const payload: PublicProfileResponse = {
            username:
                legacyProfile.username || legacyData.username || legacyData.displayName || 'User',
            displayName: legacyProfile.displayName ?? legacyData.displayName ?? null,
            avatarUrl: legacyProfile.avatarUrl ?? legacyData.avatarUrl ?? null,
            bio: legacyProfile.bio ?? legacyData.bio ?? null,
        }

        return NextResponse.json(payload, {
            status: 200,
            headers: DEFAULT_RESPONSE_HEADERS,
        })
    } catch (error) {
        console.error('[PublicProfile] Failed to fetch profile:', error)
        return NextResponse.json(
            {
                error: 'Failed to load profile',
                detail:
                    process.env.NODE_ENV === 'development' ? (error as Error).message : undefined,
            },
            { status: 500 }
        )
    }
}

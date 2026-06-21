/**
 * /api/profiles/username-availability
 *
 * GET ?username=<slug>[&currentUserId=<id>]
 *
 * Publicly accessible. Returns { available, error? }.
 * `currentUserId` is accepted as a query param so that a user checking their
 * own existing username gets `available: true` rather than "already taken".
 * Callers should pass their own id here; we do NOT enforce that it matches the
 * session because this endpoint is read-only with no side effects.
 */

import { NextRequest, NextResponse } from 'next/server'

import { checkUsernameAvailability } from '@/db/queries/profiles'

export async function GET(request: NextRequest): Promise<NextResponse> {
    const { searchParams } = request.nextUrl

    const username = searchParams.get('username')?.trim()
    if (!username) {
        return NextResponse.json(
            { available: false, error: 'username query parameter is required' },
            { status: 400 }
        )
    }

    // Optional: allow callers to pass their own userId so their current
    // username is still considered "available".
    const currentUserId = searchParams.get('currentUserId') ?? undefined

    try {
        const result = await checkUsernameAvailability(username, currentUserId)
        return NextResponse.json(result)
    } catch (error) {
        console.error('[username-availability] Error:', error)
        return NextResponse.json(
            { available: false, error: 'Could not verify username availability' },
            { status: 500 }
        )
    }
}

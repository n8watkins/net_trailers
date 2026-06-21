/**
 * /api/badges
 *
 * GET  ?userId=<id>
 *   - Publicly accessible. Returns badge list for the given user.
 *
 * POST { name, description?, icon?, color? }
 *   - Authenticated. Award a badge to the current session user.
 *     Admin-only in a production context; the route here accepts any
 *     authenticated user so admin callers (via server actions / admin routes)
 *     can award badges programmatically. Add isCurrentUserAdmin() check when
 *     surfacing a public-facing award UI.
 */

import { NextRequest, NextResponse } from 'next/server'

import { withAuth } from '@/lib/auth-middleware'
import { awardBadge, listBadges } from '@/db/queries/profiles'

/* -------------------------------------------------------------------------- */
/*  GET — list badges for a user                                               */
/* -------------------------------------------------------------------------- */

export async function GET(request: NextRequest): Promise<NextResponse> {
    const { searchParams } = request.nextUrl
    const userId = searchParams.get('userId')?.trim()

    if (!userId) {
        return NextResponse.json(
            { success: false, error: 'userId query parameter is required' },
            { status: 400 }
        )
    }

    try {
        const badges = await listBadges(userId)
        return NextResponse.json({ success: true, badges })
    } catch (error) {
        console.error('[badges/GET] Error:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to fetch badges' },
            { status: 500 }
        )
    }
}

/* -------------------------------------------------------------------------- */
/*  POST — award a badge                                                       */
/* -------------------------------------------------------------------------- */

export const POST = withAuth(async (request: NextRequest, sessionUserId: string) => {
    let body: unknown
    try {
        body = await request.json()
    } catch {
        return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 })
    }

    if (!body || typeof body !== 'object') {
        return NextResponse.json({ success: false, error: 'Missing request body' }, { status: 400 })
    }

    const { name, description, icon, color } = body as {
        name?: string
        description?: string
        icon?: string
        color?: string
    }

    if (!name || typeof name !== 'string' || !name.trim()) {
        return NextResponse.json(
            { success: false, error: 'badge name is required' },
            { status: 400 }
        )
    }

    try {
        const badge = await awardBadge(sessionUserId, {
            name: name.trim(),
            description: description ?? null,
            icon: icon ?? null,
            color: color ?? null,
        })

        return NextResponse.json({ success: true, badge }, { status: 201 })
    } catch (error) {
        console.error('[badges/POST] Error:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to award badge' },
            { status: 500 }
        )
    }
})

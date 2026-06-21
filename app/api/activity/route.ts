/**
 * /api/activity
 *
 * GET  ?limit=<n>
 *   - Authenticated. Returns the current user's recent activity, newest first.
 *   - Default limit: 50. Maximum: 200.
 *
 * POST { type, referenceId?, referenceType?, preview? }
 *   - Authenticated. Append an activity event for the current user.
 *
 * The acting user id is always taken from the Auth.js session.
 */

import { NextRequest, NextResponse } from 'next/server'

import { withAuth } from '@/lib/auth-middleware'
import { addActivity, listActivity, type ActivityItem } from '@/db/queries/profiles'

const MAX_LIMIT = 200
const DEFAULT_LIMIT = 50

/* -------------------------------------------------------------------------- */
/*  GET — list activity                                                        */
/* -------------------------------------------------------------------------- */

export const GET = withAuth(async (request: NextRequest, sessionUserId: string) => {
    const { searchParams } = request.nextUrl
    const rawLimit = parseInt(searchParams.get('limit') ?? String(DEFAULT_LIMIT), 10)
    const limit = isNaN(rawLimit) ? DEFAULT_LIMIT : Math.min(Math.max(1, rawLimit), MAX_LIMIT)

    try {
        const activity = await listActivity(sessionUserId, limit)
        return NextResponse.json({ success: true, activity })
    } catch (error) {
        console.error('[activity/GET] Error:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to fetch activity' },
            { status: 500 }
        )
    }
})

/* -------------------------------------------------------------------------- */
/*  POST — record activity event                                               */
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

    const { type, referenceId, referenceType, preview, timestamp } = body as {
        type?: string
        referenceId?: string
        referenceType?: string
        preview?: unknown
        timestamp?: number
    }

    if (!type || typeof type !== 'string' || !type.trim()) {
        return NextResponse.json(
            { success: false, error: 'activity type is required' },
            { status: 400 }
        )
    }

    const event: Omit<ActivityItem, 'id' | 'userId'> = {
        type: type.trim(),
        timestamp: typeof timestamp === 'number' ? timestamp : Date.now(),
        referenceId: referenceId ?? null,
        referenceType: referenceType ?? null,
        preview: preview ?? null,
    }

    try {
        const created = await addActivity(sessionUserId, event)
        return NextResponse.json({ success: true, activity: created }, { status: 201 })
    } catch (error) {
        console.error('[activity/POST] Error:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to record activity' },
            { status: 500 }
        )
    }
})

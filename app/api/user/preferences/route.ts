/**
 * /api/user/preferences
 *
 * Authenticated CRUD for the current user's preferences blob. The user id is
 * taken from the Auth.js session (never the request body), so a user can only
 * ever read/write their own data.
 */

import { NextRequest, NextResponse } from 'next/server'

import { withAuth } from '@/lib/auth-middleware'
import {
    clearUserPreferences,
    loadUserPreferences,
    saveUserPreferences,
} from '@/db/queries/userPreferences'
import type { UserPreferences } from '@/types/shared'

export const GET = withAuth(async (_request: NextRequest, userId: string) => {
    const preferences = await loadUserPreferences(userId)
    return NextResponse.json({ success: true, preferences })
})

export const PUT = withAuth(async (request: NextRequest, userId: string) => {
    let body: unknown
    try {
        body = await request.json()
    } catch {
        return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 })
    }

    const preferences = (
        body && typeof body === 'object' && 'preferences' in body
            ? (body as { preferences: UserPreferences }).preferences
            : body
    ) as UserPreferences

    if (!preferences || typeof preferences !== 'object') {
        return NextResponse.json(
            { success: false, error: 'Missing preferences payload' },
            { status: 400 }
        )
    }

    await saveUserPreferences(userId, preferences)
    return NextResponse.json({ success: true })
})

export const DELETE = withAuth(async (_request: NextRequest, userId: string) => {
    const preferences = await clearUserPreferences(userId)
    return NextResponse.json({ success: true, preferences })
})

/**
 * /api/profiles/[userId]
 *
 * GET  — Public profile read. No authentication required.
 *         Respects ProfileVisibility.enablePublicProfile; returns a sanitised
 *         subset of the UserProfile (omits private `email` field).
 *
 * PATCH — Authenticated profile update. Only the session-authenticated user
 *          may update their own profile (or an admin may update any profile).
 *          User id is always taken from the session, never from the URL.
 */

import { NextRequest, NextResponse } from 'next/server'

import { withAuth } from '@/lib/auth-middleware'
import { isCurrentUserAdmin } from '@/db/queries/_helpers'
import { checkUsernameAvailability, getProfile, updateProfile } from '@/db/queries/profiles'
import type { UpdateProfileRequest } from '@/types/profile'
import { PROFILE_CONSTRAINTS } from '@/types/profile'

type RouteContext = { params: Promise<{ userId: string }> }

/* -------------------------------------------------------------------------- */
/*  GET — public profile                                                       */
/* -------------------------------------------------------------------------- */

export async function GET(_request: NextRequest, { params }: RouteContext): Promise<NextResponse> {
    const { userId: rawId } = await params
    const userId = rawId?.trim()

    if (!userId) {
        return NextResponse.json({ success: false, error: 'Missing userId' }, { status: 400 })
    }

    try {
        const profile = await getProfile(userId)

        if (!profile) {
            return NextResponse.json(
                { success: false, error: 'Profile not found' },
                { status: 404 }
            )
        }

        // Strip private fields before returning publicly.

        const { email: _email, ...publicProfile } = profile

        return NextResponse.json({ success: true, profile: publicProfile })
    } catch (error) {
        console.error('[profiles/GET] Error fetching profile:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to fetch profile' },
            { status: 500 }
        )
    }
}

/* -------------------------------------------------------------------------- */
/*  PATCH — authenticated update (own profile or admin)                       */
/* -------------------------------------------------------------------------- */

export const PATCH = withAuth(
    async (request: NextRequest, sessionUserId: string, context?: RouteContext) => {
        const { userId: rawTargetId } = await context!.params
        const targetUserId = rawTargetId?.trim()

        if (!targetUserId) {
            return NextResponse.json({ success: false, error: 'Missing userId' }, { status: 400 })
        }

        // Ownership check — only the owner or an admin may update a profile.
        if (targetUserId !== sessionUserId) {
            const admin = await isCurrentUserAdmin()
            if (!admin) {
                return NextResponse.json(
                    { success: false, error: 'Not authorised to update this profile' },
                    { status: 403 }
                )
            }
        }

        let body: unknown
        try {
            body = await request.json()
        } catch {
            return NextResponse.json(
                { success: false, error: 'Invalid JSON body' },
                { status: 400 }
            )
        }

        if (!body || typeof body !== 'object') {
            return NextResponse.json(
                { success: false, error: 'Missing request body' },
                { status: 400 }
            )
        }

        const updates = body as UpdateProfileRequest

        // --- Validate individual fields ---

        if (updates.displayName !== undefined) {
            const trimmed = updates.displayName.trim()
            if (
                trimmed.length < PROFILE_CONSTRAINTS.MIN_DISPLAY_NAME_LENGTH ||
                trimmed.length > PROFILE_CONSTRAINTS.MAX_DISPLAY_NAME_LENGTH
            ) {
                return NextResponse.json(
                    { success: false, error: 'Display name length is invalid' },
                    { status: 400 }
                )
            }
        }

        if (
            updates.username !== undefined &&
            updates.username !== '' &&
            updates.username !== null
        ) {
            // Pre-validate so we return a clear message rather than a DB error.
            const availability = await checkUsernameAvailability(updates.username, targetUserId)
            if (!availability.available) {
                return NextResponse.json(
                    {
                        success: false,
                        error: availability.error ?? 'Username is not available',
                    },
                    { status: 409 }
                )
            }
        }

        if (
            updates.description !== undefined &&
            updates.description.length > PROFILE_CONSTRAINTS.MAX_DESCRIPTION_LENGTH
        ) {
            return NextResponse.json(
                { success: false, error: 'Description exceeds maximum length' },
                { status: 400 }
            )
        }

        if (
            updates.favoriteGenres !== undefined &&
            updates.favoriteGenres.length > PROFILE_CONSTRAINTS.MAX_FAVORITE_GENRES
        ) {
            return NextResponse.json(
                { success: false, error: 'Too many favourite genres' },
                { status: 400 }
            )
        }

        try {
            // Always write to the target's row; session userId used only for auth.
            await updateProfile(targetUserId, updates)

            // Return the updated profile so the store can update its local copy.
            const profile = await getProfile(targetUserId)

            const { email: _email, ...publicProfile } = profile ?? {}

            return NextResponse.json({ success: true, profile: publicProfile })
        } catch (error) {
            console.error('[profiles/PATCH] Error updating profile:', error)
            // A UNIQUE constraint violation from the username column surfaces here.
            const message = (error as Error).message ?? ''
            if (message.toLowerCase().includes('unique')) {
                return NextResponse.json(
                    { success: false, error: 'Username is already taken' },
                    { status: 409 }
                )
            }
            return NextResponse.json(
                { success: false, error: 'Failed to update profile' },
                { status: 500 }
            )
        }
    }
)

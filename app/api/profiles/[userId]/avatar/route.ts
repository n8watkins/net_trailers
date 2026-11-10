/**
 * /api/profiles/[userId]/avatar
 *
 * PUT { avatarUrl, avatarSource? }
 *
 * Authenticated. Stores an avatar URL (data URL or any HTTPS URL) directly in
 * the `profiles.avatarUrl` column. Ownership is verified via the Auth.js
 * session - only the profile owner (or an admin) may update.
 *
 * NOTE: This stub stores the URL string as-is. Firebase Storage has been
 * removed. To support binary uploads, add an S3/Cloudinary step here that
 * returns a CDN URL and then calls `updateProfileAvatar`.
 */

import { NextRequest, NextResponse } from 'next/server'

import { withAuth } from '@/lib/auth-middleware'
import { isCurrentUserAdmin } from '@/db/queries/_helpers'
import { updateProfileAvatar } from '@/db/queries/profiles'
import { allowedAvatarUrl } from '@/lib/uploads'

type RouteContext = { params: Promise<{ userId: string }> }

export const PUT = withAuth(
    async (request: NextRequest, sessionUserId: string, context?: RouteContext) => {
        const { userId: rawTargetId } = await context!.params
        const targetUserId = rawTargetId?.trim()

        if (!targetUserId) {
            return NextResponse.json({ success: false, error: 'Missing userId' }, { status: 400 })
        }

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

        const { avatarUrl, avatarSource } = (body ?? {}) as {
            avatarUrl?: string
            avatarSource?: string
        }

        if (!avatarUrl || typeof avatarUrl !== 'string') {
            return NextResponse.json(
                { success: false, error: 'avatarUrl is required' },
                { status: 400 }
            )
        }

        // Shown to everyone who sees this user's posts, so only the user's own
        // uploads or a known avatar host: an outside URL would let its owner
        // log every viewer's IP, and data: URLs bloat every page.
        const storedUrl = allowedAvatarUrl(avatarUrl, targetUserId)
        if (!storedUrl) {
            return NextResponse.json(
                { success: false, error: 'avatarUrl must be an uploaded image or a GitHub avatar' },
                { status: 400 }
            )
        }
        const source =
            avatarSource === 'google' || avatarSource === 'generated' ? avatarSource : 'custom'

        try {
            await updateProfileAvatar(targetUserId, storedUrl, source)

            return NextResponse.json({ success: true, avatarUrl: storedUrl })
        } catch (error) {
            console.error('[profiles/avatar PUT] Error:', error)
            return NextResponse.json(
                { success: false, error: 'Failed to update avatar' },
                { status: 500 }
            )
        }
    }
)

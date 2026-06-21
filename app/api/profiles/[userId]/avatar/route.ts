/**
 * /api/profiles/[userId]/avatar
 *
 * PUT { avatarUrl, avatarSource? }
 *
 * Authenticated. Stores an avatar URL (data URL or any HTTPS URL) directly in
 * the `profiles.avatarUrl` column. Ownership is verified via the Auth.js
 * session — only the profile owner (or an admin) may update.
 *
 * NOTE: This stub stores the URL string as-is. Firebase Storage has been
 * removed. To support binary uploads, add an S3/Cloudinary step here that
 * returns a CDN URL and then calls `updateProfileAvatar`.
 */

import { NextRequest, NextResponse } from 'next/server'

import { withAuth } from '@/lib/auth-middleware'
import { isCurrentUserAdmin } from '@/db/queries/_helpers'
import { updateProfileAvatar } from '@/db/queries/profiles'

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

        try {
            await updateProfileAvatar(
                targetUserId,
                avatarUrl,
                (avatarSource as 'google' | 'custom' | 'generated') ?? 'custom'
            )

            return NextResponse.json({ success: true, avatarUrl })
        } catch (error) {
            console.error('[profiles/avatar PUT] Error:', error)
            return NextResponse.json(
                { success: false, error: 'Failed to update avatar' },
                { status: 500 }
            )
        }
    }
)

/**
 * Admin API Route: Seed Social Notifications
 *
 * Seeds social interactions (comments and likes) on user rankings
 * which automatically creates social notifications.
 *
 * This is an admin-only endpoint that can seed social notifications for:
 * - Admin user only (default)
 * - All users (when adminOnly=false)
 *
 * NOTE: getDemoProfileIds() still uses the client-side Firebase SDK to query
 * Firestore profiles with a `demo_` prefix pattern.  Until seedProfiles.ts is
 * migrated to Drizzle (out of scope here), this route returns an early error
 * if no demo profiles are found, which is the same behaviour as before.
 */

import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/db'
import { profiles } from '@/db/schema'
import { validateAdminRequest } from '@/utils/adminMiddleware'
import { seedSocialNotifications } from '@/utils/seed/seedSocialNotifications'

export async function POST(req: NextRequest) {
    try {
        const authResult = await validateAdminRequest(req)
        if (!authResult.authorized) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        console.log('[Seed Social] Starting social notification seeding')

        const { searchParams } = new URL(req.url)
        const adminOnly = searchParams.get('adminOnly') !== 'false'

        // Identify demo profiles from the Drizzle profiles table.
        // Demo profiles were created with a userId that starts with 'demo_'.
        const allProfiles = await db
            .select({
                userId: profiles.userId,
                displayName: profiles.displayName,
                avatarUrl: profiles.avatarUrl,
            })
            .from(profiles)

        const demoProfileIds = allProfiles
            .filter((p) => p.userId.startsWith('demo_'))
            .map((p) => p.userId)

        if (demoProfileIds.length === 0) {
            return NextResponse.json(
                { error: 'No demo profiles found. Please seed demo profiles first.' },
                { status: 400 }
            )
        }
        console.log(`[Seed Social] Found ${demoProfileIds.length} demo profiles`)

        // Determine which users to seed for.
        const targetProfiles = adminOnly
            ? allProfiles.filter((p) => !p.userId.startsWith('demo_')).slice(0, 1) // admin user only
            : allProfiles.filter((p) => !p.userId.startsWith('demo_'))

        let totalRankings = 0
        let totalComments = 0
        let totalLikes = 0
        let totalNotifications = 0
        let usersProcessed = 0
        let usersSkipped = 0

        const demoSet = new Set(demoProfileIds)

        for (const profile of targetProfiles) {
            if (demoSet.has(profile.userId)) {
                usersSkipped++
                continue
            }

            try {
                const result = await seedSocialNotifications({
                    userId: profile.userId,
                    userName: profile.displayName ?? 'User',
                    userAvatar: profile.avatarUrl ?? undefined,
                    targetNotificationCount: 7,
                })

                totalRankings += result.rankingsProcessed
                totalComments += result.commentsCreated
                totalLikes += result.likesCreated
                totalNotifications += result.estimatedNotifications
                usersProcessed++
            } catch (error) {
                console.error(`[Seed Social] Failed for ${profile.userId}:`, error)
            }
        }

        console.log(`[Seed Social] Complete: ${usersProcessed} processed, ${usersSkipped} skipped`)

        return NextResponse.json({
            success: true,
            usersProcessed,
            usersSkipped,
            rankingsProcessed: totalRankings,
            commentsCreated: totalComments,
            likesCreated: totalLikes,
            notificationsCreated: totalNotifications,
        })
    } catch (error) {
        console.error('[Seed Social] Error:', error)
        return NextResponse.json(
            {
                error: 'Failed to seed social notifications',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        )
    }
}

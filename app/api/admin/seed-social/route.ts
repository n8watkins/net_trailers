/**
 * Admin API Route: Seed Social Notifications
 *
 * Seeds social interactions (comments and likes) on user rankings
 * which automatically creates social notifications.
 *
 * This is an admin-only endpoint that can seed social notifications for:
 * - Admin user only (default)
 * - All users (when adminOnly=false)
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateAdminRequest } from '@/utils/adminMiddleware'
import { getAdminDb } from '@/lib/firebase-admin'
import { seedSocialNotifications } from '@/utils/seed/seedSocialNotifications'
import { getDemoProfileIds } from '@/utils/seed/seedProfiles'

const ADMIN_UID = process.env.ADMIN_UID

export async function POST(req: NextRequest) {
    try {
        // Validate admin request
        const authResult = await validateAdminRequest(req)
        if (!authResult.authorized) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        console.log('🔔 [Seed Social] Starting social notification seeding')

        // Check if admin-only mode is enabled via query parameter
        const { searchParams } = new URL(req.url)
        const adminOnlyParam = searchParams.get('adminOnly')
        const adminOnly = adminOnlyParam !== 'false' // Default to true

        if (adminOnly) {
            console.log('🔔 [Seed Social] Running in ADMIN-ONLY mode')
        } else {
            console.log('🔔 [Seed Social] Running in ALL USERS mode')
        }

        // Ensure demo profiles exist
        console.log('🔔 [Seed Social] Checking for demo profiles...')
        const demoProfileIds = await getDemoProfileIds()
        if (demoProfileIds.length === 0) {
            return NextResponse.json(
                {
                    error: 'No demo profiles found. Please seed demo profiles first.',
                },
                { status: 400 }
            )
        }
        console.log(`🔔 [Seed Social] Found ${demoProfileIds.length} demo profiles`)

        // Get users to seed
        const db = getAdminDb()
        const usersSnapshot = await db.collection('users').get()

        let totalRankings = 0
        let totalComments = 0
        let totalLikes = 0
        let totalNotifications = 0
        let usersProcessed = 0
        let usersSkipped = 0

        for (const userDoc of usersSnapshot.docs) {
            const userData = userDoc.data()
            const userId = userDoc.id

            // ADMIN ONLY MODE: Skip all users except admin
            if (adminOnly && (!ADMIN_UID || userId !== ADMIN_UID)) {
                console.log(`🔔 [Seed Social] Skipping non-admin user: ${userId}`)
                usersSkipped++
                continue
            }

            // Skip demo profiles (they're commenters, not recipients)
            if (demoProfileIds.includes(userId)) {
                console.log(`🔔 [Seed Social] Skipping demo profile: ${userId}`)
                usersSkipped++
                continue
            }

            try {
                console.log(`🔔 [Seed Social] Seeding for user: ${userId}`)

                const result = await seedSocialNotifications({
                    userId,
                    userName: userData.displayName || userData.username || 'User',
                    userAvatar: userData.avatarUrl,
                    targetNotificationCount: 7, // Create ~7 social notifications
                })

                totalRankings += result.rankingsProcessed
                totalComments += result.commentsCreated
                totalLikes += result.likesCreated
                totalNotifications += result.estimatedNotifications
                usersProcessed++

                console.log(`🔔 [Seed Social] ✅ Completed for ${userId}:`, result)
            } catch (error) {
                console.error(`🔔 [Seed Social] ❌ Failed to seed for ${userId}:`, error)
            }
        }

        console.log('🔔 [Seed Social] Complete!')
        console.log(`   - Users processed: ${usersProcessed}`)
        console.log(`   - Users skipped: ${usersSkipped}`)
        console.log(`   - Rankings processed: ${totalRankings}`)
        console.log(`   - Comments created: ${totalComments}`)
        console.log(`   - Likes created: ${totalLikes}`)
        console.log(`   - Notifications created: ~${totalNotifications}`)

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
        console.error('🔔 ❌ [Seed Social] Error:', error)
        return NextResponse.json(
            {
                error: 'Failed to seed social notifications',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        )
    }
}

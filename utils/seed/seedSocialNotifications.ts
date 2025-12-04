/**
 * Seed Social Notifications
 *
 * Creates social interactions (comments and likes) on user rankings
 * which automatically triggers notification creation.
 *
 * How it works:
 * 1. Gets demo profiles to act as commenters/likers
 * 2. Finds user's existing rankings (or creates demo rankings if none exist)
 * 3. Seeds comments and likes on those rankings
 * 4. Notifications are created automatically via:
 *    - utils/firestore/rankingComments.ts (createCommentNotification)
 *    - utils/firestore/rankings.ts (createLikeNotification)
 * 5. Email delivery happens via weekly cron job (social-digest)
 */

import { getDemoProfileIds, DEMO_PROFILES } from './seedProfiles'
import { seedRankingComments, seedRankingLikes } from './seedRankingComments'
import { seedRankings } from './seedRankings'

export interface SeedSocialNotificationsOptions {
    userId: string
    userName: string
    userAvatar?: string
    targetNotificationCount?: number // How many social notifications to target (default: 5-10)
}

/**
 * Seed social notifications by creating comments and likes on user rankings
 */
export async function seedSocialNotifications(options: SeedSocialNotificationsOptions): Promise<{
    rankingsProcessed: number
    commentsCreated: number
    likesCreated: number
    estimatedNotifications: number
}> {
    const { userId, userName, userAvatar, targetNotificationCount = 7 } = options

    console.log(`🔔 Seeding social notifications for ${userName} (${userId})`)

    // 1. Get demo profiles to act as commenters/likers
    const demoProfileIds = await getDemoProfileIds()
    const commentingProfiles = demoProfileIds.map((id) => {
        const profile = DEMO_PROFILES.find((p) => p.userId === id)
        return {
            userId: id,
            userName: profile?.userName || 'Demo User',
            userAvatar: profile?.userAvatar,
        }
    })

    // Add the user themselves to the profiles list (for ranking owner replies)
    const allProfiles = [
        ...commentingProfiles,
        {
            userId,
            userName,
            userAvatar,
        },
    ]

    console.log(`  👥 Using ${commentingProfiles.length} demo profiles for interactions`)

    // 2. Get user's existing rankings
    const { useRankingStore } = await import('../../stores/rankingStore')
    await useRankingStore.getState().loadUserRankings(userId)
    let userRankings = useRankingStore
        .getState()
        .rankings.filter((r) => r.userId === userId && r.visibility === 'public')

    // 3. If no rankings exist, create some demo rankings first
    if (userRankings.length === 0) {
        console.log('  📊 No existing rankings found, creating demo rankings first...')
        await seedRankings({ userId, userName, userAvatar })

        // Reload rankings
        await useRankingStore.getState().loadUserRankings(userId)
        userRankings = useRankingStore
            .getState()
            .rankings.filter((r) => r.userId === userId && r.visibility === 'public')

        console.log(`  ✅ Created ${userRankings.length} demo rankings`)
    }

    if (userRankings.length === 0) {
        console.error('  ❌ No rankings available to seed comments/likes')
        return {
            rankingsProcessed: 0,
            commentsCreated: 0,
            likesCreated: 0,
            estimatedNotifications: 0,
        }
    }

    console.log(`  📊 Found ${userRankings.length} public rankings to add interactions to`)

    // 4. Calculate how many interactions to create per ranking
    // We want roughly targetNotificationCount notifications total
    // Each comment creates 1 notification
    // Each ranking with likes creates 1 aggregated notification (regardless of like count)
    // So we need: targetNotificationCount total interactions across all rankings

    const rankingsToUse = Math.min(userRankings.length, Math.ceil(targetNotificationCount / 2))
    const selectedRankings = userRankings.slice(0, rankingsToUse)

    let totalComments = 0
    let totalLikes = 0
    let estimatedNotifications = 0

    // 5. Add comments and likes to each ranking
    for (const ranking of selectedRankings) {
        // Each ranking gets 1-3 comments
        const commentCount = Math.floor(Math.random() * 3) + 1

        console.log(`  💬 Processing ranking: ${ranking.title}`)

        // Seed comments (each creates a notification)
        await seedRankingComments({
            rankingId: ranking.id!,
            rankingOwnerId: userId,
            commentingProfiles: allProfiles, // Include user for replies
            commentCount,
        })

        totalComments += commentCount
        estimatedNotifications += commentCount // Each comment = 1 notification

        // Seed likes (creates 1 aggregated notification per ranking)
        const likeCount = Math.floor(Math.random() * commentingProfiles.length) + 1
        await seedRankingLikes({
            rankingId: ranking.id!,
            rankingOwnerId: userId,
            likingProfiles: commentingProfiles,
            likeCount,
        })

        totalLikes += likeCount
        estimatedNotifications += 1 // All likes on a ranking = 1 aggregated notification

        // Small delay between rankings
        await new Promise((resolve) => setTimeout(resolve, 500))
    }

    console.log(`  ✅ Social notification seeding complete!`)
    console.log(`     - ${selectedRankings.length} rankings processed`)
    console.log(`     - ${totalComments} comments created`)
    console.log(`     - ${totalLikes} likes created`)
    console.log(`     - ~${estimatedNotifications} notifications created`)

    return {
        rankingsProcessed: selectedRankings.length,
        commentsCreated: totalComments,
        likesCreated: totalLikes,
        estimatedNotifications,
    }
}

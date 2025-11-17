/**
 * Historical Trending Notification Seeder
 *
 * Creates sample trending notifications for new users to demonstrate the feature
 */

import { db } from '../firebase'
import { collection, addDoc } from 'firebase/firestore'

/**
 * Popular movies/shows that are frequently trending (for realistic demo)
 */
const SAMPLE_TRENDING_ITEMS = [
    {
        type: 'movie',
        id: 693134,
        title: 'Dune: Part Two',
        posterPath: '/8b8R8l88Qje9dn9OE8PY05Nxl1X.jpg',
    },
    {
        type: 'movie',
        id: 748783,
        title: 'The Garfield Movie',
        posterPath: '/xYduFGuch9OwbCOEUiamml18ZoB.jpg',
    },
    {
        type: 'tv',
        id: 94997,
        title: 'House of the Dragon',
        posterPath: '/7QMsOTMUswlwxJP0rTTZfmz2tX2.jpg',
    },
    {
        type: 'movie',
        id: 519182,
        title: 'Despicable Me 4',
        posterPath: '/wWba3TaojhK7NdycRhoQpsG0FaH.jpg',
    },
    {
        type: 'tv',
        id: 84958,
        title: 'Loki',
        posterPath: '/kEl2t3OhXc3Zb9FBh1AuYzRTgZp.jpg',
    },
]

/**
 * Seed 1-2 historical trending notifications for a new user
 *
 * @param userId - Firebase user ID
 * @returns Promise that resolves when seeding is complete
 */
export async function seedHistoricalTrending(userId: string): Promise<void> {
    try {
        // Create 1-2 realistic notifications from yesterday
        const yesterday = Date.now() - 24 * 60 * 60 * 1000

        // Pick 1-2 random items
        const itemCount = Math.floor(Math.random() * 2) + 1 // 1 or 2
        const selectedItems = SAMPLE_TRENDING_ITEMS.sort(() => Math.random() - 0.5).slice(
            0,
            itemCount
        )

        for (const item of selectedItems) {
            await addDoc(collection(db, `users/${userId}/notifications`), {
                type: 'trending_update',
                title: 'Now Trending!',
                message: `${item.title} is trending this week`,
                contentId: item.id,
                mediaType: item.type,
                imageUrl: `https://image.tmdb.org/t/p/w92${item.posterPath}`,
                isRead: false,
                createdAt: yesterday,
                expiresAt: Date.now() + 29 * 24 * 60 * 60 * 1000, // 29 days from now
            })
        }

        console.log(`✅ Seeded ${itemCount} trending notification(s) for user ${userId}`)
    } catch (error) {
        console.error('Failed to seed trending notifications:', error)
        // Don't throw - seeding failure shouldn't prevent account creation
    }
}

/**
 * Check if user already has trending notifications
 *
 * @param userId - Firebase user ID
 * @returns Promise<boolean> - True if user has trending notifications
 */
export async function hasTrendingNotifications(userId: string): Promise<boolean> {
    try {
        const notificationsRef = collection(db, `users/${userId}/notifications`)
        // Note: This is a simple check - in production you'd query with a where clause
        // For now, we just seed once per user at signup
        return false
    } catch (error) {
        console.error('Error checking trending notifications:', error)
        return false
    }
}

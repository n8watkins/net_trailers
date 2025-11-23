/**
 * Seed Notifications
 */

import type { CreateNotificationRequest } from '../../types/notifications'

export interface SeedNotificationsOptions {
    userId: string
    count: number
}

const SAMPLE_NOTIFICATIONS: CreateNotificationRequest[] = [
    {
        type: 'trending_update',
        title: 'New Trending Movie',
        message: 'The Dark Knight just entered the top 10 trending movies!',
        contentId: 155,
        mediaType: 'movie',
        imageUrl: 'https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
    },
    {
        type: 'trending_update',
        title: 'Trending Series Alert',
        message: 'Breaking Bad is now #1 on trending TV shows!',
        contentId: 1396,
        mediaType: 'tv',
        imageUrl: 'https://image.tmdb.org/t/p/w500/ggFHVNu6YYI5L9pCfOacjizRGt.jpg',
    },
    {
        type: 'new_release',
        title: 'New Season Available',
        message: 'Stranger Things Season 5 is now available to stream!',
        contentId: 61889,
        mediaType: 'tv',
        imageUrl: 'https://image.tmdb.org/t/p/w500/49WJfeN0moxb9IPfGn8AIqMGskD.jpg',
    },
    {
        type: 'trending_update',
        title: 'Trending This Week',
        message: 'Inception is gaining popularity - watch it before it leaves!',
        contentId: 27205,
        mediaType: 'movie',
        imageUrl: 'https://image.tmdb.org/t/p/w500/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg',
    },
    {
        type: 'new_release',
        title: 'Highly Anticipated Release',
        message: 'The sequel to Interstellar is coming next month!',
        contentId: 157336,
        mediaType: 'movie',
        imageUrl: 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
    },
    {
        type: 'trending_update',
        title: 'Must-Watch Alert',
        message: 'Arcane Season 2 is breaking viewership records!',
        contentId: 94605,
        mediaType: 'tv',
        imageUrl: 'https://image.tmdb.org/t/p/w500/fqldf2t8ztc9aiwn3k6mlX3tvRT.jpg',
    },
    {
        type: 'new_release',
        title: 'Watchlist Alert',
        message: 'The Matrix is now available to stream!',
        contentId: 603,
        mediaType: 'movie',
        imageUrl: 'https://image.tmdb.org/t/p/w500/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg',
    },
]

export async function seedNotifications(options: SeedNotificationsOptions): Promise<void> {
    const { userId, count } = options

    if (count <= 0) {
        console.log('  ⏭️  Skipping notifications (count = 0)')
        return
    }

    console.log(`  🔔 Creating ${count} sample notifications`)

    const { useNotificationStore } = await import('../../stores/notificationStore')

    const notificationsToCreate = SAMPLE_NOTIFICATIONS.slice(
        0,
        Math.min(count, SAMPLE_NOTIFICATIONS.length)
    )

    for (const notification of notificationsToCreate) {
        try {
            await useNotificationStore.getState().createNotification(userId, notification)
            await new Promise((resolve) => setTimeout(resolve, 100))
        } catch (error) {
            console.error('Failed to create notification:', error)
        }
    }
}

/**
 * Seed historical trending notifications for new users
 */
export async function seedHistoricalTrending(userId: string): Promise<void> {
    const { db } = await import('../../firebase')
    const { collection, addDoc } = await import('firebase/firestore')

    const trendingItems = [
        {
            type: 'movie',
            id: 693134,
            title: 'Dune: Part Two',
            posterPath: '/8b8R8l88Qje9dn9OE8PY05Nxl1X.jpg',
        },
        {
            type: 'tv',
            id: 94997,
            title: 'House of the Dragon',
            posterPath: '/7QMsOTMUswlwxJP0rTTZfmz2tX2.jpg',
        },
    ]

    const yesterday = Date.now() - 24 * 60 * 60 * 1000
    const itemCount = Math.floor(Math.random() * 2) + 1

    try {
        for (let i = 0; i < itemCount; i++) {
            const item = trendingItems[i]
            await addDoc(collection(db, `users/${userId}/notifications`), {
                type: 'trending_update',
                title: 'Now Trending!',
                message: `${item.title} is trending this week`,
                contentId: item.id,
                mediaType: item.type,
                imageUrl: `https://image.tmdb.org/t/p/w92${item.posterPath}`,
                isRead: false,
                createdAt: yesterday,
                expiresAt: Date.now() + 29 * 24 * 60 * 60 * 1000,
            })
        }
        console.log(`  ✅ Seeded ${itemCount} trending notification(s)`)
    } catch (error) {
        console.error('Failed to seed trending notifications:', error)
    }
}

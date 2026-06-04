/**
 * Seed Notifications
 */

import type { CreateNotificationRequest } from '../../types/notifications'

export interface SeedNotificationsOptions {
    userId: string
    count: number
}

export async function seedNotifications(options: SeedNotificationsOptions): Promise<void> {
    const { userId, count } = options

    if (count <= 0) {
        console.log('  ⏭️  Skipping notifications (count = 0)')
        return
    }

    console.log(`  🔔 Creating ${count} trending notifications from live TMDB data`)

    const { useNotificationStore } = await import('../../stores/notificationStore')

    try {
        // Fetch current trending movies and TV shows
        const [moviesRes, tvRes] = await Promise.all([
            fetch('/api/movies/trending?page=1'),
            fetch('/api/tv/trending?page=1'),
        ])

        if (!moviesRes.ok || !tvRes.ok) {
            console.error('  ❌ Failed to fetch trending data, using fallback')
            return
        }

        const moviesData = await moviesRes.json()
        const tvData = await tvRes.json()

        // Combine trending items (movies and TV)
        const allTrendingItems = [
            ...moviesData.results.slice(0, 4).map((m: any) => ({ ...m, media_type: 'movie' })),
            ...tvData.results.slice(0, 4).map((s: any) => ({ ...s, media_type: 'tv' })),
        ]

        // Limit to requested count
        const itemsToNotify = allTrendingItems.slice(0, count)

        console.log(`  🔔 Creating ${itemsToNotify.length} notifications for real trending items`)

        // Create individual notification for each trending item
        for (const item of itemsToNotify) {
            const title = item.title || item.name
            const mediaType = item.media_type === 'movie' ? 'movie' : 'tv'

            await useNotificationStore.getState().createNotification(userId, {
                type: 'trending_update',
                title: 'Now Trending! 🔥',
                message: `${title} is currently trending this week!`,
                contentId: item.id,
                mediaType: mediaType,
                imageUrl: item.poster_path
                    ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
                    : undefined,
                actionUrl: `/${mediaType}/${item.id}`,
                expiresIn: 7,
            })

            // Small delay between notifications
            await new Promise((resolve) => setTimeout(resolve, 100))
        }

        console.log(`  ✅ Created ${itemsToNotify.length} trending notifications`)
    } catch (error) {
        console.error('  ❌ Failed to create trending notifications:', error)
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
                actionUrl: `/${item.type}/${item.id}`,
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

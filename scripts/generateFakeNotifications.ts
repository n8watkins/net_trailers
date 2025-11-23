/**
 * Generate Fake Trending Notifications
 *
 * This script creates fake trending notifications for testing purposes.
 * Run with: npx tsx scripts/generateFakeNotifications.ts <userId>
 *
 * Options:
 *   --clear    Clear existing notifications before creating new ones
 */

import { createNotification, deleteAllNotifications } from '../utils/firestore/notifications'

// Sample trending content data
const fakeTrendingItems = [
    {
        id: 872585,
        title: 'Oppenheimer',
        media_type: 'movie' as const,
        poster_path: '/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg',
    },
    {
        id: 976573,
        title: 'Elemental',
        media_type: 'movie' as const,
        poster_path: '/4Y1WNkd88JXmGfhtWR7dmDAo1T2.jpg',
    },
    {
        id: 94997,
        name: 'House of the Dragon',
        media_type: 'tv' as const,
        poster_path: '/7QMsOTMUswlwxJP0rTTZfmz2tX2.jpg',
    },
    {
        id: 246,
        name: 'Avatar: The Last Airbender',
        media_type: 'tv' as const,
        poster_path: '/9RQhVb3r3mCMqYVhLoCu4EvuipP.jpg',
    },
    {
        id: 569094,
        title: 'Spider-Man: Across the Spider-Verse',
        media_type: 'movie' as const,
        poster_path: '/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg',
    },
]

async function generateFakeNotifications(userId: string, clearFirst: boolean = false) {
    console.log(`🎬 Generating fake trending notifications for user: ${userId}\n`)

    // Clear existing notifications if requested
    if (clearFirst) {
        console.log('🗑️  Clearing existing notifications...')
        try {
            await deleteAllNotifications(userId)
            console.log('✅ Cleared existing notifications\n')
        } catch (error) {
            console.error('❌ Failed to clear notifications:', error)
        }
    }

    let successCount = 0
    let errorCount = 0

    for (const content of fakeTrendingItems) {
        try {
            const title = content.media_type === 'movie' ? content.title : content.name
            const mediaType = content.media_type === 'movie' ? 'Movie' : 'TV Show'
            const posterPath = content.poster_path

            await createNotification(userId, {
                type: 'trending_update',
                title: title, // Just the content title, no prefix
                message: `${title} (${mediaType}) just entered the trending list!`,
                contentId: content.id,
                mediaType: content.media_type, // Required for clicking to open content modal
                imageUrl: posterPath ? `https://image.tmdb.org/t/p/w500${posterPath}` : undefined,
                expiresIn: 7, // 7 days
            })

            console.log(`✅ Created notification for: ${title}`)
            successCount++
        } catch (error) {
            console.error(`❌ Failed to create notification for content ${content.id}:`, error)
            errorCount++
        }
    }

    console.log(`\n📊 Summary:`)
    console.log(`   ✅ Successfully created: ${successCount} notifications`)
    console.log(`   ❌ Failed: ${errorCount} notifications`)
    console.log(`\n🔔 Check your notification bell in the app!`)
}

// Get userId and options from command line args
const args = process.argv.slice(2)
const clearFlag = args.includes('--clear')
const userId = args.find((arg) => !arg.startsWith('--'))

if (!userId) {
    console.error('❌ Error: Please provide a userId')
    console.error('Usage: npx tsx scripts/generateFakeNotifications.ts <userId> [--clear]')
    console.error('Options:')
    console.error('  --clear    Clear existing notifications before creating new ones')
    process.exit(1)
}

generateFakeNotifications(userId, clearFlag)
    .then(() => {
        console.log('\n✨ Done!')
        process.exit(0)
    })
    .catch((error) => {
        console.error('\n❌ Script failed:', error)
        process.exit(1)
    })

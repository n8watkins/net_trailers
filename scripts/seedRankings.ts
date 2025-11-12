/**
 * Seed Rankings Script
 *
 * Creates example public rankings to populate the community page
 * Run with: npx ts-node scripts/seedRankings.ts
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { POPULAR_TAGS } from '../utils/popularTags'

// Initialize Firebase Admin
if (getApps().length === 0) {
    initializeApp({
        credential: cert({
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
    })
}

const db = getFirestore()

// Sample user data for seed rankings
const SEED_USERS = [
    {
        userId: 'seed_user_1',
        userName: 'MovieBuff23',
        userAvatar: 'https://i.pravatar.cc/150?img=1',
    },
    {
        userId: 'seed_user_2',
        userName: 'CinemaLover',
        userAvatar: 'https://i.pravatar.cc/150?img=2',
    },
    {
        userId: 'seed_user_3',
        userName: 'FilmCritic99',
        userAvatar: 'https://i.pravatar.cc/150?img=3',
    },
    {
        userId: 'seed_user_4',
        userName: 'SeriesFan',
        userAvatar: 'https://i.pravatar.cc/150?img=4',
    },
    {
        userId: 'seed_user_5',
        userName: 'PopcornTime',
        userAvatar: 'https://i.pravatar.cc/150?img=5',
    },
]

// Sample rankings to create
const SEED_RANKINGS = [
    {
        title: 'Top 10 MCU Movies',
        description: 'The best Marvel Cinematic Universe films ranked',
        tags: ['Marvel Cinematic Universe'],
        contentIds: [24428, 299534, 299536, 271110, 284054, 315635, 363088, 429617, 1771, 10138],
        itemCount: 10,
    },
    {
        title: 'Christopher Nolan Masterpieces',
        description: 'Ranking the genius works of Christopher Nolan',
        tags: ['Christopher Nolan', 'Psychological Thrillers'],
        contentIds: [27205, 155, 157336, 272, 49026, 1124, 77, 16869],
        itemCount: 8,
    },
    {
        title: 'Studio Ghibli Must-Watch',
        description: 'Essential Studio Ghibli films everyone should see',
        tags: ['Studio Ghibli'],
        contentIds: [129, 810, 4935, 128, 10515, 38142, 12429, 10681, 641, 27429],
        itemCount: 10,
    },
    {
        title: 'Horror Movies That Actually Scare',
        description: 'The most terrifying horror films',
        tags: ['Horror'],
        contentIds: [346364, 423108, 530385, 419430, 760741, 646385, 447332, 329865, 274, 745],
        itemCount: 10,
    },
    {
        title: 'Best Sci-Fi of All Time',
        description: 'Mind-bending science fiction masterpieces',
        tags: ['Sci-Fi'],
        contentIds: [603, 62, 12, 329865, 335984, 424, 1891, 424, 157336, 27205],
        itemCount: 10,
    },
    {
        title: 'Top Heist Movies',
        description: 'The greatest heist and crime films',
        tags: ['Heist & Crime'],
        contentIds: [161, 163, 298, 680, 238, 240, 107, 120467, 550, 769],
        itemCount: 10,
    },
    {
        title: 'Fantasy Adventures for the Whole Family',
        description: 'Epic fantasy films perfect for family viewing',
        tags: ['Fantasy Adventures'],
        contentIds: [120, 122, 121, 12444, 57158, 122917, 671, 672, 673, 674],
        itemCount: 10,
    },
    {
        title: 'James Bond Rankings',
        description: 'All-time best 007 films ranked',
        tags: ['James Bond 007', 'Action'],
        contentIds: [646, 37724, 36557, 370172, 253405, 667, 708, 657, 253, 668],
        itemCount: 10,
    },
    {
        title: 'Classic Hollywood Gold',
        description: 'Timeless classics from the golden age of cinema',
        tags: ['Classic Hollywood', 'Based on True Stories'],
        contentIds: [238, 240, 389, 429, 19404, 613, 311, 901, 510, 424],
        itemCount: 10,
    },
    {
        title: 'Sports Movies That Inspire',
        description: 'Motivational sports films that touch the heart',
        tags: ['Sports'],
        contentIds: [1366, 1367, 1368, 1369, 1370, 12444, 173995, 480530, 522240, 37257],
        itemCount: 10,
    },
]

async function fetchContentDetails(tmdbId: number, mediaType: 'movie' | 'tv' = 'movie') {
    const apiKey = process.env.TMDB_API_KEY
    if (!apiKey) {
        throw new Error('TMDB_API_KEY not found in environment variables')
    }

    const url = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${apiKey}`
    const response = await fetch(url)

    if (!response.ok) {
        console.warn(`Failed to fetch ${mediaType} ${tmdbId}: ${response.statusText}`)
        return null
    }

    const data = await response.json()

    return {
        id: data.id,
        title: data.title || data.name,
        poster_path: data.poster_path,
        media_type: mediaType,
        vote_average: data.vote_average,
        release_date: data.release_date || data.first_air_date,
    }
}

async function createSeedRanking(rankingData: (typeof SEED_RANKINGS)[0], userIndex: number) {
    const user = SEED_USERS[userIndex % SEED_USERS.length]
    const now = Date.now()

    // Fetch content details for each item
    console.log(`Fetching content for "${rankingData.title}"...`)
    const contentPromises = rankingData.contentIds.map((id) => fetchContentDetails(id))
    const contentResults = await Promise.all(contentPromises)
    const validContent = contentResults.filter((c) => c !== null)

    if (validContent.length === 0) {
        console.error(`No valid content found for "${rankingData.title}", skipping...`)
        return null
    }

    // Create ranked items
    const rankedItems = validContent.map((content, index) => ({
        position: index + 1,
        content: {
            id: content.id,
            title: content.title,
            poster_path: content.poster_path,
            media_type: content.media_type,
            vote_average: content.vote_average,
            release_date: content.release_date,
        },
        note: index === 0 ? 'Absolute favorite!' : index === 1 ? 'Close second' : undefined,
        addedAt: now,
    }))

    const ranking = {
        userId: user.userId,
        userName: user.userName,
        userAvatar: user.userAvatar,
        title: rankingData.title,
        description: rankingData.description,
        rankedItems,
        isPublic: true,
        itemCount: rankedItems.length,
        createdAt: now - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000), // Random within last week
        updatedAt: now,
        likes: Math.floor(Math.random() * 50),
        comments: Math.floor(Math.random() * 20),
        views: Math.floor(Math.random() * 200),
        contentIds: validContent.map((c) => c.id),
        contentTitles: validContent.map((c) => c.title),
        tags: rankingData.tags,
    }

    return ranking
}

async function seedRankings() {
    console.log('🌱 Starting rankings seed...\n')

    try {
        const rankingsRef = db.collection('rankings')

        for (let i = 0; i < SEED_RANKINGS.length; i++) {
            const rankingData = SEED_RANKINGS[i]
            console.log(
                `\n📝 Creating ranking ${i + 1}/${SEED_RANKINGS.length}: "${rankingData.title}"`
            )

            const ranking = await createSeedRanking(rankingData, i)

            if (ranking) {
                const docRef = await rankingsRef.add(ranking)
                console.log(`✅ Created ranking with ID: ${docRef.id}`)
            }

            // Rate limit: wait 250ms between requests
            await new Promise((resolve) => setTimeout(resolve, 250))
        }

        console.log('\n🎉 Seed complete! Created', SEED_RANKINGS.length, 'rankings.')
        console.log('\n📊 Tag distribution:')
        const tagCounts: Record<string, number> = {}
        SEED_RANKINGS.forEach((r) => {
            r.tags.forEach((tag) => {
                tagCounts[tag] = (tagCounts[tag] || 0) + 1
            })
        })
        Object.entries(tagCounts)
            .sort((a, b) => b[1] - a[1])
            .forEach(([tag, count]) => {
                console.log(`  - ${tag}: ${count} ranking${count > 1 ? 's' : ''}`)
            })
    } catch (error) {
        console.error('❌ Error seeding rankings:', error)
        throw error
    }
}

// Run the seed
seedRankings()
    .then(() => {
        console.log('\n✨ All done!')
        process.exit(0)
    })
    .catch((error) => {
        console.error('\n💥 Fatal error:', error)
        process.exit(1)
    })

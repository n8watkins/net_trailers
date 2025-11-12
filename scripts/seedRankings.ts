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

// Sample rankings to create - EXPANDED for interesting community display
const SEED_RANKINGS = [
    // MCU
    {
        title: 'Top 10 MCU Movies',
        description: 'The best Marvel Cinematic Universe films ranked',
        tags: ['Marvel Cinematic Universe'],
        contentIds: [24428, 299534, 299536, 271110, 284054, 315635, 363088, 429617, 1771, 10138],
        itemCount: 10,
    },
    {
        title: 'MCU Villains Ranked',
        description: 'Best antagonists in the Marvel Cinematic Universe',
        tags: ['Marvel Cinematic Universe', 'Action'],
        contentIds: [
            299536, 284054, 299534, 271110, 497698, 453395, 616037, 640146, 505642, 447365,
        ],
        itemCount: 10,
    },

    // Nolan
    {
        title: 'Christopher Nolan Masterpieces',
        description: 'Ranking the genius works of Christopher Nolan',
        tags: ['Christopher Nolan', 'Psychological Thrillers'],
        contentIds: [27205, 155, 157336, 272, 49026, 1124, 77, 16869],
        itemCount: 8,
    },

    // Studio Ghibli
    {
        title: 'Studio Ghibli Must-Watch',
        description: 'Essential Studio Ghibli films everyone should see',
        tags: ['Studio Ghibli'],
        contentIds: [129, 810, 4935, 128, 10515, 38142, 12429, 10681, 641, 27429],
        itemCount: 10,
    },
    {
        title: 'Ghibli for Beginners',
        description: 'Perfect introduction to Studio Ghibli magic',
        tags: ['Studio Ghibli'],
        contentIds: [129, 810, 4935, 128, 10515],
        itemCount: 5,
    },

    // Horror
    {
        title: 'Horror Movies That Actually Scare',
        description: 'The most terrifying horror films',
        tags: ['Horror'],
        contentIds: [346364, 423108, 530385, 419430, 760741, 646385, 447332, 329865, 274, 745],
        itemCount: 10,
    },
    {
        title: 'Supernatural Horror Classics',
        description: 'Ghost stories and supernatural terrors',
        tags: ['Horror', 'Mystery & Thriller'],
        contentIds: [423108, 745, 274, 419430, 760741, 346364, 530385],
        itemCount: 7,
    },

    // Sci-Fi
    {
        title: 'Best Sci-Fi of All Time',
        description: 'Mind-bending science fiction masterpieces',
        tags: ['Sci-Fi'],
        contentIds: [603, 62, 12, 329865, 335984, 157336, 27205, 1891, 122, 424],
        itemCount: 10,
    },
    {
        title: 'Space Exploration Epics',
        description: 'Journey through the cosmos',
        tags: ['Sci-Fi'],
        contentIds: [157336, 62, 335984, 131631, 286217, 329865],
        itemCount: 6,
    },

    // Heist & Crime
    {
        title: 'Top Heist Movies',
        description: 'The greatest heist and crime films',
        tags: ['Heist & Crime'],
        contentIds: [161, 163, 298, 680, 238, 240, 107, 120467, 550, 769],
        itemCount: 10,
    },
    {
        title: 'Tarantino Universe Ranked',
        description: 'All Tarantino films from best to brilliant',
        tags: ['Quentin Tarantino', 'Heist & Crime'],
        contentIds: [680, 24, 16869, 111, 72976, 106646, 429617, 238, 278],
        itemCount: 9,
    },

    // Fantasy
    {
        title: 'Fantasy Adventures for the Whole Family',
        description: 'Epic fantasy films perfect for family viewing',
        tags: ['Fantasy Adventures'],
        contentIds: [120, 122, 121, 12444, 57158, 122917, 671, 672, 673, 674],
        itemCount: 10,
    },
    {
        title: 'Middle-earth Journey',
        description: 'LOTR and Hobbit trilogy ranked',
        tags: ['Fantasy Adventures', 'Based on Books'],
        contentIds: [122, 120, 121, 122917, 57158, 12444],
        itemCount: 6,
    },
    {
        title: 'Harry Potter Ranked',
        description: 'All 8 magical films ordered by wizardry',
        tags: ['Fantasy Adventures', 'Based on Books'],
        contentIds: [674, 767, 673, 675, 671, 672, 12445, 12444],
        itemCount: 8,
    },

    // James Bond
    {
        title: 'James Bond Rankings',
        description: 'All-time best 007 films ranked',
        tags: ['James Bond 007', 'Action'],
        contentIds: [646, 37724, 36557, 370172, 253405, 667, 708, 657, 253, 668],
        itemCount: 10,
    },
    {
        title: 'Daniel Craig Bond Era',
        description: 'Ranking the Craig 007 films',
        tags: ['James Bond 007'],
        contentIds: [370172, 646, 37724, 253405, 36557],
        itemCount: 5,
    },

    // Classic Hollywood
    {
        title: 'Classic Hollywood Gold',
        description: 'Timeless classics from the golden age of cinema',
        tags: ['Classic Hollywood', 'Based on True Stories'],
        contentIds: [238, 240, 389, 429, 19404, 613, 311, 901, 510, 424],
        itemCount: 10,
    },

    // Sports
    {
        title: 'Sports Movies That Inspire',
        description: 'Motivational sports films that touch the heart',
        tags: ['Sports'],
        contentIds: [1366, 1367, 1368, 1369, 1370, 12444, 173995, 480530, 522240, 37257],
        itemCount: 10,
    },
    {
        title: 'Underdog Sports Stories',
        description: 'The greatest comeback stories in sports cinema',
        tags: ['Sports'],
        contentIds: [1366, 37257, 9502, 12162, 11808, 391698],
        itemCount: 6,
    },

    // Musicals
    {
        title: 'Modern Musical Masterpieces',
        description: 'Contemporary films that make you want to sing',
        tags: ['Musicals & Music'],
        contentIds: [313369, 360814, 12445, 109439, 508442, 284053, 326359, 383498],
        itemCount: 8,
    },

    // Anime
    {
        title: 'Anime Films Beyond Ghibli',
        description: 'Essential anime movies outside Studio Ghibli',
        tags: ['Anime'],
        contentIds: [129, 810, 4935, 128, 10515, 38142],
        itemCount: 6,
    },

    // DC Universe
    {
        title: 'DC Universe Ranked',
        description: 'Best superhero films from DC Comics',
        tags: ['DC Universe', 'Action'],
        contentIds: [155, 268896, 453405, 436270, 297761, 209112],
        itemCount: 6,
    },

    // True Crime
    {
        title: 'True Crime Thrillers',
        description: 'Based on real events that shocked the world',
        tags: ['True Crime', 'Based on True Stories'],
        contentIds: [489931, 680, 155, 106646, 1422, 13223, 14161, 205596],
        itemCount: 8,
    },

    // Comedy
    {
        title: 'Comedy Classics That Still Hit',
        description: 'Timeless comedies that never get old',
        tags: ['Comedy'],
        contentIds: [109439, 862, 863, 920, 597, 118, 10661, 9691],
        itemCount: 8,
    },
    {
        title: 'Dark Comedy Gems',
        description: 'Humor with a twisted edge',
        tags: ['Comedy', 'Psychological Thrillers'],
        contentIds: [120467, 107, 640, 496243, 24, 77],
        itemCount: 6,
    },

    // Romance
    {
        title: 'Modern Romance Favorites',
        description: 'Contemporary love stories that make you believe',
        tags: ['Romance'],
        contentIds: [313369, 522627, 559969, 398181, 576845, 502356],
        itemCount: 6,
    },

    // Fast & Furious
    {
        title: 'Fast & Furious Ranked',
        description: 'All F&F films by adrenaline level',
        tags: ['Fast & Furious', 'Action'],
        contentIds: [51497, 337339, 168259, 384018, 385687, 9799, 13804, 584],
        itemCount: 8,
    },

    // Pixar
    {
        title: 'Pixar Perfection',
        description: 'The animation studio that makes adults cry',
        tags: ['Pixar'],
        contentIds: [862, 863, 585, 508442, 284053, 10681, 920, 568124],
        itemCount: 8,
    },

    // Netflix Originals
    {
        title: 'Best Netflix Original Films',
        description: 'Netflix movies worth your time',
        tags: ['Netflix Originals'],
        contentIds: [376867, 489931, 447365, 531434, 573680, 564950],
        itemCount: 6,
    },

    // Oscars
    {
        title: 'Oscar Winners of the 2020s',
        description: 'Best Picture winners this decade',
        tags: ['Oscar Winners', 'Classic Hollywood'],
        contentIds: [496243, 508442, 545611, 615457, 640146],
        itemCount: 5,
    },

    // Mystery
    {
        title: 'Mystery Thrillers',
        description: 'Keep you guessing until the end',
        tags: ['Mystery & Thriller'],
        contentIds: [550, 77, 489931, 745, 274, 155, 106646, 680],
        itemCount: 8,
    },
    {
        title: 'Detective Stories',
        description: 'The best whodunits and investigations',
        tags: ['Mystery & Thriller'],
        contentIds: [274, 680, 106646, 155, 550, 77],
        itemCount: 6,
    },

    // Action
    {
        title: 'Pure Action Adrenaline',
        description: 'Non-stop action from start to finish',
        tags: ['Action'],
        contentIds: [383498, 370172, 646, 337339, 168259, 524434, 566525, 505642],
        itemCount: 8,
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

/**
 * Seed Rankings Script
 *
 * Creates example public rankings to populate the community page
 * Run with: npm run seed:rankings
 */

// IMPORTANT: Load environment variables FIRST
import './load-env'

import { db, auth } from '../firebase'
import { collection, setDoc, doc } from 'firebase/firestore'
import { signInWithEmailAndPassword } from 'firebase/auth'

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
    // MCU (tag.name = 'MCU')
    {
        title: 'Top 10 MCU Movies',
        description: 'The best Marvel Cinematic Universe films ranked',
        contentIds: [24428, 299534, 299536, 271110, 284054, 315635, 363088, 429617, 1771, 10138],
        itemCount: 10,
    },
    {
        title: 'MCU Villains Ranked',
        description: 'Best antagonists in the Marvel Cinematic Universe',
        contentIds: [
            299536, 284054, 299534, 271110, 497698, 453395, 616037, 640146, 505642, 447365,
        ],
        itemCount: 10,
    },

    // DC (tag.name = 'DC')
    {
        title: 'DC Universe Ranked',
        description: 'Best superhero films from DC Comics',
        contentIds: [155, 268896, 453405, 436270, 297761, 209112],
        itemCount: 6,
    },
    {
        title: 'Dark Knight Trilogy',
        description: "Christopher Nolan's Batman masterpiece",
        contentIds: [155, 49026, 272],
        itemCount: 3,
    },

    // Star Wars (tag.name = 'Star Wars')
    {
        title: 'Star Wars Movies Ranked',
        description: 'All Star Wars films from best to worst',
        contentIds: [1891, 11, 1892, 1895, 140607, 1893, 1894, 181808, 181812],
        itemCount: 9,
    },
    {
        title: 'Original Trilogy vs Prequels',
        description: 'Comparing the two Star Wars eras',
        contentIds: [11, 1891, 1892, 1893, 1894, 1895],
        itemCount: 6,
    },

    // Harry Potter (tag.name = 'Harry Potter')
    {
        title: 'Harry Potter Ranked',
        description: 'All 8 magical films ordered by wizardry',
        contentIds: [674, 767, 673, 675, 671, 672, 12445, 12444],
        itemCount: 8,
    },
    {
        title: 'Best Harry Potter Moments',
        description: 'Films with the most memorable scenes',
        contentIds: [673, 674, 12445, 767, 675],
        itemCount: 5,
    },

    // LOTR (tag.name = 'LOTR')
    {
        title: 'Middle-earth Journey',
        description: 'LOTR and Hobbit trilogy ranked',
        contentIds: [122, 120, 121, 122917, 57158, 49051],
        itemCount: 6,
    },
    {
        title: 'Lord of the Rings Trilogy',
        description: "Peter Jackson's masterpiece ranked",
        contentIds: [122, 121, 120],
        itemCount: 3,
    },

    // Pixar (tag.name = 'Pixar')
    {
        title: 'Pixar Perfection',
        description: 'The animation studio that makes adults cry',
        contentIds: [862, 863, 585, 508442, 284053, 10681, 920, 568124],
        itemCount: 8,
    },
    {
        title: 'Best Pixar Emotional Moments',
        description: 'Films that hit right in the feels',
        contentIds: [508442, 14160, 585, 150540, 355338],
        itemCount: 5,
    },

    // Disney Animation (tag.name = 'Disney Animation')
    {
        title: 'Disney Renaissance Classics',
        description: 'The golden age of Disney animation',
        contentIds: [8587, 10020, 10530, 10144, 12124],
        itemCount: 5,
    },
    {
        title: 'Modern Disney Favorites',
        description: 'Best Disney animated films of the 2010s-2020s',
        contentIds: [109445, 150540, 568124, 329996, 38757],
        itemCount: 5,
    },

    // Horror (tag.name = 'Horror')
    {
        title: 'Horror Movies That Actually Scare',
        description: 'The most terrifying horror films',
        contentIds: [346364, 419430, 530385, 447332, 760741, 646385, 694, 539],
        itemCount: 8,
    },
    {
        title: 'Modern Horror Classics',
        description: 'Best horror films of the 2010s-2020s',
        contentIds: [419430, 496243, 530385, 447332, 521777, 891699],
        itemCount: 6,
    },

    // Sci-Fi (tag.name = 'Sci-Fi')
    {
        title: 'Best Sci-Fi of All Time',
        description: 'Mind-bending science fiction masterpieces',
        contentIds: [603, 157336, 335984, 329865, 27205, 440021, 693134],
        itemCount: 7,
    },
    {
        title: 'Space Exploration Epics',
        description: 'Journey through the cosmos',
        contentIds: [157336, 329865, 19995, 76600, 693134],
        itemCount: 5,
    },

    // Anime (tag.name = 'Anime')
    {
        title: 'Best Anime Films',
        description: 'Essential anime movies everyone should see',
        contentIds: [129, 372058, 508965, 584828, 4935, 128],
        itemCount: 6,
    },
    {
        title: 'Anime Films for Beginners',
        description: 'Perfect introduction to anime cinema',
        contentIds: [129, 4935, 128, 372058],
        itemCount: 4,
    },

    // True Crime (tag.name = 'True Crime')
    {
        title: 'True Crime Thrillers',
        description: 'Based on real events that shocked the world',
        contentIds: [19404, 278, 106646, 13223, 14161, 205596],
        itemCount: 6,
    },
    {
        title: 'Crime Drama Essentials',
        description: 'The greatest crime dramas ever made',
        contentIds: [238, 240, 769, 680, 278],
        itemCount: 5,
    },

    // Comedy (tag.name = 'Comedy')
    {
        title: 'Comedy Classics That Still Hit',
        description: 'Timeless comedies that never get old',
        contentIds: [293660, 383498, 13475, 102651, 107, 1091],
        itemCount: 6,
    },
    {
        title: 'Best Comedy Duos',
        description: 'Films with iconic comedic partnerships',
        contentIds: [293660, 383498, 762430, 102651, 107],
        itemCount: 5,
    },

    // Romance (tag.name = 'Romance')
    {
        title: 'Modern Romance Favorites',
        description: 'Contemporary love stories that make you believe',
        contentIds: [597, 11036, 194662, 381284],
        itemCount: 4,
    },
    {
        title: 'Romantic Comedies Ranked',
        description: 'Feel-good rom-coms for any mood',
        contentIds: [194662, 413594, 588228],
        itemCount: 3,
    },

    // Action (tag.name = 'Action')
    {
        title: 'Pure Action Adrenaline',
        description: 'Non-stop action from start to finish',
        contentIds: [245891, 324552, 458156, 603692, 361743, 269149],
        itemCount: 6,
    },
    {
        title: 'John Wick Series Ranked',
        description: 'The ultimate action franchise',
        contentIds: [603692, 458156, 324552, 245891],
        itemCount: 4,
    },

    // Netflix (tag.name = 'Netflix')
    {
        title: 'Best Netflix Original Films',
        description: 'Netflix movies worth your time',
        contentIds: [419430, 452832, 762430, 661374, 631842, 447362],
        itemCount: 6,
    },
    {
        title: 'Netflix Hidden Gems',
        description: 'Underrated Netflix originals you might have missed',
        contentIds: [661374, 447362, 568124, 631842],
        itemCount: 4,
    },

    // Nolan (tag.name = 'Nolan')
    {
        title: 'Christopher Nolan Masterpieces',
        description: 'Ranking the genius works of Christopher Nolan',
        contentIds: [27205, 155, 157336, 872585, 577922, 1124, 77],
        itemCount: 7,
    },

    // Ghibli (tag.name = 'Ghibli')
    {
        title: 'Studio Ghibli Must-Watch',
        description: 'Essential Studio Ghibli films everyone should see',
        contentIds: [129, 810, 4935, 128, 10515, 38142, 12429, 10681],
        itemCount: 8,
    },
    {
        title: 'Ghibli for Beginners',
        description: 'Perfect introduction to Studio Ghibli magic',
        contentIds: [129, 810, 4935, 128, 10515],
        itemCount: 5,
    },

    // Tarantino (tag.name = 'Tarantino')
    {
        title: 'Tarantino Universe Ranked',
        description: 'All Tarantino films from best to brilliant',
        contentIds: [680, 24, 16869, 68718, 273248, 466272, 641],
        itemCount: 7,
    },

    // 007 (tag.name = '007')
    {
        title: 'James Bond Rankings',
        description: 'All-time best 007 films ranked',
        contentIds: [646, 37724, 36557, 370172, 253405, 667, 708, 657, 253, 668],
        itemCount: 10,
    },
    {
        title: 'Daniel Craig Bond Era',
        description: 'Ranking the Craig 007 films',
        contentIds: [370172, 646, 37724, 253405, 36557],
        itemCount: 5,
    },

    // Fantasy (tag.name = 'Fantasy')
    {
        title: 'Fantasy Adventures for the Whole Family',
        description: 'Epic fantasy films perfect for family viewing',
        contentIds: [120, 122, 121, 671, 672, 673, 674, 10191],
        itemCount: 8,
    },

    // Thriller (tag.name = 'Thriller')
    {
        title: 'Mystery Thrillers',
        description: 'Keep you guessing until the end',
        contentIds: [550, 77, 489931, 745, 274, 155, 106646, 680],
        itemCount: 8,
    },
    {
        title: 'Psychological Thrillers',
        description: 'Mind-bending suspense',
        contentIds: [77, 745, 274, 550, 489931],
        itemCount: 5,
    },

    // Heist (tag.name = 'Heist')
    {
        title: 'Top Heist Movies',
        description: 'The greatest heist and crime films',
        contentIds: [161, 163, 298, 680, 107, 370172, 207703],
        itemCount: 7,
    },

    // Oscars (tag.name = 'Oscars')
    {
        title: 'Oscar Winners of the 2020s',
        description: 'Best Picture winners this decade',
        contentIds: [872585, 792307, 505642, 381284],
        itemCount: 4,
    },

    // Classic Hollywood (tag.name = 'Classic Hollywood')
    {
        title: 'Classic Hollywood Gold',
        description: 'Timeless classics from the golden age of cinema',
        contentIds: [238, 240, 389, 429, 19404, 613, 311, 424],
        itemCount: 8,
    },

    // Sports (tag.name = 'Sports')
    {
        title: 'Sports Movies That Inspire',
        description: 'Motivational sports films that touch the heart',
        contentIds: [1366, 173995, 480530, 522240, 37257, 391698],
        itemCount: 6,
    },

    // Musicals (tag.name = 'Musicals')
    {
        title: 'Modern Musical Masterpieces',
        description: 'Contemporary films that make you want to sing',
        contentIds: [313369, 360814, 109439, 508442, 284053],
        itemCount: 5,
    },

    // Fast & Furious (tag.name = 'Fast & Furious')
    {
        title: 'Fast & Furious Ranked',
        description: 'All F&F films by adrenaline level',
        contentIds: [51497, 337339, 168259, 384018, 385687, 9799],
        itemCount: 6,
    },

    // Based on Books (tag.name = 'Based on Books')
    {
        title: 'Best Book Adaptations',
        description: 'When the movie does the book justice',
        contentIds: [120, 671, 278, 13, 440021],
        itemCount: 5,
    },

    // Biographical (tag.name = 'Biographical')
    {
        title: 'Biographical Films That Inspire',
        description: 'True stories that shaped history',
        contentIds: [872585, 424, 13223, 205596, 314365, 381284],
        itemCount: 6,
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
        title: data.title || data.name || 'Unknown',
        poster_path: data.poster_path || '',
        media_type: mediaType,
        vote_average: data.vote_average || 0,
        release_date: data.release_date || data.first_air_date || '',
    }
}

async function createSeedRanking(
    rankingData: (typeof SEED_RANKINGS)[0],
    userIndex: number,
    authenticatedUserId: string,
    rankingId: string
) {
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
    const rankedItems = validContent.map((content, index) => {
        const item: any = {
            position: index + 1,
            content: {
                id: content.id,
                title: content.title,
                poster_path: content.poster_path,
                media_type: content.media_type,
                vote_average: content.vote_average,
                release_date: content.release_date,
            },
            addedAt: now,
        }
        // Only add note for first two items
        if (index === 0) {
            item.note = 'Absolute favorite!'
        } else if (index === 1) {
            item.note = 'Close second'
        }
        return item
    })

    // Create ranking data with the provided ID
    const ranking = {
        id: rankingId, // Use the provided ID
        userId: authenticatedUserId, // Use authenticated user's ID for permissions
        userName: user.userName, // Use varied display name
        userAvatar: user.userAvatar, // Use varied display avatar
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
    }

    return ranking
}

async function seedRankings() {
    console.log('🌱 Starting rankings seed...\n')

    try {
        // Authenticate with test user
        console.log('🔐 Authenticating...')
        const email = 'test@nettrailer.dev'
        const password = 'TestPassword123!'

        const userCredential = await signInWithEmailAndPassword(auth, email, password)
        const userId = userCredential.user.uid
        console.log(`✅ Authenticated as: ${email} (${userId})\n`)

        const rankingsRef = collection(db, 'rankings')

        for (let i = 0; i < SEED_RANKINGS.length; i++) {
            const rankingData = SEED_RANKINGS[i]
            console.log(
                `\n📝 Creating ranking ${i + 1}/${SEED_RANKINGS.length}: "${rankingData.title}"`
            )

            // Generate a document reference (this creates the ID)
            const docRef = doc(rankingsRef)
            const rankingId = docRef.id

            // Create ranking with the predetermined ID
            const ranking = await createSeedRanking(rankingData, i, userId, rankingId)

            if (ranking) {
                // Create document with the predetermined ID
                await setDoc(docRef, ranking)
                console.log(`✅ Created ranking with ID: ${rankingId}`)
            }

            // Rate limit: wait 250ms between requests
            await new Promise((resolve) => setTimeout(resolve, 250))
        }

        console.log('\n🎉 Seed complete! Created', SEED_RANKINGS.length, 'rankings.')
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

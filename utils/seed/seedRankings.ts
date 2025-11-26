/**
 * Seed Rankings
 */

import { Movie, TVShow, Content } from '../../typings'
import { sampleMovies, sampleTVShows } from './sampleContent'

export interface SeedRankingsOptions {
    userId: string
    userName: string
    userAvatar?: string
}

const RANKING_TEMPLATES = [
    {
        title: 'Christopher Nolan: A Masterclass',
        description: 'Mind-bending films from the legendary director',
        movieIndices: [8, 3, 18], // Inception, The Dark Knight, Interstellar
        tvIndices: [],
        tags: ['christopher-nolan', 'sci-fi', 'mystery-thriller'],
    },
    {
        title: 'Best of Studio Ghibli & Anime',
        description: 'The most beautiful animated films from Japan',
        movieIndices: [9, 7], // Spirited Away, Your Name
        tvIndices: [2, 15], // Arcane, One Piece
        tags: ['studio-ghibli', 'anime'],
    },
    {
        title: 'Middle-earth: The Complete Journey',
        description: 'From the Shire to Mordor - the ultimate fantasy epic',
        movieIndices: [17, 10], // LOTR: Fellowship, LOTR: Return of the King
        tvIndices: [17], // Rings of Power
        tags: ['lotr', 'fantasy'],
    },
    {
        title: 'True Crime & Criminal Empires',
        description: 'From mobsters to meth empires - the best crime stories',
        movieIndices: [5, 13, 1], // The Godfather, GoodFellas, Pulp Fiction
        tvIndices: [0, 6, 18], // Breaking Bad, Better Call Saul, Peaky Blinders
        tags: ['true-crime', 'heist-crime', 'tarantino'],
    },
    {
        title: 'Oscar-Winning Classics',
        description: 'Academy Award winners that defined cinema',
        movieIndices: [4, 6, 2, 10, 23], // Shawshank, Schindler's, Forrest Gump, LOTR:ROTK, Cuckoo's Nest
        tvIndices: [],
        tags: ['oscar-winners', 'classic-hollywood'],
    },
    {
        title: 'Marvel Cinematic Universe Favorites',
        description: 'Earth\'s mightiest heroes in action',
        movieIndices: [14, 15], // The Avengers, Infinity War
        tvIndices: [5], // WandaVision
        tags: ['mcu', 'action'],
    },
    {
        title: 'Horror Nights',
        description: 'Terrifying tales that will keep you up at night',
        movieIndices: [20], // Psycho
        tvIndices: [8, 11, 14, 7], // Walking Dead, Supernatural, Stranger Things, The Last of Us
        tags: ['horror', 'mystery-thriller'],
    },
    {
        title: 'Sci-Fi Mind Benders',
        description: 'Science fiction that expands your mind',
        movieIndices: [16, 8, 18], // The Matrix, Inception, Interstellar
        tvIndices: [3, 14], // Rick and Morty, Stranger Things
        tags: ['sci-fi', 'netflix-originals'],
    },
]

export async function seedRankings(options: SeedRankingsOptions): Promise<void> {
    const { userId, userName, userAvatar } = options

    console.log('  🏆 Creating sample rankings')

    const { useRankingStore } = await import('../../stores/rankingStore')

    // Load existing rankings
    await useRankingStore.getState().loadUserRankings(userId)
    const existingRankings = useRankingStore.getState().rankings
    const existingTitles = new Set(existingRankings.map((r) => r.title))

    for (const template of RANKING_TEMPLATES) {
        if (existingTitles.has(template.title)) {
            console.log(`    ⏭️  Skipping duplicate ranking: ${template.title}`)
            continue
        }

        // Build items from indices
        const items: Content[] = [
            ...template.movieIndices.map((i) => sampleMovies[i]).filter(Boolean),
            ...template.tvIndices.map((i) => sampleTVShows[i]).filter(Boolean),
        ]

        if (items.length === 0) {
            console.warn(`    ⚠️ No valid items for: ${template.title}`)
            continue
        }

        try {
            const rankingId = await useRankingStore
                .getState()
                .createRanking(userId, userName, userAvatar, {
                    title: template.title,
                    description: template.description,
                    itemCount: items.length,
                    tags: template.tags,
                })

            if (!rankingId) {
                throw new Error('No ranking ID returned')
            }

            await useRankingStore.getState().updateRanking(userId, {
                id: rankingId,
                rankedItems: items.map((item, index) => ({
                    position: index + 1,
                    content: item as Movie | TVShow,
                    note:
                        index === 0
                            ? 'Absolute masterpiece!'
                            : index === 1
                              ? 'Incredible!'
                              : undefined,
                    addedAt: Date.now(),
                })),
                itemCount: items.length,
            })

            console.log(`    ✅ Created ranking: ${template.title}`)
            await new Promise((resolve) => setTimeout(resolve, 200))
        } catch (error) {
            console.error(`    ❌ Failed to create ranking "${template.title}":`, error)
        }
    }
}

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
        title: 'Top 10 Mind-Bending Movies',
        description: 'Films that make you question reality and challenge your perception',
        movieIndices: [8, 16, 0, 18, 3, 20, 19, 24, 6, 11],
        tvIndices: [],
        tags: ['Psychological', 'Thrillers', 'Sci-Fi'],
    },
    {
        title: 'Best Animated Masterpieces',
        description: 'The most beautiful and emotionally powerful animated films ever made',
        movieIndices: [9, 7],
        tvIndices: [0, 1, 2],
        tags: ['Animation', 'Anime', 'Family'],
    },
    {
        title: 'Epic Sagas You Must Watch',
        description: 'Long-form storytelling at its finest - prepare for an emotional journey',
        movieIndices: [10, 17, 5, 4, 13, 6, 11, 18],
        tvIndices: [],
        tags: ['Epic', 'Drama', 'Adventure'],
    },
    {
        title: 'Best TV Shows of All Time',
        description: 'Television shows that changed the game',
        movieIndices: [],
        tvIndices: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
        tags: ['TV', 'Drama', 'Must-Watch'],
    },
    {
        title: 'Classic Cinema Essentials',
        description: 'Timeless classics every film lover should see',
        movieIndices: [5, 4, 19, 25, 22, 20, 6, 12],
        tvIndices: [],
        tags: ['Classics', 'Film History', 'Masterpieces'],
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

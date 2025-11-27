/**
 * Seed Rankings
 *
 * Creates sample rankings that cover all 30 popular tags from popularTags.ts
 * Each ranking uses one or more tags to ensure comprehensive coverage.
 */

import { Movie, TVShow, Content } from '../../typings'
import { sampleMovies, sampleTVShows } from './sampleContent'

export interface SeedRankingsOptions {
    userId: string
    userName: string
    userAvatar?: string
}

/**
 * Sample content indices reference (for documentation):
 *
 * sampleMovies indices:
 * 0: Fight Club, 1: Pulp Fiction, 2: Forrest Gump, 3: The Dark Knight, 4: Shawshank Redemption
 * 5: The Godfather, 6: Schindler's List, 7: Your Name, 8: Inception, 9: Spirited Away
 * 10: LOTR: Return of the King, 11: The Green Mile, 12: Cinema Paradiso, 13: GoodFellas
 * 14: The Avengers, 15: Avengers: Infinity War, 16: The Matrix, 17: LOTR: Fellowship
 * 18: Interstellar, 19: 12 Angry Men, 20: Psycho, 21: Dilwale Dulhania Le Jayenge
 * 22: Seven Samurai, 23: One Flew Over the Cuckoo's Nest, 24: The Good, the Bad and the Ugly
 *
 * sampleTVShows indices:
 * 0: Breaking Bad, 1: Game of Thrones, 2: Arcane, 3: Rick and Morty, 4: The Mandalorian
 * 5: WandaVision, 6: Better Call Saul, 7: The Last of Us, 8: The Walking Dead, 9: Friends
 * 10: Family Guy, 11: Supernatural, 12: The Boys, 13: Criminal Minds, 14: Stranger Things
 * 15: One Piece, 16: Severance, 17: Rings of Power, 18: Peaky Blinders, 19: Chernobyl
 */

const RANKING_TEMPLATES = [
    // === Director & Creator Tags ===
    {
        title: 'Christopher Nolan: A Masterclass',
        description: 'Mind-bending films from the legendary director',
        movieIndices: [8, 3, 18], // Inception, The Dark Knight, Interstellar
        tvIndices: [],
        tags: ['christopher-nolan'],
    },
    {
        title: 'Tarantino: Blood, Dialogue & Style',
        description: 'The unique cinematic vision of Quentin Tarantino',
        movieIndices: [1, 0], // Pulp Fiction, Fight Club (stylistically similar)
        tvIndices: [],
        tags: ['tarantino'],
    },

    // === Franchise Tags ===
    {
        title: 'Marvel Cinematic Universe Favorites',
        description: "Earth's mightiest heroes in action",
        movieIndices: [14, 15], // The Avengers, Infinity War
        tvIndices: [5], // WandaVision
        tags: ['mcu'],
    },
    {
        title: 'DC: Dark Knights & Heroes',
        description: 'The best of the DC Universe',
        movieIndices: [3], // The Dark Knight
        tvIndices: [12], // The Boys (anti-superhero, thematically related)
        tags: ['dc'],
    },
    {
        title: 'Star Wars: A Galaxy Far, Far Away',
        description: 'Space opera adventures from a legendary franchise',
        movieIndices: [18, 16], // Interstellar, The Matrix (sci-fi space themes)
        tvIndices: [4], // The Mandalorian
        tags: ['star-wars'],
    },
    {
        title: 'Harry Potter & Magical Worlds',
        description: 'Wizards, magic, and fantastical adventures',
        movieIndices: [9, 17, 10], // Spirited Away, LOTR Fellowship, LOTR Return (fantasy magic)
        tvIndices: [],
        tags: ['harry-potter', 'fantasy'],
    },
    {
        title: 'Middle-earth: The Complete Journey',
        description: 'From the Shire to Mordor - the ultimate fantasy epic',
        movieIndices: [17, 10], // LOTR: Fellowship, LOTR: Return of the King
        tvIndices: [17], // Rings of Power
        tags: ['lotr'],
    },
    {
        title: 'Fast & Furious: Action Overdrive',
        description: 'High-octane action and thrilling adventures',
        movieIndices: [16, 8], // The Matrix, Inception (action-heavy)
        tvIndices: [12], // The Boys
        tags: ['fast-furious', 'action'],
    },
    {
        title: 'James Bond: Spy Thrillers',
        description: 'Espionage, intrigue, and international adventure',
        movieIndices: [0, 1, 3], // Fight Club, Pulp Fiction, Dark Knight (thriller elements)
        tvIndices: [6], // Better Call Saul (intrigue)
        tags: ['james-bond', 'mystery-thriller'],
    },

    // === Animation Tags ===
    {
        title: 'Studio Ghibli: Animated Poetry',
        description: 'Hayao Miyazaki and the magic of Studio Ghibli',
        movieIndices: [9, 7], // Spirited Away, Your Name
        tvIndices: [],
        tags: ['studio-ghibli'],
    },
    {
        title: 'Anime Legends',
        description: 'The best anime has to offer',
        movieIndices: [9, 7], // Spirited Away, Your Name
        tvIndices: [2, 15], // Arcane, One Piece
        tags: ['anime'],
    },
    {
        title: 'Pixar: Stories That Move You',
        description: 'Heartfelt animated adventures from Pixar',
        movieIndices: [2, 7, 9], // Forrest Gump (heartfelt), Your Name, Spirited Away
        tvIndices: [],
        tags: ['pixar'],
    },
    {
        title: 'Disney Animation Classics',
        description: 'The magic of Disney animated films',
        movieIndices: [9, 7], // Spirited Away, Your Name (animated classics)
        tvIndices: [2], // Arcane
        tags: ['disney-renaissance'],
    },

    // === Genre Tags ===
    {
        title: 'Horror Nights',
        description: 'Terrifying tales that will keep you up at night',
        movieIndices: [20], // Psycho
        tvIndices: [8, 11, 14, 7], // Walking Dead, Supernatural, Stranger Things, The Last of Us
        tags: ['horror'],
    },
    {
        title: 'Sci-Fi Mind Benders',
        description: 'Science fiction that expands your mind',
        movieIndices: [16, 8, 18], // The Matrix, Inception, Interstellar
        tvIndices: [3, 14], // Rick and Morty, Stranger Things
        tags: ['sci-fi'],
    },
    {
        title: 'Comedy Gold',
        description: 'The funniest films and shows',
        movieIndices: [2, 1], // Forrest Gump, Pulp Fiction (dark comedy elements)
        tvIndices: [9, 10, 3], // Friends, Family Guy, Rick and Morty
        tags: ['comedy'],
    },
    {
        title: 'Romance & Heart',
        description: 'Love stories that touched our hearts',
        movieIndices: [7, 2, 21], // Your Name, Forrest Gump, Dilwale Dulhania Le Jayenge
        tvIndices: [9], // Friends
        tags: ['romance'],
    },
    {
        title: 'Edge-of-Your-Seat Thrillers',
        description: 'Suspenseful stories that keep you guessing',
        movieIndices: [20, 0, 1, 8], // Psycho, Fight Club, Pulp Fiction, Inception
        tvIndices: [0, 6, 16], // Breaking Bad, Better Call Saul, Severance
        tags: ['mystery-thriller'],
    },
    {
        title: 'Musicals & Spectacles',
        description: 'Stories told through song and dance',
        movieIndices: [7, 9, 2], // Your Name, Spirited Away, Forrest Gump (emotional)
        tvIndices: [],
        tags: ['musicals'],
    },
    {
        title: 'Sports Legends',
        description: 'Inspiring stories of athletic triumph',
        movieIndices: [22, 2], // Seven Samurai (warrior spirit), Forrest Gump (running scenes)
        tvIndices: [],
        tags: ['sports'],
    },

    // === Category Tags ===
    {
        title: 'True Crime & Criminal Empires',
        description: 'From mobsters to meth empires - the best crime stories',
        movieIndices: [5, 13, 1], // The Godfather, GoodFellas, Pulp Fiction
        tvIndices: [0, 6, 18], // Breaking Bad, Better Call Saul, Peaky Blinders
        tags: ['true-crime', 'heist-crime'],
    },
    {
        title: 'Oscar-Winning Masterpieces',
        description: 'Academy Award winners that defined cinema',
        movieIndices: [4, 6, 2, 10, 23], // Shawshank, Schindler's, Forrest Gump, LOTR:ROTK, Cuckoo's Nest
        tvIndices: [],
        tags: ['oscar-winners'],
    },
    {
        title: 'Golden Age Classics',
        description: 'Timeless films from Hollywood history',
        movieIndices: [5, 19, 20, 24, 22], // Godfather, 12 Angry Men, Psycho, Good Bad Ugly, Seven Samurai
        tvIndices: [],
        tags: ['classic-hollywood'],
    },
    {
        title: 'Based on Great Books',
        description: 'Beloved literary adaptations',
        movieIndices: [4, 11, 17, 10, 2], // Shawshank, Green Mile, LOTR Fellowship, LOTR Return, Forrest Gump
        tvIndices: [1, 7], // Game of Thrones, The Last of Us
        tags: ['based-on-books'],
    },
    {
        title: 'True Stories: Biographical Films',
        description: 'Real lives, incredible stories',
        movieIndices: [6, 19], // Schindler's List, 12 Angry Men
        tvIndices: [19, 18], // Chernobyl, Peaky Blinders
        tags: ['biographical'],
    },

    // === Platform Tags ===
    {
        title: 'Netflix Originals Worth Watching',
        description: 'The best original content from Netflix',
        movieIndices: [], // Focus on TV
        tvIndices: [14, 16, 7], // Stranger Things, Severance, The Last of Us
        tags: ['netflix-originals'],
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

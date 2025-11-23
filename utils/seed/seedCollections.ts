/**
 * Seed Collections
 */

import { sampleMovies, sampleTVShows } from './sampleContent'

export interface SeedCollectionsOptions {
    userId: string
    isGuest: boolean
}

const COLLECTION_TEMPLATES = [
    {
        name: 'Epic Sci-Fi Adventures',
        emoji: '🚀',
        color: '#3B82F6',
        genres: ['scifi', 'adventure'],
        movieIndices: [8, 16, 18],
        tvIndices: [3],
        displayAsRow: true, // Show on home page
    },
    {
        name: 'Mind-Bending Thrillers',
        emoji: '🧠',
        color: '#8B5CF6',
        genres: ['thriller', 'drama'],
        movieIndices: [0, 1, 20, 19],
        tvIndices: [],
        displayAsRow: true, // Show on home page
    },
    {
        name: 'Animated Masterpieces',
        emoji: '🎨',
        color: '#EC4899',
        genres: ['animation', 'fantasy'],
        movieIndices: [7, 9],
        tvIndices: [2, 3, 15],
        displayAsRow: true, // Show on home page
    },
    {
        name: 'Crime & Drama Classics',
        emoji: '🎭',
        color: '#EF4444',
        genres: ['crime', 'drama'],
        movieIndices: [5, 4, 13],
        tvIndices: [0],
        displayAsRow: false, // Hidden from home page
    },
    {
        name: 'Epic Fantasy Sagas',
        emoji: '⚔️',
        color: '#10B981',
        genres: ['fantasy', 'adventure'],
        movieIndices: [10, 17],
        tvIndices: [1, 17],
        displayAsRow: false, // Hidden from home page
    },
    {
        name: 'Marvel Universe',
        emoji: '🦸',
        color: '#F59E0B',
        genres: ['action', 'scifi'],
        movieIndices: [14, 15],
        tvIndices: [5, 4],
        displayAsRow: false, // Hidden from home page
    },
    {
        name: 'Comfort Classics',
        emoji: '☕',
        color: '#06B6D4',
        genres: ['drama', 'comedy'],
        movieIndices: [2, 12],
        tvIndices: [9, 14],
        displayAsRow: false, // Hidden from home page
    },
    {
        name: 'Dark & Mysterious',
        emoji: '🌙',
        color: '#6366F1',
        genres: ['mystery', 'horror'],
        movieIndices: [],
        tvIndices: [8, 11, 16, 14],
        displayAsRow: false, // Hidden from home page
    },
]

export async function seedCollections(options: SeedCollectionsOptions): Promise<void> {
    const { userId, isGuest } = options

    console.log('  📚 Creating sample collections')

    const { useAuthStore } = await import('../../stores/authStore')
    const { useGuestStore } = await import('../../stores/guestStore')

    const existingLists = isGuest
        ? useGuestStore.getState().userCreatedWatchlists
        : useAuthStore.getState().userCreatedWatchlists
    const existingNames = new Set(existingLists.map((list) => list.name))

    for (const template of COLLECTION_TEMPLATES) {
        if (existingNames.has(template.name)) {
            console.log(`    ⏭️  Collection already exists: ${template.name}`)
            continue
        }

        // Get items from indices
        const items = [
            ...template.movieIndices.map((i) => sampleMovies[i]).filter(Boolean),
            ...template.tvIndices.map((i) => sampleTVShows[i]).filter(Boolean),
        ]

        const createFn = isGuest
            ? useGuestStore.getState().createList
            : useAuthStore.getState().createList

        const listId = await createFn({
            name: template.name,
            emoji: template.emoji,
            color: template.color,
            collectionType: 'manual',
            genres: template.genres,
            mediaType: 'both',
            displayAsRow: template.displayAsRow,
            canGenerateMore: true, // Enable infinite scroll for seeded collections
        })

        console.log(`    ✅ Created collection: ${template.name}`)

        const addToListFn = isGuest
            ? useGuestStore.getState().addToList
            : useAuthStore.getState().addToList

        for (const item of items) {
            await addToListFn(listId, item)
        }

        await new Promise((resolve) => setTimeout(resolve, 10))
    }
}

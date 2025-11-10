/**
 * Seed Data Utility
 *
 * Populates the app with sample data for testing:
 * - Liked movies and TV shows
 * - Hidden movies and TV shows
 * - Custom collections
 * - Watch history
 */

import { Movie, TVShow } from '../typings'

// Sample movies for seeding
const sampleMovies: Movie[] = [
    {
        id: 550,
        title: 'Fight Club',
        overview:
            'A ticking-time-bomb insomniac and a slippery soap salesman channel primal male aggression into a shocking new form of therapy.',
        poster_path: '/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg',
        backdrop_path: '/hZkgoQYus5vegHoetLkCJzb17zJ.jpg',
        release_date: '1999-10-15',
        vote_average: 8.4,
        vote_count: 26280,
        genre_ids: [18],
        media_type: 'movie',
    },
    {
        id: 680,
        title: 'Pulp Fiction',
        overview:
            "A burger-loving hit man, his philosophical partner, a drug-addled gangster's moll and a washed-up boxer converge in this sprawling, comedic crime caper.",
        poster_path: '/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg',
        backdrop_path: '/4cDFJr4HnXN5AdPw4AKrmLlMWdO.jpg',
        release_date: '1994-09-10',
        vote_average: 8.5,
        vote_count: 26711,
        genre_ids: [53, 80],
        media_type: 'movie',
    },
    {
        id: 13,
        title: 'Forrest Gump',
        overview:
            'A man with a low IQ has accomplished great things in his life and been present during significant historic events—in each case, far exceeding what anyone imagined he could do.',
        poster_path: '/arw2vcBveWOVZr6pxd9XTd1TdQa.jpg',
        backdrop_path: '/3h1JZGDhZ8nzxdgvkxha0qBqi05.jpg',
        release_date: '1994-07-06',
        vote_average: 8.5,
        vote_count: 25844,
        genre_ids: [35, 18, 10749],
        media_type: 'movie',
    },
    {
        id: 155,
        title: 'The Dark Knight',
        overview:
            'Batman raises the stakes in his war on crime. With the help of Lt. Jim Gordon and District Attorney Harvey Dent, Batman sets out to dismantle the remaining criminal organizations.',
        poster_path: '/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
        backdrop_path: '/hqkIcbrOHL86UncnHIsHVcVmzue.jpg',
        release_date: '2008-07-16',
        vote_average: 8.5,
        vote_count: 31233,
        genre_ids: [18, 28, 80, 53],
        media_type: 'movie',
    },
    {
        id: 278,
        title: 'The Shawshank Redemption',
        overview:
            'Imprisoned in the 1940s for the double murder of his wife and her lover, upstanding banker Andy Dufresne begins a new life at the Shawshank prison.',
        poster_path: '/9cqNxx0GxF0bflZmeSMuL5tnGzr.jpg',
        backdrop_path: '/kXfqcdQKsToO0OUXHcrrNCHDBzO.jpg',
        release_date: '1994-09-23',
        vote_average: 8.7,
        vote_count: 24970,
        genre_ids: [18, 80],
        media_type: 'movie',
    },
    {
        id: 238,
        title: 'The Godfather',
        overview:
            'Spanning the years 1945 to 1955, a chronicle of the fictional Italian-American Corleone crime family.',
        poster_path: '/3bhkrj58Vtu7enYsRolD1fZdja1.jpg',
        backdrop_path: '/tmU7GeKVybMWFButWEGl2M4GeiP.jpg',
        release_date: '1972-03-14',
        vote_average: 8.7,
        vote_count: 18491,
        genre_ids: [18, 80],
        media_type: 'movie',
    },
    {
        id: 424,
        title: "Schindler's List",
        overview:
            'The true story of how businessman Oskar Schindler saved over a thousand Jewish lives from the Nazis while they worked as slaves in his factory during World War II.',
        poster_path: '/sF1U4EUQS8YHUYjNl3pMGNIQyr0.jpg',
        backdrop_path: '/loRmRzQXZeqG78TqZuyvSlEQfZb.jpg',
        release_date: '1993-12-15',
        vote_average: 8.6,
        vote_count: 14633,
        genre_ids: [18, 36, 10752],
        media_type: 'movie',
    },
    {
        id: 372058,
        title: 'Your Name',
        overview:
            'High schoolers Mitsuha and Taki are complete strangers living separate lives. But one night, they suddenly switch places.',
        poster_path: '/q719jXXEzOoYaps6babgKnONONX.jpg',
        backdrop_path: '/7prYzufdIOy1KCTZKVWpw4kbAe.jpg',
        release_date: '2016-08-26',
        vote_average: 8.5,
        vote_count: 10245,
        genre_ids: [16, 10749, 18],
        media_type: 'movie',
    },
]

const sampleTVShows: TVShow[] = [
    {
        id: 1396,
        name: 'Breaking Bad',
        overview:
            'A high school chemistry teacher diagnosed with terminal lung cancer teams up with a former student to manufacture and sell crystallized methamphetamine.',
        poster_path: '/ggFHVNu6YYI5L9pCfOacjizRGt.jpg',
        backdrop_path: '/tsRy63Mu5cu8etL1X7ZLyf7UP1M.jpg',
        first_air_date: '2008-01-20',
        vote_average: 8.9,
        vote_count: 12137,
        genre_ids: [18],
        media_type: 'tv',
    },
    {
        id: 1399,
        name: 'Game of Thrones',
        overview:
            'Seven noble families fight for control of the mythical land of Westeros. Friction between the houses leads to full-scale war.',
        poster_path: '/1XS1oqL89opfnbLl8WnZY1O1uJx.jpg',
        backdrop_path: '/2OMB0ynKlyIenMJWI2Dy9IWT4c.jpg',
        first_air_date: '2011-04-17',
        vote_average: 8.4,
        vote_count: 21916,
        genre_ids: [10765, 18, 10759],
        media_type: 'tv',
    },
    {
        id: 94605,
        name: 'Arcane',
        overview:
            'Amid the stark discord of twin cities Piltover and Zaun, two sisters fight on rival sides of a war between magic technologies and clashing convictions.',
        poster_path: '/fqldf2t8ztc9aiwn3k6mlX3tvRT.jpg',
        backdrop_path: '/rkB4LyZHo1NHXFEDHl9vSD9r1lI.jpg',
        first_air_date: '2021-11-06',
        vote_average: 8.7,
        vote_count: 3382,
        genre_ids: [16, 10765, 10759, 18],
        media_type: 'tv',
    },
    {
        id: 60625,
        name: 'Rick and Morty',
        overview:
            'A genius scientist and his grandson go on wild sci-fi adventures across the multiverse.',
        poster_path: '/gdIrmf2DdY5mgN6ycVP0XlzKzbE.jpg',
        backdrop_path: '/eV3XnUul4UfIivz3kxgeIozeo50.jpg',
        first_air_date: '2013-12-02',
        vote_average: 8.7,
        vote_count: 9090,
        genre_ids: [16, 35, 10765],
        media_type: 'tv',
    },
    {
        id: 82856,
        name: 'The Mandalorian',
        overview:
            'After the fall of the Empire, a lone gunfighter makes his way through the lawless galaxy.',
        poster_path: '/eU1i6eHXlzMOlEq0ku1Rzq7Y4wA.jpg',
        backdrop_path: '/9ijMGlJKqcslswWUzTEwScm82Gs.jpg',
        first_air_date: '2019-11-12',
        vote_average: 8.4,
        vote_count: 8791,
        genre_ids: [10765, 10759, 18],
        media_type: 'tv',
    },
    {
        id: 85271,
        name: 'WandaVision',
        overview:
            'Wanda Maximoff and Vision—two super-powered beings living idealized suburban lives—begin to suspect that everything is not as it seems.',
        poster_path: '/glKDfE6btIRcVB5zrjspRIs4r52.jpg',
        backdrop_path: '/57vVjteucIF3bGnZj6PmaoJRScw.jpg',
        first_air_date: '2021-01-15',
        vote_average: 8.2,
        vote_count: 11261,
        genre_ids: [10765, 9648, 18],
        media_type: 'tv',
    },
    {
        id: 60059,
        name: 'Better Call Saul',
        overview:
            'Six years before Saul Goodman meets Walter White. We meet him when the man who will become Saul Goodman is known as Jimmy McGill.',
        poster_path: '/fC2HDm5t0kHl7mTm7jxMR31b7by.jpg',
        backdrop_path: '/9faGSFi5jam6pDWGNd0p8JcJgXQ.jpg',
        first_air_date: '2015-02-08',
        vote_average: 8.7,
        vote_count: 4835,
        genre_ids: [35, 18, 80],
        media_type: 'tv',
    },
    {
        id: 100088,
        name: 'The Last of Us',
        overview:
            'Twenty years after modern civilization has been destroyed, Joel must smuggle Ellie out of an oppressive quarantine zone.',
        poster_path: '/uKvVjHNqB5VmOrdxqAt2F7J78ED.jpg',
        backdrop_path: '/uDgy6hyPd82kOHh6I95FLtLnj6p.jpg',
        first_air_date: '2023-01-15',
        vote_average: 8.6,
        vote_count: 5702,
        genre_ids: [18, 10765],
        media_type: 'tv',
    },
]

export interface SeedDataOptions {
    likedCount?: number
    hiddenCount?: number
    watchHistoryCount?: number
    createCollections?: boolean
}

/**
 * Seeds user data with sample content
 */
export async function seedUserData(userId: string, options: SeedDataOptions = {}): Promise<void> {
    const {
        likedCount = 5,
        hiddenCount = 3,
        watchHistoryCount = 10,
        createCollections = true,
    } = options

    // Import stores dynamically to avoid circular dependencies
    const { useAuthStore } = await import('../stores/authStore')
    const { useGuestStore } = await import('../stores/guestStore')
    const { useSessionStore } = await import('../stores/sessionStore')

    // Determine which store to use
    const sessionType = useSessionStore.getState().sessionType
    const isGuest = sessionType === 'guest'

    console.log('🌱 Seeding data...', { userId, sessionType, isGuest })

    // Combine all content
    const allContent = [...sampleMovies, ...sampleTVShows]

    // Shuffle content
    const shuffled = [...allContent].sort(() => Math.random() - 0.5)

    // Seed liked content
    const likedContent = shuffled.slice(0, likedCount)
    console.log(`  ✅ Adding ${likedCount} liked items`)

    for (const item of likedContent) {
        if (isGuest) {
            useGuestStore.getState().addLikedMovie(item)
        } else {
            useAuthStore.getState().addLikedMovie(item)
        }
    }

    // Seed hidden content
    const hiddenContent = shuffled.slice(likedCount, likedCount + hiddenCount)
    console.log(`  👁️ Adding ${hiddenCount} hidden items`)

    for (const item of hiddenContent) {
        if (isGuest) {
            useGuestStore.getState().addHiddenMovie(item)
        } else {
            useAuthStore.getState().addHiddenMovie(item)
        }
    }

    // Seed watch history
    console.log(`  🎬 Adding ${watchHistoryCount} watch history items`)

    const watchContent = shuffled.slice(0, watchHistoryCount)
    const now = Date.now()

    // Import watch history store dynamically
    const { useWatchHistoryStore } = await import('../stores/watchHistoryStore')

    for (let i = 0; i < watchContent.length; i++) {
        const item = watchContent[i]
        const progress = Math.random() > 0.5 ? 100 : Math.floor(Math.random() * 90) + 10

        // Add to watch history via the watch history store
        useWatchHistoryStore.getState().addWatchEntry(
            item.id,
            item.media_type,
            item,
            progress,
            undefined, // duration
            undefined // watchedDuration
        )

        // Manually update watchedAt for older entries to spread them over days
        if (i > 0) {
            const watchedAt = now - i * 24 * 60 * 60 * 1000
            const history = useWatchHistoryStore.getState().history
            const lastEntry = history[history.length - 1]
            if (lastEntry) {
                useWatchHistoryStore.setState({
                    history: history.map((entry) =>
                        entry.id === lastEntry.id ? { ...entry, watchedAt } : entry
                    ),
                })
            }
        }
    }

    // Seed collections
    if (createCollections) {
        console.log('  📚 Creating sample collections')

        const collections = [
            {
                name: 'Sci-Fi Favorites',
                emoji: '🚀',
                color: '#3B82F6',
                items: shuffled.slice(0, 3),
            },
            {
                name: 'Comedy Gold',
                emoji: '😂',
                color: '#F59E0B',
                items: shuffled.slice(3, 6),
            },
        ]

        for (const collection of collections) {
            const listId = `list_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

            // Add items to the collection
            for (const item of collection.items) {
                if (isGuest) {
                    useGuestStore.getState().addToList(listId, item)
                } else {
                    useAuthStore.getState().addToList(listId, item)
                }
            }

            // Set list metadata after adding all items
            if (isGuest) {
                const lists = useGuestStore.getState().lists
                if (lists && lists[listId]) {
                    useGuestStore.setState({
                        lists: {
                            ...lists,
                            [listId]: {
                                ...lists[listId],
                                name: collection.name,
                                emoji: collection.emoji,
                                color: collection.color,
                            },
                        },
                    })
                }
            } else {
                const lists = useAuthStore.getState().lists
                if (lists && lists[listId]) {
                    useAuthStore.setState({
                        lists: {
                            ...lists,
                            [listId]: {
                                ...lists[listId],
                                name: collection.name,
                                emoji: collection.emoji,
                                color: collection.color,
                            },
                        },
                    })
                }
            }
        }
    }

    console.log('✨ Seed data complete!')
}

/**
 * Clears all user data (for testing)
 */
export async function clearUserData(): Promise<void> {
    const { useAuthStore } = await import('../stores/authStore')
    const { useGuestStore } = await import('../stores/guestStore')
    const { useSessionStore } = await import('../stores/sessionStore')

    const sessionType = useSessionStore.getState().sessionType
    const isGuest = sessionType === 'guest'

    console.log('🧹 Clearing all user data...')

    if (isGuest) {
        // Clear guest data
        const guestId = localStorage.getItem('nettrailer_guest_id')
        if (guestId) {
            localStorage.removeItem(`nettrailer_guest_data_${guestId}`)
            // Reload guest data
            useGuestStore.getState().loadGuestData(guestId)
        }
    } else {
        // For authenticated users, we'll just clear the local state
        // The Firebase data will remain unless explicitly deleted
        useAuthStore.setState({
            likedMovies: [],
            hiddenMovies: [],
            lists: {},
            watchHistory: [],
        })
    }

    console.log('✨ Data cleared!')
}

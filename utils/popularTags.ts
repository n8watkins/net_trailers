/**
 * Popular Tags for Ranking Creator
 *
 * Curated collection of 20 popular tags with associated TMDB content IDs
 * to help users quickly find related movies and TV shows when creating rankings.
 */

export interface PopularTag {
    id: string
    name: string
    emoji: string
    description: string
    movieIds: number[] // TMDB movie IDs
    tvShowIds: number[] // TMDB TV show IDs
}

export const POPULAR_TAGS: PopularTag[] = [
    {
        id: 'mcu',
        name: 'Marvel Cinematic Universe',
        emoji: '🦸',
        description: 'MCU movies and shows',
        movieIds: [
            299536, // Avengers: Infinity War
            299534, // Avengers: Endgame
            315635, // Spider-Man: Homecoming
            284053, // Thor: Ragnarok
            283995, // Guardians of the Galaxy Vol. 2
            363088, // Ant-Man and the Wasp
            429617, // Spider-Man: Far From Home
            497698, // Black Widow
            566525, // Shang-Chi
            634649, // Spider-Man: No Way Home
            453395, // Doctor Strange in the Multiverse of Madness
            616037, // Thor: Love and Thunder
            505642, // Black Panther: Wakanda Forever
            447365, // Guardians of the Galaxy Vol. 3
            609681, // The Marvels
        ],
        tvShowIds: [
            85271, // WandaVision
            88396, // The Falcon and the Winter Soldier
            84958, // Loki
            92782, // Hawkeye
            92749, // Moon Knight
            114461, // Ms. Marvel
        ],
    },
    {
        id: 'dc',
        name: 'DC Universe',
        emoji: '🦇',
        description: 'DC Comics adaptations',
        movieIds: [
            268896, // The Dark Knight Rises
            155, // The Dark Knight
            272, // Batman Begins
            209112, // Batman v Superman
            297761, // Suicide Squad
            141052, // Justice League
            324857, // Spider-Man: Into the Spider-Verse
            335984, // Blade Runner 2049
            335787, // Unhinged
            436969, // The Suicide Squad
            624860, // The Matrix Resurrections
        ],
        tvShowIds: [
            60735, // The Flash
            1434, // Arrow
            62127, // Titans
            79126, // Doom Patrol
            95057, // Superman & Lois
        ],
    },
    {
        id: 'star-wars',
        name: 'Star Wars',
        emoji: '⭐',
        description: 'A galaxy far, far away',
        movieIds: [
            11, // Star Wars: A New Hope
            1891, // The Empire Strikes Back
            1892, // Return of the Jedi
            140607, // Star Wars: The Force Awakens
            181808, // Star Wars: The Last Jedi
            181812, // Star Wars: The Rise of Skywalker
            330459, // Rogue One
            348350, // Solo
        ],
        tvShowIds: [
            82856, // The Mandalorian
            114461, // The Book of Boba Fett
            114478, // Obi-Wan Kenobi
            92830, // Andor
            114479, // Ahsoka
        ],
    },
    {
        id: 'harry-potter',
        name: 'Wizarding World',
        emoji: '⚡',
        description: 'Harry Potter & Fantastic Beasts',
        movieIds: [
            671, // Harry Potter and the Philosopher's Stone
            672, // Harry Potter and the Chamber of Secrets
            673, // Harry Potter and the Prisoner of Azkaban
            674, // Harry Potter and the Goblet of Fire
            675, // Harry Potter and the Order of the Phoenix
            767, // Harry Potter and the Half-Blood Prince
            12444, // Harry Potter and the Deathly Hallows: Part 1
            12445, // Harry Potter and the Deathly Hallows: Part 2
            259316, // Fantastic Beasts and Where to Find Them
            338952, // Fantastic Beasts: The Crimes of Grindelwald
            338953, // Fantastic Beasts: The Secrets of Dumbledore
        ],
        tvShowIds: [],
    },
    {
        id: 'lotr',
        name: 'Middle-earth',
        emoji: '🧙',
        description: 'Lord of the Rings & The Hobbit',
        movieIds: [
            120, // The Lord of the Rings: The Fellowship of the Ring
            121, // The Lord of the Rings: The Two Towers
            122, // The Lord of the Rings: The Return of the King
            49051, // The Hobbit: An Unexpected Journey
            57158, // The Hobbit: The Desolation of Smaug
            122917, // The Hobbit: The Battle of the Five Armies
        ],
        tvShowIds: [
            84773, // The Lord of the Rings: The Rings of Power
        ],
    },
    {
        id: 'pixar',
        name: 'Pixar Classics',
        emoji: '🎨',
        description: 'Pixar animated films',
        movieIds: [
            862, // Toy Story
            863, // Toy Story 2
            10193, // Toy Story 3
            301528, // Toy Story 4
            12, // Finding Nemo
            127380, // Finding Dory
            920, // Cars
            14160, // Up
            585, // Monsters, Inc.
            62211, // Monsters University
            9806, // The Incredibles
            260513, // Incredibles 2
            508442, // Soul
            508943, // Luca
            508947, // Turning Red
            639721, // The Super Mario Bros. Movie
        ],
        tvShowIds: [],
    },
    {
        id: 'disney-renaissance',
        name: 'Disney Animated Classics',
        emoji: '👸',
        description: 'Classic Disney animation',
        movieIds: [
            12, // Finding Nemo
            109445, // Frozen
            150540, // Inside Out
            260513, // Incredibles 2
            420818, // The Lion King (2019)
            420817, // Aladdin (2019)
            329996, // Dumbo
            420809, // Maleficent: Mistress of Evil
            508943, // Luca
            508947, // Turning Red
            361743, // Top Gun: Maverick
        ],
        tvShowIds: [],
    },
    {
        id: 'horror',
        name: 'Horror Essentials',
        emoji: '👻',
        description: 'Scary movies and shows',
        movieIds: [
            346364, // It
            345940, // It Chapter Two
            419430, // Get Out
            530915, // 1917
            441384, // The Silence of the Lambs
            694, // The Shining
            539, // Psycho
            10386, // The Conjuring
            346364, // It
            447332, // A Quiet Place
            521777, // A Quiet Place Part II
        ],
        tvShowIds: [
            1402, // The Walking Dead
            1396, // Breaking Bad
            60059, // Better Call Saul
            66788, // Stranger Things
            71712, // The Haunting of Hill House
        ],
    },
    {
        id: 'sci-fi',
        name: 'Sci-Fi Masterpieces',
        emoji: '🚀',
        description: 'Science fiction classics',
        movieIds: [
            157336, // Interstellar
            27205, // Inception
            329865, // Arrival
            335984, // Blade Runner 2049
            78, // Blade Runner
            603, // The Matrix
            604, // The Matrix Reloaded
            605, // The Matrix Revolutions
            440021, // Dune
            438631, // Dune: Part Two
            118340, // Guardians of the Galaxy
        ],
        tvShowIds: [
            1399, // Game of Thrones
            76479, // The Boys
            95557, // Invincible
            85271, // WandaVision
        ],
    },
    {
        id: 'anime',
        name: 'Anime Favorites',
        emoji: '🎌',
        description: 'Popular anime series',
        movieIds: [
            129, // Spirited Away
            4935, // Howl's Moving Castle
            128, // Princess Mononoke
            10515, // Ponyo
            10494, // The Secret World of Arrietty
            598, // City of God
        ],
        tvShowIds: [
            1429, // Attack on Titan
            46261, // Death Note
            37854, // One Punch Man
            85937, // Demon Slayer
            85937, // Jujutsu Kaisen
            62715, // My Hero Academia
        ],
    },
    {
        id: 'true-crime',
        name: 'True Crime',
        emoji: '🔍',
        description: 'Crime dramas and documentaries',
        movieIds: [
            19404, // Zodiac
            475557, // Joker
            278, // The Shawshank Redemption
            106646, // The Wolf of Wall Street
            122, // The Lord of the Rings: The Return of the King
        ],
        tvShowIds: [
            1396, // Breaking Bad
            60059, // Better Call Saul
            46952, // The Blacklist
            2734, // Law & Order: SVU
            61889, // Mindhunter
        ],
    },
    {
        id: 'comedy',
        name: 'Comedy Gold',
        emoji: '😂',
        description: 'Hilarious movies and shows',
        movieIds: [
            293660, // Deadpool
            383498, // Deadpool 2
            37724, // Skyfall
            324857, // Spider-Man: Into the Spider-Verse
            13, // Forrest Gump
            550, // Fight Club
        ],
        tvShowIds: [
            1418, // The Big Bang Theory
            2316, // The Office (US)
            1421, // Modern Family
            60625, // Rick and Morty
            63174, // Brooklyn Nine-Nine
        ],
    },
    {
        id: 'romance',
        name: 'Romance & Drama',
        emoji: '💕',
        description: 'Love stories and dramas',
        movieIds: [
            597, // Titanic
            11036, // The Notebook
            194662, // Birdman
            194662, // La La Land
            381284, // Bohemian Rhapsody
        ],
        tvShowIds: [
            1416, // Grey's Anatomy
            1412, // The Crown
            63247, // Bridgerton
            67915, // Emily in Paris
        ],
    },
    {
        id: 'action',
        name: 'Action Blockbusters',
        emoji: '💥',
        description: 'High-octane action films',
        movieIds: [
            245891, // John Wick
            324552, // John Wick: Chapter 2
            458156, // John Wick: Chapter 3
            603692, // John Wick: Chapter 4
            157336, // Interstellar
            324857, // Spider-Man: Into the Spider-Verse
            361743, // Top Gun: Maverick
            76600, // Avatar: The Way of Water
        ],
        tvShowIds: [
            1399, // Game of Thrones
            76479, // The Boys
            94997, // House of the Dragon
        ],
    },
    {
        id: 'netflix-originals',
        name: 'Netflix Originals',
        emoji: '📺',
        description: 'Popular Netflix shows',
        movieIds: [
            333339, // Ready Player One
            680, // Pulp Fiction
        ],
        tvShowIds: [
            66732, // Stranger Things
            70523, // The Umbrella Academy
            80025, // The Witcher
            63247, // Bridgerton
            100088, // The Last of Us
        ],
    },
    {
        id: 'christopher-nolan',
        name: 'Christopher Nolan',
        emoji: '🎬',
        description: 'Directed by Christopher Nolan',
        movieIds: [
            27205, // Inception
            157336, // Interstellar
            155, // The Dark Knight
            49026, // The Dark Knight Rises
            272, // Batman Begins
            77, // Memento
            1124, // The Prestige
            120467, // Dunkirk
            577922, // Tenet
            872585, // Oppenheimer
        ],
        tvShowIds: [],
    },
    {
        id: 'tarantino',
        name: 'Quentin Tarantino',
        emoji: '🎥',
        description: 'Directed by Quentin Tarantino',
        movieIds: [
            680, // Pulp Fiction
            24, // Kill Bill: Vol. 1
            393, // Kill Bill: Vol. 2
            16869, // Inglourious Basterds
            111, // Django Unchained
            106646, // The Hateful Eight
            466272, // Once Upon a Time in Hollywood
        ],
        tvShowIds: [],
    },
    {
        id: 'based-on-books',
        name: 'Based on Books',
        emoji: '📚',
        description: 'Literary adaptations',
        movieIds: [
            120, // The Lord of the Rings: The Fellowship of the Ring
            671, // Harry Potter and the Philosopher's Stone
            278, // The Shawshank Redemption
            13, // Forrest Gump
            680, // Pulp Fiction
            157336, // Interstellar
        ],
        tvShowIds: [
            1399, // Game of Thrones
            60735, // The Handmaid's Tale
            80025, // The Witcher
            100088, // The Last of Us
        ],
    },
    {
        id: 'oscar-winners',
        name: 'Oscar Winners',
        emoji: '🏆',
        description: 'Academy Award winners',
        movieIds: [
            278, // The Shawshank Redemption
            238, // The Godfather
            424, // Schindler's List
            13, // Forrest Gump
            122, // The Lord of the Rings: The Return of the King
            155, // The Dark Knight
            550, // Fight Club
            497, // The Green Mile
            872585, // Oppenheimer
            466420, // Killers of the Flower Moon
        ],
        tvShowIds: [],
    },
    {
        id: 'mystery-thriller',
        name: 'Mystery & Thriller',
        emoji: '🕵️',
        description: 'Edge-of-your-seat thrillers',
        movieIds: [
            102651, // Malignant
            546554, // Knives Out
            661374, // Glass Onion
            447332, // A Quiet Place
            329865, // Arrival
            274, // The Silence of the Lambs
            745, // The Sixth Sense
            77, // Memento
        ],
        tvShowIds: [
            1396, // Breaking Bad
            60059, // Better Call Saul
            61889, // Mindhunter
            46952, // The Blacklist
            63926, // Ozark
        ],
    },
]

/**
 * Get a tag by ID
 */
export function getTagById(id: string): PopularTag | undefined {
    return POPULAR_TAGS.find((tag) => tag.id === id)
}

/**
 * Get all content IDs for a tag
 */
export function getTagContentIds(tagId: string): number[] {
    const tag = getTagById(tagId)
    if (!tag) return []
    return [...tag.movieIds, ...tag.tvShowIds]
}

/**
 * Search tags by name
 */
export function searchTags(query: string): PopularTag[] {
    const lowerQuery = query.toLowerCase()
    return POPULAR_TAGS.filter(
        (tag) =>
            tag.name.toLowerCase().includes(lowerQuery) ||
            tag.description.toLowerCase().includes(lowerQuery)
    )
}

/**
 * Popular Tags for Ranking Creator
 *
 * Curated collection of 30 popular tags with associated TMDB content IDs
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
            // Phase 1
            1726, // Iron Man
            1724, // The Incredible Hulk
            10138, // Iron Man 2
            10195, // Thor
            1771, // Captain America: The First Avenger
            24428, // The Avengers
            // Phase 2
            68721, // Iron Man 3
            76338, // Thor: The Dark World
            100402, // Captain America: The Winter Soldier
            118340, // Guardians of the Galaxy
            99861, // Avengers: Age of Ultron
            102899, // Ant-Man
            // Phase 3
            271110, // Captain America: Civil War
            284053, // Doctor Strange
            283995, // Guardians of the Galaxy Vol. 2
            315635, // Spider-Man: Homecoming
            284054, // Black Panther
            299536, // Avengers: Infinity War
            363088, // Ant-Man and the Wasp
            429617, // Captain Marvel
            299534, // Avengers: Endgame
            // Phase 4
            497698, // Black Widow
            566525, // Shang-Chi
            524434, // Eternals
            634649, // Spider-Man: No Way Home
            453395, // Doctor Strange in the Multiverse of Madness
            616037, // Thor: Love and Thunder
            505642, // Black Panther: Wakanda Forever
            640146, // Ant-Man and the Wasp: Quantumania
            447365, // Guardians of the Galaxy Vol. 3
            609681, // The Marvels
            762430, // Deadpool & Wolverine
        ],
        tvShowIds: [
            85271, // WandaVision
            88396, // The Falcon and the Winter Soldier
            84958, // Loki
            92782, // Hawkeye
            92749, // Moon Knight
            114461, // Ms. Marvel
            92783, // She-Hulk
            114472, // Secret Invasion
            138501, // Echo
            224699, // Agatha All Along
        ],
    },
    {
        id: 'dc',
        name: 'DC Universe',
        emoji: '🦇',
        description: 'DC Comics adaptations',
        movieIds: [
            // Dark Knight Trilogy
            272, // Batman Begins
            155, // The Dark Knight
            49026, // The Dark Knight Rises
            // DCEU
            49521, // Man of Steel
            209112, // Batman v Superman
            297761, // Suicide Squad
            141052, // Justice League
            297762, // Wonder Woman
            268896, // Aquaman
            424783, // Shazam!
            346687, // Birds of Prey
            464052, // Wonder Woman 1984
            791373, // Zack Snyder's Justice League
            436969, // The Suicide Squad
            406759, // Black Adam
            594767, // Shazam! Fury of the Gods
            537915, // The Flash
            537061, // Blue Beetle
            676547, // Aquaman and the Lost Kingdom
            // Standalone
            364, // Batman Returns
            2661, // Batman Forever
            2640, // Batman & Robin
            9335, // Superman
            8536, // Superman II
            414906, // The Batman
            537051, // Joker
            889737, // Joker: Folie à Deux
        ],
        tvShowIds: [
            1434, // Arrow
            60735, // The Flash
            62127, // Titans
            79126, // Doom Patrol
            95057, // Superman & Lois
            88329, // Peacemaker
            85422, // The Penguin
            125988, // Lanterns
        ],
    },
    {
        id: 'star-wars',
        name: 'Star Wars',
        emoji: '⭐',
        description: 'A galaxy far, far away',
        movieIds: [
            // Original Trilogy
            11, // A New Hope
            1891, // The Empire Strikes Back
            1892, // Return of the Jedi
            // Prequel Trilogy
            1893, // The Phantom Menace
            1894, // Attack of the Clones
            1895, // Revenge of the Sith
            // Sequel Trilogy
            140607, // The Force Awakens
            181808, // The Last Jedi
            181812, // The Rise of Skywalker
            // Standalone
            330459, // Rogue One
            348350, // Solo
        ],
        tvShowIds: [
            4194, // The Clone Wars
            82856, // The Mandalorian
            92830, // Andor
            114461, // The Book of Boba Fett
            114478, // Obi-Wan Kenobi
            114479, // Ahsoka
            136315, // The Acolyte
            114472, // Tales of the Jedi
            203085, // Skeleton Crew
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
            120, // The Fellowship of the Ring
            121, // The Two Towers
            122, // The Return of the King
            49051, // The Hobbit: An Unexpected Journey
            57158, // The Hobbit: The Desolation of Smaug
            122917, // The Hobbit: The Battle of the Five Armies
        ],
        tvShowIds: [
            84773, // The Rings of Power
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
            2062, // Cars 2
            260513, // Cars 3
            14160, // Up
            585, // Monsters, Inc.
            62211, // Monsters University
            9806, // The Incredibles
            150540, // Inside Out
            355338, // Inside Out 2
            508442, // Soul
            508943, // Luca
            508947, // Turning Red
            269149, // Zootopia
            49444, // Coco
        ],
        tvShowIds: [],
    },
    {
        id: 'disney-renaissance',
        name: 'Disney Animated Classics',
        emoji: '👸',
        description: 'Classic Disney animation',
        movieIds: [
            10144, // The Little Mermaid
            10020, // Beauty and the Beast
            10530, // Aladdin
            8587, // The Lion King
            10543, // Pocahontas
            10609, // The Hunchback of Notre Dame
            10862, // Hercules
            12124, // Mulan
            10198, // Tarzan
            12092, // The Emperor's New Groove
            10009, // Lilo & Stitch
            38757, // Tangled
            109445, // Frozen
            177572, // Big Hero 6
            150540, // Moana
            329996, // Frozen II
            508947, // Raya and the Last Dragon
            568124, // Encanto
        ],
        tvShowIds: [],
    },
    {
        id: 'horror',
        name: 'Horror Essentials',
        emoji: '👻',
        description: 'Scary movies and shows',
        movieIds: [
            694, // The Shining
            539, // Psycho
            346364, // It
            345940, // It Chapter Two
            419430, // Get Out
            530385, // Midsommar
            496243, // Us
            10386, // The Conjuring
            284052, // The Conjuring 2
            447332, // A Quiet Place
            521777, // A Quiet Place Part II
            760161, // Orphan: First Kill
            760741, // Scream (2022)
            646385, // Scream VI
            678512, // Sound of Freedom
            663712, // Terrifier 2
            891699, // M3GAN
            840430, // The Exorcist: Believer
            762430, // Talk to Me
            810693, // Evil Dead Rise
            840326, // Saw X
            968051, // The Nun II
            507089, // Five Nights at Freddy's
        ],
        tvShowIds: [
            1402, // The Walking Dead
            62560, // Fear the Walking Dead
            66788, // Stranger Things
            71712, // The Haunting of Hill House
            92096, // The Haunting of Bly Manor
            90802, // Midnight Mass
            114461, // Archive 81
            92830, // Servant
            114472, // From
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
            624860, // The Matrix Resurrections
            440021, // Dune
            693134, // Dune: Part Two
            118340, // Guardians of the Galaxy
            19995, // Avatar
            76600, // Avatar: The Way of Water
            87101, // Terminator 2
            218, // The Terminator
            534, // Terminator 3
            1726, // Alien
            679, // Aliens
            8077, // Alien 3
            8078, // Alien Resurrection
            453395, // Prometheus
            126889, // Alien: Covenant
        ],
        tvShowIds: [
            1399, // Game of Thrones
            76479, // The Boys
            95557, // Invincible
            85271, // Westworld
            60625, // Rick and Morty
            67198, // The Expanse
            66732, // Raised by Wolves
            92830, // Foundation
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
            12429, // Grave of the Fireflies
            50160, // The Wind Rises
            523619, // Your Name
            372058, // Your Name (Kimi no Na wa)
            508965, // Weathering with You
            584828, // A Silent Voice
        ],
        tvShowIds: [
            1429, // Attack on Titan
            46261, // Death Note
            37854, // One Punch Man
            85937, // Demon Slayer
            95479, // Jujutsu Kaisen
            62715, // My Hero Academia
            46298, // Sword Art Online
            30983, // Code Geass
            30984, // Steins;Gate
            37430, // Fullmetal Alchemist: Brotherhood
            37391, // One Piece
            31911, // Naruto
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
            73, // The Godfather
            238, // The Godfather: Part II
            240, // The Godfather: Part III
        ],
        tvShowIds: [
            1396, // Breaking Bad
            60059, // Better Call Saul
            46952, // The Blacklist
            2734, // Law & Order: SVU
            61889, // Mindhunter
            63926, // Ozark
            1405, // Narcos
            73586, // Narcos: Mexico
            60574, // Peaky Blinders
            66788, // True Detective
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
            762430, // Deadpool & Wolverine
            13, // Forrest Gump
            550, // Fight Club
            107, // Snatch
            1091, // The Big Lebowski
            13475, // The Hangover
            18785, // The Hangover Part II
            86834, // The Hangover Part III
            102651, // 22 Jump Street
            16420, // Pineapple Express
            8681, // Anchorman 2
        ],
        tvShowIds: [
            1418, // The Big Bang Theory
            2316, // The Office (US)
            1421, // Modern Family
            60625, // Rick and Morty
            63174, // Brooklyn Nine-Nine
            1434, // Parks and Recreation
            1438, // It's Always Sunny in Philadelphia
            4194, // Community
            1408, // How I Met Your Mother
            46562, // Arrested Development
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
            194662, // La La Land
            381284, // A Star is Born
            413594, // To All the Boys: P.S. I Still Love You
            588228, // To All the Boys: Always and Forever
        ],
        tvShowIds: [
            1416, // Grey's Anatomy
            1412, // The Crown
            63247, // Bridgerton
            67915, // Emily in Paris
            71914, // The White Lotus
            85271, // Outlander
            1408, // Gossip Girl
            60573, // Virgin River
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
            629176, // The Creator
            667538, // Transformers: Rise of the Beasts
            436270, // Black Adam
            609681, // Fast X
            269149, // Mad Max: Fury Road
            76341, // Mad Max
            8810, // The Road Warrior
            76757, // Furiosa: A Mad Max Saga
        ],
        tvShowIds: [
            1399, // Game of Thrones
            76479, // The Boys
            94997, // House of the Dragon
            82452, // The Mandalorian
            60625, // Jack Ryan
            73375, // Reacher
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
            419704, // Glass
            419430, // Bird Box
            452832, // Red Notice
            762430, // The Gray Man
            840326, // Knives Out
            661374, // Glass Onion
        ],
        tvShowIds: [
            66732, // Stranger Things
            70523, // The Umbrella Academy
            80025, // The Witcher
            63247, // Bridgerton
            63926, // Ozark
            67198, // The Crown
            60735, // Black Mirror
            63174, // The Queen's Gambit
            80547, // Wednesday
            114461, // You
            60573, // 13 Reasons Why
            67915, // Emily in Paris
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
            68718, // Django Unchained
            273248, // The Hateful Eight
            466272, // Once Upon a Time in Hollywood
            641, // Reservoir Dogs
            73, // Jackie Brown
        ],
        tvShowIds: [],
    },
    {
        id: 'based-on-books',
        name: 'Based on Books',
        emoji: '📚',
        description: 'Literary adaptations',
        movieIds: [
            120, // The Lord of the Rings
            671, // Harry Potter
            278, // The Shawshank Redemption
            13, // Forrest Gump
            680, // The Great Gatsby
            157336, // The Hunger Games
            11036, // The Fault in Our Stars
            440021, // Dune
            10195, // The Chronicles of Narnia
        ],
        tvShowIds: [
            1399, // Game of Thrones
            60735, // The Handmaid's Tale
            80025, // The Witcher
            100088, // The Last of Us
            84773, // The Rings of Power
            60573, // Big Little Lies
            67915, // Outlander
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
            915935, // Anatomy of a Fall
            792307, // Poor Things
            569094, // Spider-Man: Across the Spider-Verse
            447365, // The Whale
            505642, // Everything Everywhere All at Once
            840326, // The Fabelmans
            976573, // Elemental
            157336, // 12 Years a Slave
            194662, // Moonlight
            381284, // Parasite
            419430, // 1917
            329865, // Arrival
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
            489931, // Gone Girl
            155, // Se7en
            106646, // Shutter Island
            550, // The Usual Suspects
            680, // No Country for Old Men
        ],
        tvShowIds: [
            1396, // Breaking Bad
            60059, // Better Call Saul
            61889, // Mindhunter
            46952, // The Blacklist
            63926, // Ozark
            66788, // True Detective
            1405, // Fargo
            60573, // Big Little Lies
            71914, // Mare of Easttown
            85271, // The Undoing
        ],
    },
    {
        id: 'studio-ghibli',
        name: 'Studio Ghibli',
        emoji: '🌸',
        description: 'Beloved Ghibli animated classics',
        movieIds: [
            129, // Spirited Away
            810, // My Neighbor Totoro
            4935, // Howl's Moving Castle
            128, // Princess Mononoke
            10515, // Ponyo
            38142, // Kiki's Delivery Service
            12429, // Grave of the Fireflies
            10681, // The Wind Rises
            641, // Nausicaä of the Valley of the Wind
            27429, // Arrietty
            128160, // The Tale of the Princess Kaguya
            83389, // When Marnie Was There
            14584, // The Cat Returns
            13153, // Castle in the Sky
            17853, // From Up on Poppy Hill
        ],
        tvShowIds: [],
    },
    {
        id: 'james-bond',
        name: 'James Bond 007',
        emoji: '🕴️',
        description: '007 spy thriller franchise',
        movieIds: [
            646, // Skyfall
            37724, // Casino Royale
            36557, // Quantum of Solace
            370172, // No Time to Die
            253405, // Spectre
            667, // GoldenEye
            708, // The Spy Who Loved Me
            657, // From Russia with Love
            253, // Goldfinger
            668, // Die Another Day
            710, // Live and Let Die
            36669, // The World Is Not Enough
            707, // Tomorrow Never Dies
            12208, // On Her Majesty's Secret Service
            656, // Dr. No
        ],
        tvShowIds: [],
    },
    {
        id: 'fast-furious',
        name: 'Fast & Furious',
        emoji: '🏎️',
        description: 'High-octane car action franchise',
        movieIds: [
            9799, // The Fast and the Furious
            584, // 2 Fast 2 Furious
            13804, // The Fast and the Furious: Tokyo Drift
            13804, // Fast & Furious
            51497, // Fast Five
            168259, // Furious 7
            337339, // The Fate of the Furious
            384018, // Fast & Furious Presents: Hobbs & Shaw
            385687, // F9
            385687, // Fast X
        ],
        tvShowIds: [
            114410, // Fast & Furious Spy Racers
        ],
    },
    {
        id: 'classic-hollywood',
        name: 'Classic Hollywood',
        emoji: '🎬',
        description: 'Golden age cinema classics',
        movieIds: [
            238, // The Godfather
            240, // The Godfather Part II
            389, // 12 Angry Men
            429, // The Good, the Bad and the Ugly
            19404, // Casablanca
            613, // Vertigo
            311, // Rear Window
            901, // City Lights
            510, // One Flew Over the Cuckoo's Nest
            424, // Schindler's List
            914, // The Great Dictator
            346, // Seven Samurai
            329, // Jurassic Park
            497, // The Green Mile
            122, // The Lord of the Rings: The Return of the King
            857, // Saving Private Ryan
            539, // Psycho
            769, // GoodFellas
            72, // The Godfather Part III
            73, // American History X
        ],
        tvShowIds: [],
    },
    {
        id: 'biographical',
        name: 'Based on True Stories',
        emoji: '📖',
        description: 'Biographical and true story films',
        movieIds: [
            424, // Schindler's List
            244786, // Whiplash
            1422, // The Departed
            129, // 127 Hours
            19995, // Avatar
            335984, // Blade Runner 2049
            12477, // Gravity
            157336, // Interstellar
            70160, // The Hunter
            106646, // Shutter Island
            13223, // The Social Network
            14161, // Moneyball
            205596, // The Imitation Game
            194662, // Birdman
            314365, // The Big Short
            321612, // Beauty and the Beast
            376867, // Moonlight
            340102, // The New Mutants
            382322, // The King's Man
            531428, // Portrait of a Lady on Fire
        ],
        tvShowIds: [
            1396, // Breaking Bad
            1408, // House
            4614, // NCIS
            46533, // Chernobyl
        ],
    },
    {
        id: 'psychological-thriller',
        name: 'Psychological Thrillers',
        emoji: '🧠',
        description: 'Mind-bending psychological films',
        movieIds: [
            155, // The Dark Knight
            680, // Pulp Fiction
            13, // Forrest Gump
            550, // Fight Club
            496243, // Parasite
            120, // The Lord of the Rings: The Fellowship of the Ring
            27205, // Inception
            155, // Se7en
            106646, // Shutter Island
            680, // No Country for Old Men
            77, // Memento
            489931, // Gone Girl
            209112, // The Gift
            313369, // La La Land
            274, // The Silence of the Lambs
            745, // The Sixth Sense
            769, // GoodFellas
            600, // Full Metal Jacket
            329, // Jurassic Park
            278, // The Shawshank Redemption
        ],
        tvShowIds: [
            1396, // Breaking Bad
            1408, // House
            60059, // Better Call Saul
            61889, // Mindhunter
            46952, // The Blacklist
        ],
    },
    {
        id: 'sports',
        name: 'Sports',
        emoji: '⚽',
        description: 'Sports movies and shows',
        movieIds: [
            1366, // Rocky
            1367, // Rocky II
            1368, // Rocky III
            1369, // Rocky IV
            1370, // Rocky V
            12444, // Rocky Balboa
            173995, // Creed
            480530, // Creed II
            522240, // Creed III
            1366, // The Karate Kid
            38142, // The Karate Kid Part II
            10139, // The Karate Kid Part III
            38700, // The Next Karate Kid
            454626, // Cobra Kai
            37257, // Remember the Titans
            9502, // The Blind Side
            12162, // Hoosiers
            11808, // Field of Dreams
            1368, // Rudy
            391698, // Ford v Ferrari
        ],
        tvShowIds: [
            77169, // Cobra Kai
            86831, // Ted Lasso
            100757, // The Last Dance
            57243, // Friday Night Lights
        ],
    },
    {
        id: 'musicals',
        name: 'Musicals & Music',
        emoji: '🎵',
        description: 'Musical films and shows',
        movieIds: [
            313369, // La La Land
            360814, // The Greatest Showman
            293660, // Deadpool
            321612, // Beauty and the Beast
            284052, // Doctor Strange
            12445, // Grease
            109439, // Les Misérables
            335984, // The Lion King
            246567, // Into the Woods
            181808, // Pitch Perfect
            194662, // Chicago
            862, // Toy Story
            329, // The Jungle Book
            284053, // Coco
            508442, // Soul
            379686, // Raya and the Last Dragon
            326359, // Sing
            438631, // Dune
            383498, // Sing 2
            447365, // Tick, Tick... Boom!
        ],
        tvShowIds: [
            69050, // Glee
            95557, // Inventing Anna
            125392, // Wednesday
        ],
    },
    {
        id: 'fantasy',
        name: 'Fantasy Adventures',
        emoji: '🐉',
        description: 'Epic fantasy worlds and adventures',
        movieIds: [
            120, // The Lord of the Rings: The Fellowship of the Ring
            122, // The Lord of the Rings: The Return of the King
            121, // The Lord of the Rings: The Two Towers
            12444, // The Hobbit: An Unexpected Journey
            57158, // The Hobbit: The Desolation of Smaug
            122917, // The Hobbit: The Battle of the Five Armies
            671, // Harry Potter and the Philosopher's Stone
            672, // Harry Potter and the Chamber of Secrets
            673, // Harry Potter and the Prisoner of Azkaban
            674, // Harry Potter and the Goblet of Fire
            675, // Harry Potter and the Order of the Phoenix
            767, // Harry Potter and the Half-Blood Prince
            12444, // Harry Potter and the Deathly Hallows: Part 1
            12445, // Harry Potter and the Deathly Hallows: Part 2
            862, // Toy Story
            10191, // How to Train Your Dragon
            82702, // How to Train Your Dragon 2
            166424, // How to Train Your Dragon: The Hidden World
            140607, // The Chronicles of Narnia: The Lion, the Witch and the Wardrobe
            411, // The Chronicles of Narnia: Prince Caspian
        ],
        tvShowIds: [
            1399, // Game of Thrones
            76479, // The Witcher
            60735, // The Flash
            1402, // The Walking Dead
            94605, // Arcane
        ],
    },
    {
        id: 'heist-crime',
        name: 'Heist & Crime',
        emoji: '💰',
        description: 'Heist films and crime dramas',
        movieIds: [
            161, // Ocean's Eleven
            163, // Ocean's Twelve
            298, // Ocean's Thirteen
            680, // Pulp Fiction
            238, // The Godfather
            240, // The Godfather Part II
            107, // Snatch
            120467, // The Grand Budapest Hotel
            550, // Fight Club
            769, // GoodFellas
            680, // No Country for Old Men
            155, // The Dark Knight
            680, // Reservoir Dogs
            370172, // Baby Driver
            207703, // The Town
            274857, // Now You See Me
            291805, // Now You See Me 2
            406759, // The Gentlemen
            475557, // Joker
            1366, // Heat
        ],
        tvShowIds: [
            1396, // Breaking Bad
            60059, // Better Call Saul
            46952, // The Blacklist
            66788, // Peaky Blinders
            71914, // Lupin
            87108, // Kaleidoscope
            60574, // Money Heist
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

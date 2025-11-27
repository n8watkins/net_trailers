/**
 * Seed Rankings
 *
 * Creates sample rankings using actual franchise content from TMDB.
 * Each tag (MCU, DC, Star Wars, Harry Potter, LOTR, Pixar, Disney, Horror,
 * Sci-Fi, Anime, True Crime, Comedy, Romance, Action, Netflix) has 2+ rankings.
 */

import { Movie, TVShow, Content } from '../../typings'

export interface SeedRankingsOptions {
    userId: string
    userName: string
    userAvatar?: string
}

// Helper to create a movie object from TMDB data
const movie = (
    id: number,
    title: string,
    poster_path: string,
    overview: string = '',
    vote_average: number = 8.0
): Movie => ({
    id,
    title,
    original_title: title,
    overview,
    poster_path,
    backdrop_path: poster_path,
    release_date: '2020-01-01',
    vote_average,
    vote_count: 10000,
    genre_ids: [],
    media_type: 'movie',
    origin_country: ['US'],
    original_language: 'en',
    popularity: 100,
})

// Helper to create a TV show object from TMDB data
const tvShow = (
    id: number,
    name: string,
    poster_path: string,
    overview: string = '',
    vote_average: number = 8.0
): TVShow => ({
    id,
    name,
    original_name: name,
    overview,
    poster_path,
    backdrop_path: poster_path,
    first_air_date: '2020-01-01',
    vote_average,
    vote_count: 10000,
    genre_ids: [],
    media_type: 'tv',
    origin_country: ['US'],
    original_language: 'en',
    popularity: 100,
})

// ============================================================================
// MCU Content (🦸)
// ============================================================================
const MCU_MOVIES = {
    ironMan: movie(
        1726,
        'Iron Man',
        '/78lPtwv72eTNqFW9COBYI0dWDJa.jpg',
        'Tony Stark builds an armored suit to fight evil.',
        7.9
    ),
    avengers: movie(
        24428,
        'The Avengers',
        '/RYMX2wcKCBAr24UyPD7xwmjaTn.jpg',
        "Earth's mightiest heroes unite.",
        7.7
    ),
    infinityWar: movie(
        299536,
        'Avengers: Infinity War',
        '/7WsyChQLEftFiDOVTGkv3hFpyyt.jpg',
        'The Avengers face Thanos.',
        8.3
    ),
    endgame: movie(
        299534,
        'Avengers: Endgame',
        '/or06FN3Dka5tukK1e9sl16pB3iy.jpg',
        'The epic conclusion to the Infinity Saga.',
        8.4
    ),
    blackPanther: movie(
        284054,
        'Black Panther',
        '/uxzzxijgPIY7slzFvMotPv8wjKA.jpg',
        "T'Challa returns to Wakanda.",
        7.4
    ),
    spiderManNWH: movie(
        634649,
        'Spider-Man: No Way Home',
        '/1g0dhYtq4irTY1GPXvft6k4YLjm.jpg',
        'The multiverse opens.',
        8.2
    ),
    guardians: movie(
        118340,
        'Guardians of the Galaxy',
        '/r7vmZjiyZw9rpJMQJdXpjgiCOk9.jpg',
        'A band of misfits save the galaxy.',
        8.0
    ),
    thorRagnarok: movie(
        284053,
        'Thor: Ragnarok',
        '/rzRwTcFvttcN1ZpX2xv4j3tSdJu.jpg',
        'Thor faces Hela in Ragnarok.',
        7.9
    ),
    civilWar: movie(
        271110,
        'Captain America: Civil War',
        '/rAGiXaUfPzY7CDEyNKUofk3Kw2e.jpg',
        'The Avengers are divided.',
        7.8
    ),
    winterSoldier: movie(
        100402,
        'Captain America: The Winter Soldier',
        '/tVFRpFw3xTedgPGqxW0AOI8Qhh0.jpg',
        'Cap discovers a conspiracy.',
        7.7
    ),
}

const MCU_TV = {
    wandaVision: tvShow(
        85271,
        'WandaVision',
        '/glKDfE6btIRcVB5zrjspRIs4r52.jpg',
        'Wanda and Vision in a sitcom reality.',
        8.0
    ),
    loki: tvShow(
        84958,
        'Loki',
        '/voHUmluYmKyleFkTu3lOXQG702u.jpg',
        'The God of Mischief navigates the TVA.',
        8.2
    ),
    falconWS: tvShow(
        88396,
        'The Falcon and the Winter Soldier',
        '/6kbAMLteGO8yyewYau6bJ683sw7.jpg',
        'Sam and Bucky team up.',
        7.3
    ),
}

// ============================================================================
// DC Content (🦇)
// ============================================================================
const DC_MOVIES = {
    darkKnight: movie(
        155,
        'The Dark Knight',
        '/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
        'Batman faces the Joker.',
        9.0
    ),
    darkKnightRises: movie(
        49026,
        'The Dark Knight Rises',
        '/hr0L2aueqlP2BYUblTTjmtn0hw4.jpg',
        'Bane threatens Gotham.',
        8.4
    ),
    batmanBegins: movie(
        272,
        'Batman Begins',
        '/8RW2runSEc34IwKN2D1aPcJd2UL.jpg',
        "Bruce Wayne's origin.",
        8.2
    ),
    theBatman: movie(
        414906,
        'The Batman',
        '/74xTEgt7R36Fpooo50r9T25onhq.jpg',
        'A young Batman hunts the Riddler.',
        7.8
    ),
    joker: movie(
        475557,
        'Joker',
        '/udDclJoHjfjb8Ekgsd4FDteOkCU.jpg',
        'Arthur Fleck becomes the Joker.',
        8.4
    ),
    wonderWoman: movie(
        297762,
        'Wonder Woman',
        '/gfJGlDaHuWimTpvGLJuwWBF5DsF.jpg',
        'Diana of Themyscira fights in WWI.',
        7.4
    ),
    aquaman: movie(
        268896,
        'Aquaman',
        '/xLPffWMhMj1l50ND3KchMjYoKmE.jpg',
        'Arthur Curry claims his throne.',
        6.9
    ),
    shazam: movie(
        424783,
        'Shazam!',
        '/xnopI5Xtky18MPhK40cZAGAOVeV.jpg',
        'A boy becomes a superhero.',
        7.0
    ),
    suicideSquad: movie(
        436969,
        'The Suicide Squad',
        '/kb4s0ML0iVZlG6wAKbbs9NAm6X.jpg',
        'Task Force X on a deadly mission.',
        7.5
    ),
    manOfSteel: movie(
        49521,
        'Man of Steel',
        '/7rIPjn5TUK04O25ZkMyHrGNPgLx.jpg',
        'Superman origin story.',
        7.0
    ),
}

const DC_TV = {
    theBoys: tvShow(
        76479,
        'The Boys',
        '/stTEycfG9928HYGEISBFaG1ngjM.jpg',
        'Vigilantes take on corrupt superheroes.',
        8.5
    ),
    peacemaker: tvShow(
        88329,
        'Peacemaker',
        '/hE3LRZAY84fG19a18pzpkZERjTE.jpg',
        'John Cena as Peacemaker.',
        8.3
    ),
    thePenguin: tvShow(
        85422,
        'The Penguin',
        '/2cjrsf5p0SfIXjb7a4nF2sRmKVj.jpg',
        'Oswald Cobblepot rises in Gotham.',
        8.6
    ),
}

// ============================================================================
// Star Wars Content (⭐)
// ============================================================================
const STAR_WARS_MOVIES = {
    empireStrikesBack: movie(
        1891,
        'The Empire Strikes Back',
        '/nNAeTmF4CtdSgMDplXTDPOpYzsX.jpg',
        'The rebels face the Empire.',
        8.7
    ),
    newHope: movie(
        11,
        'Star Wars: A New Hope',
        '/6FfCtAuVAW8XJjZ7eWeLibRLWTw.jpg',
        'Luke Skywalker begins his journey.',
        8.6
    ),
    returnOfJedi: movie(
        1892,
        'Return of the Jedi',
        '/jQYlydvHm3kUix1f8prMucrplhm.jpg',
        'The final battle against the Empire.',
        8.3
    ),
    revengeOfSith: movie(
        1895,
        'Revenge of the Sith',
        '/xfSAoBEm9MNBjmlNcDYLvLSMlnq.jpg',
        'Anakin falls to the dark side.',
        7.4
    ),
    forceAwakens: movie(
        140607,
        'The Force Awakens',
        '/wqnLdwVXoBjKibFRR5U3y0Pb52n.jpg',
        'A new generation of heroes.',
        7.3
    ),
    rogueOne: movie(
        330459,
        'Rogue One: A Star Wars Story',
        '/i0yw1mFbB7sNGHCs7EXZPzFkdA1.jpg',
        'The mission to steal the Death Star plans.',
        7.8
    ),
    lastJedi: movie(
        181808,
        'The Last Jedi',
        '/kOVEVeg59E0wsnXmF9nrh6OmWII.jpg',
        'Rey trains with Luke Skywalker.',
        6.9
    ),
}

const STAR_WARS_TV = {
    mandalorian: tvShow(
        82856,
        'The Mandalorian',
        '/eU1i6eHXlzMOlEq0ku1Rzq7Y4wA.jpg',
        'A lone bounty hunter and the Child.',
        8.5
    ),
    andor: tvShow(
        92830,
        'Andor',
        '/59SVNwLfoMnZPPB6ukW6dlPxAdI.jpg',
        'Cassian Andor joins the rebellion.',
        8.4
    ),
    ahsoka: tvShow(
        114479,
        'Ahsoka',
        '/laCJxobHoPVaLQTKxc14Y2zV64J.jpg',
        'Ahsoka Tano searches for Ezra.',
        7.8
    ),
    obiWan: tvShow(
        114478,
        'Obi-Wan Kenobi',
        '/qJRB789ceLryrLvOKrZqLKr2CGf.jpg',
        'Obi-Wan watches over Luke.',
        7.1
    ),
    cloneWars: tvShow(
        4194,
        'The Clone Wars',
        '/e1nWfnnCVqxS2LeTO3dwGyAsG2V.jpg',
        'Animated adventures during the Clone Wars.',
        8.5
    ),
}

// ============================================================================
// Harry Potter Content (⚡)
// ============================================================================
const HARRY_POTTER_MOVIES = {
    philosophersStone: movie(
        671,
        "Harry Potter and the Philosopher's Stone",
        '/wuMc08IPKEatf9rnMNXvIDxqP4W.jpg',
        'Harry discovers he is a wizard.',
        7.9
    ),
    chamberOfSecrets: movie(
        672,
        'Harry Potter and the Chamber of Secrets',
        '/sdEOH0992YZ0QSxgXNIGLq1ToUi.jpg',
        'The Chamber of Secrets has been opened.',
        7.7
    ),
    prisonerOfAzkaban: movie(
        673,
        'Harry Potter and the Prisoner of Azkaban',
        '/aWxwnYoe8p2d2fcxOqtvAtJ72Rw.jpg',
        'Sirius Black escapes Azkaban.',
        8.0
    ),
    gobletOfFire: movie(
        674,
        'Harry Potter and the Goblet of Fire',
        '/fECBtHlr0RB3foNHDiCBXeg9Bv9.jpg',
        'The Triwizard Tournament.',
        7.8
    ),
    orderOfPhoenix: movie(
        675,
        'Harry Potter and the Order of the Phoenix',
        '/5aOyriWkPec0zUDxmHFP9qMgcgO.jpg',
        "Dumbledore's Army forms.",
        7.7
    ),
    halfBloodPrince: movie(
        767,
        'Harry Potter and the Half-Blood Prince',
        '/1stUIsjawROZxjiCMtqqXqgfZWC.jpg',
        'Dark secrets are revealed.',
        7.6
    ),
    deathlyHallows1: movie(
        12444,
        'Harry Potter and the Deathly Hallows: Part 1',
        '/maP4MTfPCeVD2FZYKiX3rTBKtEj.jpg',
        'The hunt for Horcruxes begins.',
        7.9
    ),
    deathlyHallows2: movie(
        12445,
        'Harry Potter and the Deathly Hallows: Part 2',
        '/c54HpQmuwXjHq2C9wmoACjxoom3.jpg',
        'The final battle at Hogwarts.',
        8.1
    ),
    fantasticBeasts: movie(
        259316,
        'Fantastic Beasts and Where to Find Them',
        '/1M91Bt3oGspda64LfKpPGgfNk6j.jpg',
        'Newt Scamander in 1920s New York.',
        7.3
    ),
}

// ============================================================================
// LOTR Content (🧙)
// ============================================================================
const LOTR_MOVIES = {
    fellowship: movie(
        120,
        'The Lord of the Rings: The Fellowship of the Ring',
        '/6oom5QYQ2yQTMJIbnvbkBL9cHo6.jpg',
        'Frodo begins his quest.',
        8.8
    ),
    twoTowers: movie(
        121,
        'The Lord of the Rings: The Two Towers',
        '/5VTN0pR8gcqV3EPUHHfMGnJYN9L.jpg',
        'The fellowship is broken.',
        8.7
    ),
    returnOfKing: movie(
        122,
        'The Lord of the Rings: The Return of the King',
        '/rCzpDGLbOoPwLjy3OAm5NUPOTrC.jpg',
        'The king returns to Gondor.',
        8.9
    ),
    unexpectedJourney: movie(
        49051,
        'The Hobbit: An Unexpected Journey',
        '/yHA9Fc37VmpUA5UncTxxo3rTGVA.jpg',
        'Bilbo joins the dwarves.',
        7.4
    ),
    desolationSmaug: movie(
        57158,
        'The Hobbit: The Desolation of Smaug',
        '/xQYiXsheRCDBA39iLfuDQVvf5P7.jpg',
        'The company faces Smaug.',
        7.8
    ),
    battleFiveArmies: movie(
        122917,
        'The Hobbit: The Battle of the Five Armies',
        '/xT98tLqatZPQApyRMLPjjKXoGJi.jpg',
        'The final battle for Middle-earth.',
        7.4
    ),
}

const LOTR_TV = {
    ringsOfPower: tvShow(
        84773,
        'The Lord of the Rings: The Rings of Power',
        '/mYLOqiStMxDK3fYZFirgrMt8z5d.jpg',
        'The Second Age of Middle-earth.',
        7.4
    ),
}

// ============================================================================
// Pixar Content (🎨)
// ============================================================================
const PIXAR_MOVIES = {
    toyStory: movie(
        862,
        'Toy Story',
        '/uXDfjJbdP4ijW5hWSBrPrlKpxab.jpg',
        'Toys come to life.',
        8.3
    ),
    findingNemo: movie(
        12,
        'Finding Nemo',
        '/eHuGQ10FUzK1mdOY69wF5pGgEf5.jpg',
        'A clownfish searches for his son.',
        8.1
    ),
    incredibles: movie(
        9806,
        'The Incredibles',
        '/2LqaLgk4Z226KkgPJuiOQ58wvrm.jpg',
        'A superhero family saves the world.',
        7.7
    ),
    up: movie(
        14160,
        'Up',
        '/vpbaStTMt8qqXaEgnOR2EE4DNJk.jpg',
        'An elderly man flies to Paradise Falls.',
        8.0
    ),
    insideOut: movie(
        150540,
        'Inside Out',
        '/aAmfIX3TT40zUHGcCKrlOZRKC7u.jpg',
        "Inside Riley's mind.",
        8.0
    ),
    insideOut2: movie(
        1022789,
        'Inside Out 2',
        '/vpnVM9B6NMmQpWeZvzLvDESb2QY.jpg',
        'Riley becomes a teenager.',
        7.6
    ),
    coco: movie(
        354912,
        'Coco',
        '/gGEsBPAijhVUFoiNpgZXqRVWJt2.jpg',
        "Miguel's journey to the Land of the Dead.",
        8.4
    ),
    ratatouille: movie(
        2062,
        'Ratatouille',
        '/npHNjldbeTHdKKw28bJKs7lzqzj.jpg',
        'A rat who dreams of being a chef.',
        8.0
    ),
    wallE: movie(
        10681,
        'WALL-E',
        '/hbhFnRzzg6ZDmm8YAmxBnQpQIPh.jpg',
        'A robot finds love in a wasteland.',
        8.4
    ),
    soul: movie(
        508442,
        'Soul',
        '/hm58Jw4Lw8OIeECIq5qyPYhAeRJ.jpg',
        'A jazz musician explores the afterlife.',
        8.1
    ),
}

// ============================================================================
// Disney Animation Content (👸)
// ============================================================================
const DISNEY_MOVIES = {
    lionKing: movie(
        8587,
        'The Lion King',
        '/sKCr78MXSLixwmZ8DyJLrpMsd15.jpg',
        "Simba's journey to become king.",
        8.5
    ),
    beautyBeast: movie(
        10020,
        'Beauty and the Beast',
        '/6ELJEQd1oTyYBPC6fzcVpJeAc4l.jpg',
        'A tale as old as time.',
        7.7
    ),
    frozen: movie(
        109445,
        'Frozen',
        '/kgwjIb2JDHRhNk13lmSxiClFjVk.jpg',
        'Anna sets out to find Elsa.',
        7.3
    ),
    moana: movie(
        277834,
        'Moana',
        '/4JeejGugONWpJkbnvL12hVoYEDa.jpg',
        "Moana's voyage across the ocean.",
        7.6
    ),
    tangled: movie(
        38757,
        'Tangled',
        '/ym7Kst6a4uqbkYzXOJn3obTlnQn.jpg',
        "Rapunzel's adventure outside her tower.",
        7.7
    ),
    littleMermaid: movie(
        10144,
        'The Little Mermaid',
        '/yu1MQDKOlI2OJVQu3wXjPNFbLQy.jpg',
        'Ariel dreams of the human world.',
        7.6
    ),
    aladdin: movie(
        812,
        'Aladdin',
        '/btFbigETjxpnKL0RvfNiFMniCbM.jpg',
        'A street rat finds a magic lamp.',
        7.6
    ),
    encanto: movie(
        568124,
        'Encanto',
        '/4j0PNHkMr5ax3IA8tjtxcmPU3QT.jpg',
        "Mirabel's magical family.",
        7.2
    ),
    mulan: movie(
        10674,
        'Mulan',
        '/iLJdwmzrHnY06npNhLBgCDN03j2.jpg',
        'Mulan disguises herself as a soldier.',
        7.8
    ),
    hercules: movie(
        10862,
        'Hercules',
        '/p77gXJMdEqmEkLazkTUbUCU8eWz.jpg',
        'Hercules becomes a hero.',
        7.3
    ),
}

// ============================================================================
// Horror Content (👻)
// ============================================================================
const HORROR_MOVIES = {
    shining: movie(
        694,
        'The Shining',
        '/9fgh3Ns3bSsS8hPFqxVgkMFxw1u.jpg',
        "Jack Torrance's descent into madness.",
        8.4
    ),
    getOut: movie(
        419430,
        'Get Out',
        '/tFXcEccSQMf3lfhfXKSU9iRBpa3.jpg',
        'A young man uncovers dark secrets.',
        7.7
    ),
    hereditary: movie(
        493922,
        'Hereditary',
        '/p9fmuz2Emvp7virGWpMl8u5j5aG.jpg',
        'A family haunted by tragedy.',
        7.3
    ),
    it: movie(
        346364,
        'It',
        '/9E2y5Q7WlCVNEhP5GiVTjhEhx1o.jpg',
        'Pennywise terrorizes children.',
        7.3
    ),
    conjuring: movie(
        138843,
        'The Conjuring',
        '/wVYREutTvI2tmxr6ujrHT704wGF.jpg',
        'Paranormal investigators face evil.',
        7.5
    ),
    quietPlace: movie(
        447332,
        'A Quiet Place',
        '/nAU74GmpUk7t5iklEp3bufwDq4n.jpg',
        'Silence means survival.',
        7.5
    ),
    midsommar: movie(
        530385,
        'Midsommar',
        '/7LEI8ulZzO5gy9Ww2NVCrKmHeDZ.jpg',
        'A Swedish festival turns deadly.',
        7.1
    ),
    us: movie(
        458723,
        'Us',
        '/ux2dU1jQ2ACIMShzB3yP93Udpzc.jpg',
        'A family faces their doppelgangers.',
        7.0
    ),
    nightmareElmSt: movie(
        377,
        'A Nightmare on Elm Street',
        '/wGTpGGRMZmyFCcrY2YoxVTIBlli.jpg',
        'Freddy Krueger haunts dreams.',
        7.4
    ),
    psycho: movie(
        539,
        'Psycho',
        '/yz4QVqPx3h1hD1DfqqQkCq3rmxW.jpg',
        'The Bates Motel hides secrets.',
        8.5
    ),
}

const HORROR_TV = {
    strangerThings: tvShow(
        66732,
        'Stranger Things',
        '/49WJfeN0moxb9IPfGn8AIqMGskD.jpg',
        'A boy vanishes into the Upside Down.',
        8.6
    ),
    hauntingHillHouse: tvShow(
        71712,
        'The Haunting of Hill House',
        '/xfBnQ4mgf1jYZsscJGJjGmHLflo.jpg',
        'A family haunted by their past.',
        8.4
    ),
    walkingDead: tvShow(
        1402,
        'The Walking Dead',
        '/n7PVu0hSz2sAsVekpOIoCnkWlbn.jpg',
        'Survivors face the zombie apocalypse.',
        8.1
    ),
    lastOfUs: tvShow(
        100088,
        'The Last of Us',
        '/uKvVjHNqB5VmOrdxqAt2F7J78ED.jpg',
        'Joel and Ellie cross a ravaged America.',
        8.7
    ),
}

// ============================================================================
// Sci-Fi Content (🚀)
// ============================================================================
const SCIFI_MOVIES = {
    interstellar: movie(
        157336,
        'Interstellar',
        '/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
        'A journey through a wormhole.',
        8.6
    ),
    inception: movie(
        27205,
        'Inception',
        '/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg',
        'Dreams within dreams.',
        8.4
    ),
    matrix: movie(
        603,
        'The Matrix',
        '/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg',
        'Reality is not what it seems.',
        8.7
    ),
    bladeRunner2049: movie(
        335984,
        'Blade Runner 2049',
        '/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg',
        'A new blade runner uncovers a secret.',
        8.0
    ),
    arrival: movie(
        329865,
        'Arrival',
        '/x2FJsf1ElAgr63Y3PNPtJrcmpoe.jpg',
        'Humanity makes first contact.',
        7.9
    ),
    dune: movie(
        438631,
        'Dune',
        '/d5NXSklXo0qyIYkgV94XAgMIckC.jpg',
        "Paul Atreides' destiny on Arrakis.",
        8.0
    ),
    dunePart2: movie(
        693134,
        'Dune: Part Two',
        '/8b8R8l88Qje9dn9OE8PY05Nxl1X.jpg',
        'Paul leads the Fremen.',
        8.5
    ),
    alien: movie(
        348,
        'Alien',
        '/vfrQk5IPloGg1v9Rzbh2Eg3VGyM.jpg',
        'In space, no one can hear you scream.',
        8.5
    ),
    terminator2: movie(
        280,
        'Terminator 2: Judgment Day',
        '/5M0j0B18abtBI5gi2RhfjjurTqb.jpg',
        'A cyborg protects John Connor.',
        8.6
    ),
    exMachina: movie(
        264660,
        'Ex Machina',
        '/btbRB7BrD887j5NrvjxceRDmaot.jpg',
        'Testing artificial intelligence.',
        7.6
    ),
}

const SCIFI_TV = {
    blackMirror: tvShow(
        42009,
        'Black Mirror',
        '/7PRddO7z7mcPi21nMtqKYh5Xix.jpg',
        'Dark tales of technology.',
        8.3
    ),
    expanse: tvShow(
        63639,
        'The Expanse',
        '/go2RsKA6dEgJXfcVBPVXEolL1lA.jpg',
        'Conflict in the solar system.',
        8.5
    ),
    westworld: tvShow(
        63247,
        'Westworld',
        '/8MfgyFHf7XEboZJPZXCIDqqiz6e.jpg',
        'A theme park of androids.',
        8.2
    ),
    severance: tvShow(
        95396,
        'Severance',
        '/pPHpeI2X1qEd1CS1SeyrdhZ4qnT.jpg',
        'Work and life memories are severed.',
        8.7
    ),
}

// ============================================================================
// Anime Content (🎌)
// ============================================================================
const ANIME_MOVIES = {
    spiritedAway: movie(
        129,
        'Spirited Away',
        '/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg',
        'Chihiro enters the spirit world.',
        8.5
    ),
    yourName: movie(
        372058,
        'Your Name',
        '/q719jXXEzOoYaps6babgKnONONX.jpg',
        'Two teenagers swap bodies.',
        8.5
    ),
    princessMononoke: movie(
        128,
        'Princess Mononoke',
        '/cMYCDADoLKLbB83g4WnJegaZimC.jpg',
        'Ashitaka seeks a cure.',
        8.3
    ),
    howlsMovingCastle: movie(
        4935,
        "Howl's Moving Castle",
        '/TkTPELv4kC3u1lkloush8skOjE.jpg',
        'Sophie is cursed by a witch.',
        8.4
    ),
    weatheringWithYou: movie(
        568160,
        'Weathering with You',
        '/qgrk7r1fV4IjuoeiGS5HOhXNdLJ.jpg',
        'A girl who can control the weather.',
        8.0
    ),
    akira: movie(
        149,
        'Akira',
        '/neZ0ykEsPqxamsX6o5QNUFILQrz.jpg',
        'Neo-Tokyo faces destruction.',
        8.1
    ),
    graveFireflies: movie(
        12477,
        'Grave of the Fireflies',
        '/k9TV1IXdT5c3x6FCzbpGlRTDheid.jpg',
        'Siblings survive wartime Japan.',
        8.5
    ),
    myNeighborTotoro: movie(
        8392,
        'My Neighbor Totoro',
        '/rtGDOeG9LzoerkDGZF9dnVeLppL.jpg',
        'Two sisters meet a forest spirit.',
        8.1
    ),
}

const ANIME_TV = {
    attackOnTitan: tvShow(
        1429,
        'Attack on Titan',
        '/hTP1DtLGFamjfu8WqjnuQdP1n4i.jpg',
        'Humanity fights giant Titans.',
        9.1
    ),
    demonSlayer: tvShow(
        85937,
        'Demon Slayer',
        '/xUfRZu2mi8jH6SzQEJGP6tj2lqg.jpg',
        'Tanjiro hunts demons.',
        8.7
    ),
    deathNote: tvShow(
        13916,
        'Death Note',
        '/g8vHCgxTl5RRzNpybuFPC6v1Kvn.jpg',
        'A notebook that kills.',
        9.0
    ),
    onePiece: tvShow(
        37854,
        'One Piece',
        '/fcXdJlbSdUEeMSJFsXKsznGwwok.jpg',
        'Luffy searches for the One Piece.',
        8.7
    ),
    fullmetalAlchemist: tvShow(
        31911,
        'Fullmetal Alchemist: Brotherhood',
        '/8GgqnXjAJSBwqKCaI1bsxg05Ib7.jpg',
        "Brothers seek the Philosopher's Stone.",
        9.1
    ),
    jujutsuKaisen: tvShow(
        95479,
        'Jujutsu Kaisen',
        '/hFWP5HkbVEe40hrXgtCeQxoccHE.jpg',
        'Yuji becomes a sorcerer.',
        8.6
    ),
}

// ============================================================================
// True Crime Content (🔍)
// ============================================================================
const TRUE_CRIME_MOVIES = {
    zodiac: movie(
        1949,
        'Zodiac',
        '/vLXSe0srWmFKHHn8T7x6f5mSH5W.jpg',
        'The hunt for the Zodiac killer.',
        7.7
    ),
    wolfWallStreet: movie(
        106646,
        'The Wolf of Wall Street',
        '/34m2tygAYBGqA9MXKhRDtzYd4MR.jpg',
        "Jordan Belfort's rise and fall.",
        8.2
    ),
    godfather: movie(
        238,
        'The Godfather',
        '/3bhkrj58Vtu7enYsRolD1fZdja1.jpg',
        'The Corleone family saga.',
        9.2
    ),
    goodfellas: movie(
        769,
        'GoodFellas',
        '/aKuFiU82s5ISJpGZp7YkIr3kCUd.jpg',
        "Henry Hill's mob life.",
        8.7
    ),
    departed: movie(
        1422,
        'The Departed',
        '/nT97ifVT2J1yMQmeq20Qblg61T.jpg',
        'Undercover in the Boston mob.',
        8.5
    ),
    americanGangster: movie(
        4982,
        'American Gangster',
        '/yi9gJEXKDPkv7SIFgXmCRtWzWzw.jpg',
        'Frank Lucas builds a drug empire.',
        7.8
    ),
    sicario: movie(
        273481,
        'Sicario',
        '/p0WwDKJOEcDqx8eX8qMuNuQpg6d.jpg',
        'The war on drugs at the border.',
        7.6
    ),
}

const TRUE_CRIME_TV = {
    breakingBad: tvShow(
        1396,
        'Breaking Bad',
        '/ggFHVNu6YYI5L9pCfOacjizRGt.jpg',
        'A teacher becomes a meth kingpin.',
        9.5
    ),
    betterCallSaul: tvShow(
        60059,
        'Better Call Saul',
        '/fC2HDm5t0kHl7mTm7jxMR31b7by.jpg',
        'Jimmy McGill becomes Saul Goodman.',
        8.9
    ),
    mindhunter: tvShow(
        67744,
        'Mindhunter',
        '/7aNrTYiU5kRBYrqW25yqZ3JPQcx.jpg',
        'FBI agents interview serial killers.',
        8.6
    ),
    narcos: tvShow(
        63351,
        'Narcos',
        '/rTmal9fDbwh5F0waol2hq35U4ah.jpg',
        'The rise and fall of Pablo Escobar.',
        8.8
    ),
    peakyBlinders: tvShow(
        60574,
        'Peaky Blinders',
        '/vUUqzWa2LnHIVqkaKVlVGkVcZIW.jpg',
        'A gangster family in 1920s Birmingham.',
        8.6
    ),
    ozark: tvShow(
        69740,
        'Ozark',
        '/pCqpZh6sFBsuuqvaeYoH48lJEWq.jpg',
        'A family launders money for a cartel.',
        8.5
    ),
}

// ============================================================================
// Comedy Content (😂)
// ============================================================================
const COMEDY_MOVIES = {
    superbad: movie(
        8363,
        'Superbad',
        '/ek8e8txUyUwd2BNqj6lFEerJfms.jpg',
        'Teens try to buy alcohol.',
        7.6
    ),
    hangover: movie(
        18785,
        'The Hangover',
        '/uluhlXubGu1VxU63X9VHCLWDAYP.jpg',
        'A bachelor party goes wrong.',
        7.7
    ),
    stepBrothers: movie(
        12133,
        'Step Brothers',
        '/t6lXPQBHZoxLLDLkm5txkPB8kKT.jpg',
        'Two grown men become stepbrothers.',
        6.9
    ),
    bridesmaids: movie(
        50014,
        'Bridesmaids',
        '/qzZCbpWvnNnkrxFQU4J5sDqblQk.jpg',
        'A maid of honor causes chaos.',
        6.8
    ),
    grandBudapest: movie(
        120467,
        'The Grand Budapest Hotel',
        '/eWdyYQreja6JGCzqHWXpWHDrrPo.jpg',
        'A concierge and his protege.',
        8.1
    ),
    anchorman: movie(
        8657,
        'Anchorman: The Legend of Ron Burgundy',
        '/QEyJvb4O4sAJkXdsDXELFWnb5b.jpg',
        'A 1970s news team.',
        7.2
    ),
    tropicThunder: movie(
        10201,
        'Tropic Thunder',
        '/k0dPIa8u61FGTh8RDNLhQ7Tm3jM.jpg',
        'Actors become real soldiers.',
        7.0
    ),
    dumbAndDumber: movie(
        8467,
        'Dumb and Dumber',
        '/4LdpBXiCyGKkR8FGHgjKlphrfUc.jpg',
        'Two idiots on a road trip.',
        7.3
    ),
}

const COMEDY_TV = {
    theOffice: tvShow(
        2316,
        'The Office',
        '/7DJKHzAi83BmQrWLrYYOqcoKfhR.jpg',
        'A documentary about office workers.',
        8.9
    ),
    parksAndRec: tvShow(
        8592,
        'Parks and Recreation',
        '/5IOj62y2Eb2ngyYmEn1IJ7bFhzH.jpg',
        'Leslie Knope runs Pawnee Parks.',
        8.6
    ),
    brooklyn99: tvShow(
        48891,
        'Brooklyn Nine-Nine',
        '/hgRMSOt7a1b8qyQR68vUixJPang.jpg',
        'Detectives in Brooklyn.',
        8.4
    ),
    schittsCreek: tvShow(
        64382,
        "Schitt's Creek",
        '/iQqWxNvV5k4kB4FY1aPLbqIHwP5.jpg',
        'A rich family loses everything.',
        8.4
    ),
    whatWeDoShadows: tvShow(
        83631,
        'What We Do in the Shadows',
        '/6ovk8nrrSmN1ieT14zBAxcHbMU7.jpg',
        'Vampire roommates in NYC.',
        8.5
    ),
    tedLasso: tvShow(
        97546,
        'Ted Lasso',
        '/5fhZdwP1DVJ0FyVH6vrFdHwpXIn.jpg',
        'An American coaches English football.',
        8.7
    ),
}

// ============================================================================
// Romance Content (💕)
// ============================================================================
const ROMANCE_MOVIES = {
    titanic: movie(
        597,
        'Titanic',
        '/9xjZS2rlVxm8SFx8kPC3aIGCOYQ.jpg',
        'Jack and Rose aboard the Titanic.',
        7.9
    ),
    notebook: movie(
        11036,
        'The Notebook',
        '/rNzQyW4f8B8cQeg7Dgj3n6eT5k9.jpg',
        'A love story across decades.',
        7.9
    ),
    laLaLand: movie(
        313369,
        'La La Land',
        '/uDO8zWDhfWwoFdKS4fzkUJt0Rf0.jpg',
        'Jazz pianist meets aspiring actress.',
        7.9
    ),
    prideAndPrejudice: movie(
        4348,
        'Pride & Prejudice',
        '/6WpOqFgkBVs6Y4CVqBgNpBQkyo9.jpg',
        'Elizabeth Bennet meets Mr. Darcy.',
        8.0
    ),
    aboutTime: movie(
        122906,
        'About Time',
        '/hZFqNdvWR0j2SGSRPZ7DERQ5PDf.jpg',
        'A man can travel through time.',
        7.8
    ),
    crazyRichAsians: movie(
        455207,
        'Crazy Rich Asians',
        '/gnTqi4nhIi1eesT5uYMmhEPGNih.jpg',
        "Rachel meets her boyfriend's family.",
        7.1
    ),
    whenHarryMetSally: movie(
        639,
        'When Harry Met Sally...',
        '/3Ht3wmoOAqHw2Ec2aSzRflMs6Ix.jpg',
        'Can men and women be friends?',
        7.6
    ),
    loveActually: movie(
        508,
        'Love Actually',
        '/7QPeComHzJFvJ8UnOMBDBLdei5N.jpg',
        'Interconnected love stories.',
        7.6
    ),
}

const ROMANCE_TV = {
    bridgerton: tvShow(
        91239,
        'Bridgerton',
        '/luoKpgVwi1E5nQsi7W0UuKHu2Rq.jpg',
        'Regency-era romance and scandal.',
        7.8
    ),
    normalPeople: tvShow(
        93740,
        'Normal People',
        '/9zHmHoA5M9oB1t6nXqGJyiHM7Mh.jpg',
        "Marianne and Connell's relationship.",
        8.3
    ),
    fleabag: tvShow(
        67070,
        'Fleabag',
        '/27vEYjGdLlAiDve0vYA5MR2MRCr.jpg',
        'A woman navigates life and love.',
        8.7
    ),
    outlander: tvShow(
        56570,
        'Outlander',
        '/7l7LAi0xeKCPvaDV7M3X5nE8KxH.jpg',
        'Claire travels through time.',
        8.3
    ),
}

// ============================================================================
// Action Content (💥)
// ============================================================================
const ACTION_MOVIES = {
    johnWick: movie(
        245891,
        'John Wick',
        '/fZPSd91yGE9fCcCe6OoQr6E3Bev.jpg',
        'A retired hitman seeks revenge.',
        7.4
    ),
    johnWick4: movie(
        603692,
        'John Wick: Chapter 4',
        '/vZloFAK7NmvMGKE7VkF5UHaz0I.jpg',
        'John Wick faces the High Table.',
        7.7
    ),
    madMaxFuryRoad: movie(
        76341,
        'Mad Max: Fury Road',
        '/8tZYtuWezp8JbcsvHYO0O46tFbo.jpg',
        'Max and Furiosa flee Immortan Joe.',
        8.1
    ),
    topGunMaverick: movie(
        361743,
        'Top Gun: Maverick',
        '/62HCnUTziyWcpDaBO2i1DX17ljH.jpg',
        'Maverick trains a new generation.',
        8.3
    ),
    missionImpossible7: movie(
        575264,
        'Mission: Impossible - Dead Reckoning Part One',
        '/NNxYkU70HPurnNCSiCjYAmacwm.jpg',
        'Ethan Hunt faces his greatest threat.',
        7.7
    ),
    darkKnightAction: movie(
        155,
        'The Dark Knight',
        '/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
        'Batman faces the Joker in Gotham.',
        9.0
    ),
    raid: movie(
        85414,
        'The Raid',
        '/zI7lO4CqGksS9qQKPRjYfElNMTo.jpg',
        'SWAT team raids a building.',
        7.6
    ),
    dieHard: movie(
        562,
        'Die Hard',
        '/yFihWxQcmqcaBR31QM6Y8gT6aYV.jpg',
        'John McClane fights terrorists.',
        7.8
    ),
    killBill1: movie(
        24,
        'Kill Bill: Vol. 1',
        '/v7TKVnburnnFet0YLp3xYk8tSoE.jpg',
        'The Bride seeks revenge.',
        8.1
    ),
}

const ACTION_TV = {
    theBoys: tvShow(
        76479,
        'The Boys',
        '/stTEycfG9928HYGEISBFaG1ngjM.jpg',
        'Vigilantes vs corrupt superheroes.',
        8.5
    ),
    reacher: tvShow(
        108978,
        'Reacher',
        '/oDCbONHtPljNWtPnlAKZoA3RPCU.jpg',
        'Jack Reacher investigates crimes.',
        8.1
    ),
    gameOfThrones: tvShow(
        1399,
        'Game of Thrones',
        '/1XS1oqL89opfnbLl8WnZY1O1uJx.jpg',
        'Noble families vie for the throne.',
        8.4
    ),
    houseOfDragon: tvShow(
        94997,
        'House of the Dragon',
        '/z2yahl2uefxDCl0nogcRBstwruJ.jpg',
        'The Targaryen civil war.',
        8.4
    ),
}

// ============================================================================
// Netflix Content (📺)
// ============================================================================
const NETFLIX_MOVIES = {
    glassOnion: movie(
        661374,
        'Glass Onion: A Knives Out Mystery',
        '/vDGr1YdrlfbU9wxTOdpf3zChmv9.jpg',
        'Benoit Blanc investigates a murder.',
        7.1
    ),
    dontLookUp: movie(
        646380,
        "Don't Look Up",
        '/th4E1yqsE8DGpAseLiUrI60Hf9V.jpg',
        'Scientists discover a comet.',
        7.2
    ),
    theAdamProject: movie(
        568124,
        'The Adam Project',
        '/4JeejGugONWpJkbnvL12hVoYEDa.jpg',
        'A pilot travels back in time.',
        6.7
    ),
    extraction: movie(
        545609,
        'Extraction',
        '/nygOUcBKPHFTbxsYRFZVePqgPK6.jpg',
        'A mercenary rescues a boy.',
        7.3
    ),
    theGrayMan: movie(
        718930,
        'The Gray Man',
        '/8cXbitsS6dWQ5gfMTZdorpW5Lha.jpg',
        'A CIA operative is hunted.',
        6.5
    ),
}

const NETFLIX_TV = {
    strangerThingsNet: tvShow(
        66732,
        'Stranger Things',
        '/49WJfeN0moxb9IPfGn8AIqMGskD.jpg',
        'Supernatural events in Hawkins.',
        8.6
    ),
    wednesday: tvShow(
        119051,
        'Wednesday',
        '/jeGtaMwGxPmQN5xM4ClnwPQcNQz.jpg',
        'Wednesday Addams at Nevermore.',
        8.1
    ),
    theWitcher: tvShow(
        71912,
        'The Witcher',
        '/cZ0d3rtvXPVvuiX22sP79K3Hmjz.jpg',
        'Geralt of Rivia hunts monsters.',
        8.0
    ),
    squidGame: tvShow(
        93405,
        'Squid Game',
        '/dDlEmu3EZ0Pgg93K2SVNLCjCSvE.jpg',
        'Deadly games for cash prizes.',
        7.8
    ),
    queensGambit: tvShow(
        87739,
        "The Queen's Gambit",
        '/zU0htwkhNvBQdVSIKB9s6hgVeFK.jpg',
        'A chess prodigy rises.',
        8.6
    ),
    darkNetflix: tvShow(
        70523,
        'Dark',
        '/apbrbWs8M9lyOpJYU5WXrpFbk1Z.jpg',
        'Time travel in a German town.',
        8.7
    ),
}

// ============================================================================
// RANKING TEMPLATES - 2+ rankings per tag
// ============================================================================
const RANKING_TEMPLATES = [
    // ========== MCU (🦸) - 2 rankings ==========
    {
        title: 'MCU: The Ultimate Top 10',
        description: 'The best films from the Marvel Cinematic Universe',
        movies: [
            MCU_MOVIES.endgame,
            MCU_MOVIES.infinityWar,
            MCU_MOVIES.civilWar,
            MCU_MOVIES.blackPanther,
            MCU_MOVIES.spiderManNWH,
            MCU_MOVIES.guardians,
            MCU_MOVIES.thorRagnarok,
            MCU_MOVIES.winterSoldier,
            MCU_MOVIES.avengers,
            MCU_MOVIES.ironMan,
        ],
        tvShows: [],
        tags: ['mcu'],
    },
    {
        title: 'MCU TV Shows Ranked',
        description: 'Disney+ Marvel series from best to... still pretty good',
        movies: [],
        tvShows: [MCU_TV.loki, MCU_TV.wandaVision, MCU_TV.falconWS],
        tags: ['mcu'],
    },

    // ========== DC (🦇) - 2 rankings ==========
    {
        title: 'DC Movies: Dark Knight Trilogy vs DCEU',
        description: 'Ranking the best DC Universe films',
        movies: [
            DC_MOVIES.darkKnight,
            DC_MOVIES.joker,
            DC_MOVIES.theBatman,
            DC_MOVIES.darkKnightRises,
            DC_MOVIES.batmanBegins,
            DC_MOVIES.wonderWoman,
            DC_MOVIES.suicideSquad,
            DC_MOVIES.shazam,
            DC_MOVIES.aquaman,
            DC_MOVIES.manOfSteel,
        ],
        tvShows: [],
        tags: ['dc'],
    },
    {
        title: 'Best Batman Films of All Time',
        description: 'The Caped Crusader on the big screen',
        movies: [
            DC_MOVIES.darkKnight,
            DC_MOVIES.theBatman,
            DC_MOVIES.darkKnightRises,
            DC_MOVIES.batmanBegins,
        ],
        tvShows: [],
        tags: ['dc'],
    },

    // ========== Star Wars (⭐) - 2 rankings ==========
    {
        title: 'Star Wars Movies Ranked',
        description: 'A galaxy far, far away - all films ranked',
        movies: [
            STAR_WARS_MOVIES.empireStrikesBack,
            STAR_WARS_MOVIES.newHope,
            STAR_WARS_MOVIES.returnOfJedi,
            STAR_WARS_MOVIES.revengeOfSith,
            STAR_WARS_MOVIES.rogueOne,
            STAR_WARS_MOVIES.forceAwakens,
            STAR_WARS_MOVIES.lastJedi,
        ],
        tvShows: [],
        tags: ['star-wars'],
    },
    {
        title: 'Star Wars TV: The Best of Disney+',
        description: 'Ranking the Star Wars streaming series',
        movies: [],
        tvShows: [
            STAR_WARS_TV.andor,
            STAR_WARS_TV.mandalorian,
            STAR_WARS_TV.cloneWars,
            STAR_WARS_TV.ahsoka,
            STAR_WARS_TV.obiWan,
        ],
        tags: ['star-wars'],
    },

    // ========== Harry Potter (⚡) - 2 rankings ==========
    {
        title: 'Harry Potter Films: Definitive Ranking',
        description: 'All 8 Harry Potter films ranked',
        movies: [
            HARRY_POTTER_MOVIES.prisonerOfAzkaban,
            HARRY_POTTER_MOVIES.deathlyHallows2,
            HARRY_POTTER_MOVIES.gobletOfFire,
            HARRY_POTTER_MOVIES.philosophersStone,
            HARRY_POTTER_MOVIES.halfBloodPrince,
            HARRY_POTTER_MOVIES.deathlyHallows1,
            HARRY_POTTER_MOVIES.orderOfPhoenix,
            HARRY_POTTER_MOVIES.chamberOfSecrets,
        ],
        tvShows: [],
        tags: ['harry-potter'],
    },
    {
        title: 'Wizarding World: Harry Potter + Fantastic Beasts',
        description: 'The complete Wizarding World on screen',
        movies: [
            HARRY_POTTER_MOVIES.prisonerOfAzkaban,
            HARRY_POTTER_MOVIES.deathlyHallows2,
            HARRY_POTTER_MOVIES.philosophersStone,
            HARRY_POTTER_MOVIES.fantasticBeasts,
        ],
        tvShows: [],
        tags: ['harry-potter'],
    },

    // ========== LOTR (🧙) - 2 rankings ==========
    {
        title: 'Lord of the Rings Trilogy Ranked',
        description: "Peter Jackson's epic Middle-earth trilogy",
        movies: [LOTR_MOVIES.returnOfKing, LOTR_MOVIES.fellowship, LOTR_MOVIES.twoTowers],
        tvShows: [],
        tags: ['lotr'],
    },
    {
        title: 'Complete Middle-earth: LOTR + Hobbit + Rings of Power',
        description: 'All of Middle-earth on screen',
        movies: [
            LOTR_MOVIES.returnOfKing,
            LOTR_MOVIES.fellowship,
            LOTR_MOVIES.twoTowers,
            LOTR_MOVIES.desolationSmaug,
            LOTR_MOVIES.unexpectedJourney,
            LOTR_MOVIES.battleFiveArmies,
        ],
        tvShows: [LOTR_TV.ringsOfPower],
        tags: ['lotr'],
    },

    // ========== Pixar (🎨) - 2 rankings ==========
    {
        title: 'Pixar Movies: The Best of the Best',
        description: 'Ranking the greatest Pixar films',
        movies: [
            PIXAR_MOVIES.coco,
            PIXAR_MOVIES.wallE,
            PIXAR_MOVIES.insideOut,
            PIXAR_MOVIES.toyStory,
            PIXAR_MOVIES.ratatouille,
            PIXAR_MOVIES.up,
            PIXAR_MOVIES.findingNemo,
            PIXAR_MOVIES.incredibles,
            PIXAR_MOVIES.soul,
            PIXAR_MOVIES.insideOut2,
        ],
        tvShows: [],
        tags: ['pixar'],
    },
    {
        title: 'Pixar Tearjerkers: Most Emotional Films',
        description: 'The Pixar movies that made us cry',
        movies: [
            PIXAR_MOVIES.coco,
            PIXAR_MOVIES.up,
            PIXAR_MOVIES.insideOut,
            PIXAR_MOVIES.soul,
            PIXAR_MOVIES.toyStory,
        ],
        tvShows: [],
        tags: ['pixar'],
    },

    // ========== Disney Animation (👸) - 2 rankings ==========
    {
        title: 'Disney Animation Renaissance & Beyond',
        description: 'The best Disney animated classics',
        movies: [
            DISNEY_MOVIES.lionKing,
            DISNEY_MOVIES.beautyBeast,
            DISNEY_MOVIES.aladdin,
            DISNEY_MOVIES.mulan,
            DISNEY_MOVIES.frozen,
            DISNEY_MOVIES.moana,
            DISNEY_MOVIES.tangled,
            DISNEY_MOVIES.encanto,
            DISNEY_MOVIES.littleMermaid,
            DISNEY_MOVIES.hercules,
        ],
        tvShows: [],
        tags: ['disney-renaissance'],
    },
    {
        title: 'Disney Princess Movies Ranked',
        description: 'Ranking the iconic Disney princess films',
        movies: [
            DISNEY_MOVIES.beautyBeast,
            DISNEY_MOVIES.mulan,
            DISNEY_MOVIES.tangled,
            DISNEY_MOVIES.moana,
            DISNEY_MOVIES.frozen,
            DISNEY_MOVIES.littleMermaid,
        ],
        tvShows: [],
        tags: ['disney-renaissance'],
    },

    // ========== Horror (👻) - 2 rankings ==========
    {
        title: 'Horror Movies That Actually Scared Me',
        description: 'The scariest films ever made',
        movies: [
            HORROR_MOVIES.hereditary,
            HORROR_MOVIES.shining,
            HORROR_MOVIES.getOut,
            HORROR_MOVIES.midsommar,
            HORROR_MOVIES.it,
            HORROR_MOVIES.conjuring,
            HORROR_MOVIES.quietPlace,
            HORROR_MOVIES.psycho,
            HORROR_MOVIES.nightmareElmSt,
            HORROR_MOVIES.us,
        ],
        tvShows: [],
        tags: ['horror'],
    },
    {
        title: 'Best Horror TV Series',
        description: 'Horror shows that keep you up at night',
        movies: [],
        tvShows: [
            HORROR_TV.lastOfUs,
            HORROR_TV.hauntingHillHouse,
            HORROR_TV.strangerThings,
            HORROR_TV.walkingDead,
        ],
        tags: ['horror'],
    },

    // ========== Sci-Fi (🚀) - 2 rankings ==========
    {
        title: 'Sci-Fi Masterpieces: Mind-Bending Films',
        description: 'Science fiction that makes you think',
        movies: [
            SCIFI_MOVIES.interstellar,
            SCIFI_MOVIES.matrix,
            SCIFI_MOVIES.inception,
            SCIFI_MOVIES.bladeRunner2049,
            SCIFI_MOVIES.arrival,
            SCIFI_MOVIES.dunePart2,
            SCIFI_MOVIES.dune,
            SCIFI_MOVIES.alien,
            SCIFI_MOVIES.exMachina,
            SCIFI_MOVIES.terminator2,
        ],
        tvShows: [],
        tags: ['sci-fi'],
    },
    {
        title: 'Best Sci-Fi TV Shows',
        description: 'The future is now on the small screen',
        movies: [],
        tvShows: [SCIFI_TV.severance, SCIFI_TV.blackMirror, SCIFI_TV.expanse, SCIFI_TV.westworld],
        tags: ['sci-fi'],
    },

    // ========== Anime (🎌) - 2 rankings ==========
    {
        title: 'Studio Ghibli: Greatest Films',
        description: "Miyazaki and Ghibli's finest",
        movies: [
            ANIME_MOVIES.spiritedAway,
            ANIME_MOVIES.princessMononoke,
            ANIME_MOVIES.howlsMovingCastle,
            ANIME_MOVIES.myNeighborTotoro,
            ANIME_MOVIES.graveFireflies,
        ],
        tvShows: [],
        tags: ['anime'],
    },
    {
        title: 'Best Anime Series of All Time',
        description: 'The greatest anime TV shows',
        movies: [],
        tvShows: [
            ANIME_TV.fullmetalAlchemist,
            ANIME_TV.attackOnTitan,
            ANIME_TV.deathNote,
            ANIME_TV.demonSlayer,
            ANIME_TV.jujutsuKaisen,
            ANIME_TV.onePiece,
        ],
        tags: ['anime'],
    },

    // ========== True Crime (🔍) - 2 rankings ==========
    {
        title: 'True Crime Movies: Based on Real Events',
        description: 'The best crime films inspired by true stories',
        movies: [
            TRUE_CRIME_MOVIES.godfather,
            TRUE_CRIME_MOVIES.goodfellas,
            TRUE_CRIME_MOVIES.departed,
            TRUE_CRIME_MOVIES.zodiac,
            TRUE_CRIME_MOVIES.wolfWallStreet,
            TRUE_CRIME_MOVIES.americanGangster,
            TRUE_CRIME_MOVIES.sicario,
        ],
        tvShows: [],
        tags: ['true-crime'],
    },
    {
        title: 'Crime Drama TV: The Best Series',
        description: 'Crime shows that became cultural phenomena',
        movies: [],
        tvShows: [
            TRUE_CRIME_TV.breakingBad,
            TRUE_CRIME_TV.betterCallSaul,
            TRUE_CRIME_TV.narcos,
            TRUE_CRIME_TV.peakyBlinders,
            TRUE_CRIME_TV.mindhunter,
            TRUE_CRIME_TV.ozark,
        ],
        tags: ['true-crime'],
    },

    // ========== Comedy (😂) - 2 rankings ==========
    {
        title: 'Funniest Movies Ever Made',
        description: 'Comedy films that never get old',
        movies: [
            COMEDY_MOVIES.grandBudapest,
            COMEDY_MOVIES.superbad,
            COMEDY_MOVIES.hangover,
            COMEDY_MOVIES.stepBrothers,
            COMEDY_MOVIES.anchorman,
            COMEDY_MOVIES.bridesmaids,
            COMEDY_MOVIES.dumbAndDumber,
        ],
        tvShows: [],
        tags: ['comedy'],
    },
    {
        title: 'Best Comedy TV Shows',
        description: 'Sitcoms and comedy series ranked',
        movies: [],
        tvShows: [
            COMEDY_TV.theOffice,
            COMEDY_TV.tedLasso,
            COMEDY_TV.schittsCreek,
            COMEDY_TV.parksAndRec,
            COMEDY_TV.brooklyn99,
            COMEDY_TV.whatWeDoShadows,
        ],
        tags: ['comedy'],
    },

    // ========== Romance (💕) - 2 rankings ==========
    {
        title: 'Most Romantic Movies of All Time',
        description: 'Love stories that warm the heart',
        movies: [
            ROMANCE_MOVIES.titanic,
            ROMANCE_MOVIES.prideAndPrejudice,
            ROMANCE_MOVIES.laLaLand,
            ROMANCE_MOVIES.notebook,
            ROMANCE_MOVIES.aboutTime,
            ROMANCE_MOVIES.whenHarryMetSally,
            ROMANCE_MOVIES.crazyRichAsians,
            ROMANCE_MOVIES.loveActually,
        ],
        tvShows: [],
        tags: ['romance'],
    },
    {
        title: 'Romantic TV Series Worth Watching',
        description: 'Love stories on the small screen',
        movies: [],
        tvShows: [
            ROMANCE_TV.fleabag,
            ROMANCE_TV.normalPeople,
            ROMANCE_TV.bridgerton,
            ROMANCE_TV.outlander,
        ],
        tags: ['romance'],
    },

    // ========== Action (💥) - 2 rankings ==========
    {
        title: 'Action Movies: Adrenaline Rush',
        description: 'High-octane action films',
        movies: [
            ACTION_MOVIES.madMaxFuryRoad,
            ACTION_MOVIES.darkKnightAction,
            ACTION_MOVIES.johnWick4,
            ACTION_MOVIES.johnWick,
            ACTION_MOVIES.topGunMaverick,
            ACTION_MOVIES.raid,
            ACTION_MOVIES.dieHard,
            ACTION_MOVIES.killBill1,
            ACTION_MOVIES.missionImpossible7,
        ],
        tvShows: [],
        tags: ['action'],
    },
    {
        title: 'Best Action TV Series',
        description: 'Action-packed shows to binge',
        movies: [],
        tvShows: [
            ACTION_TV.gameOfThrones,
            ACTION_TV.theBoys,
            ACTION_TV.houseOfDragon,
            ACTION_TV.reacher,
        ],
        tags: ['action'],
    },

    // ========== Netflix (📺) - 2 rankings ==========
    {
        title: 'Netflix Originals: Best Movies',
        description: 'Top Netflix original films',
        movies: [
            NETFLIX_MOVIES.glassOnion,
            NETFLIX_MOVIES.dontLookUp,
            NETFLIX_MOVIES.extraction,
            NETFLIX_MOVIES.theAdamProject,
            NETFLIX_MOVIES.theGrayMan,
        ],
        tvShows: [],
        tags: ['netflix-originals'],
    },
    {
        title: 'Netflix TV Shows Worth Binging',
        description: 'The best Netflix original series',
        movies: [],
        tvShows: [
            NETFLIX_TV.squidGame,
            NETFLIX_TV.strangerThingsNet,
            NETFLIX_TV.darkNetflix,
            NETFLIX_TV.queensGambit,
            NETFLIX_TV.wednesday,
            NETFLIX_TV.theWitcher,
        ],
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

        // Build items from movies and tvShows arrays
        const items: Content[] = [
            ...template.movies.filter(Boolean),
            ...template.tvShows.filter(Boolean),
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

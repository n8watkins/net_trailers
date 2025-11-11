/**
 * Seed Data Utility
 *
 * Populates the app with sample data for testing:
 * - Liked movies and TV shows
 * - Hidden movies and TV shows
 * - Custom collections
 * - Watch history
 * - Notifications
 */

import { Movie, TVShow } from '../typings'
import type { CreateNotificationRequest } from '../types/notifications'

// Sample movies for seeding (25 popular movies)
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
        backdrop_path: '/3h1JZGDhZ8nxha0qBqi05.jpg',
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
    {
        id: 27205,
        title: 'Inception',
        overview:
            'Cobb, a skilled thief who commits corporate espionage by infiltrating the subconscious of his targets is offered a chance to regain his old life.',
        poster_path: '/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg',
        backdrop_path: '/s3TBrRGB1iav7gFOCNx3H31MoES.jpg',
        release_date: '2010-07-16',
        vote_average: 8.4,
        vote_count: 34000,
        genre_ids: [28, 878, 12],
        media_type: 'movie',
    },
    {
        id: 129,
        title: 'Spirited Away',
        overview:
            'A young girl, Chihiro, becomes trapped in a strange new world of spirits. When her parents undergo a mysterious transformation, she must call upon the courage she never knew she had to free her family.',
        poster_path: '/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg',
        backdrop_path: '/Ab8mkHmkYADjU7wQiOkia9BzGvS.jpg',
        release_date: '2001-07-20',
        vote_average: 8.5,
        vote_count: 15000,
        genre_ids: [16, 10751, 14],
        media_type: 'movie',
    },
    {
        id: 122,
        title: 'The Lord of the Rings: The Return of the King',
        overview:
            "Aragorn is revealed as the heir to the ancient kings as he, Gandalf and the other members of the broken fellowship struggle to save Gondor from Sauron's forces.",
        poster_path: '/rCzpDGLbOoPwLjy3OAm5NUPOTrC.jpg',
        backdrop_path: '/2u7zbn8EudG6kLlBzUYqP8RyFU4.jpg',
        release_date: '2003-12-17',
        vote_average: 8.5,
        vote_count: 23000,
        genre_ids: [12, 14, 28],
        media_type: 'movie',
    },
    {
        id: 497,
        title: 'The Green Mile',
        overview:
            "A supernatural tale set on death row in a Southern prison, where gentle giant John Coffey possesses the mysterious power to heal people's ailments.",
        poster_path: '/velWPhVMQeQKcxggNEU8YmIo52R.jpg',
        backdrop_path: '/l6hQWH9eDksNJNiXWYRkWqikOdu.jpg',
        release_date: '1999-12-10',
        vote_average: 8.5,
        vote_count: 16000,
        genre_ids: [14, 18, 80],
        media_type: 'movie',
    },
    {
        id: 11216,
        title: 'Cinema Paradiso',
        overview:
            "A filmmaker recalls his childhood, when he fell in love with the movies at his village's theater and formed a deep friendship with the theater's projectionist.",
        poster_path: '/gCI2AeMV4IHSewhJkzsur5MEp6R.jpg',
        backdrop_path: '/3WZUOiFPhUa8nSVYp7PaJAELnQn.jpg',
        release_date: '1988-11-17',
        vote_average: 8.4,
        vote_count: 4000,
        genre_ids: [18, 10749],
        media_type: 'movie',
    },
    {
        id: 769,
        title: 'GoodFellas',
        overview:
            'The story of Henry Hill and his life in the mob, covering his relationship with his wife Karen Hill and his mob partners Jimmy Conway and Tommy DeVito.',
        poster_path: '/aKuFiU82s5ISJpGZp7YkIr3kCUd.jpg',
        backdrop_path: '/sw7mordbZxgITU877yTpZCud90M.jpg',
        release_date: '1990-09-12',
        vote_average: 8.5,
        vote_count: 12000,
        genre_ids: [18, 80],
        media_type: 'movie',
    },
    {
        id: 24428,
        title: 'The Avengers',
        overview:
            'When an unexpected enemy emerges and threatens global safety and security, Nick Fury assembles a team of superheroes to save the world.',
        poster_path: '/RYMX2wcKCBAr24UyPD7xwmjaTn.jpg',
        backdrop_path: '/9BBTo63ANSmhC4e6r62OJFuK2GL.jpg',
        release_date: '2012-04-25',
        vote_average: 7.7,
        vote_count: 28000,
        genre_ids: [878, 28, 12],
        media_type: 'movie',
    },
    {
        id: 299536,
        title: 'Avengers: Infinity War',
        overview:
            'As the Avengers and their allies have continued to protect the world from threats too large for any one hero to handle, a new danger has emerged from the cosmic shadows: Thanos.',
        poster_path: '/7WsyChQLEftFiDOVTGkv3hFpyyt.jpg',
        backdrop_path: '/lmZFxXgJE3vgrciwuDib0N8CfQo.jpg',
        release_date: '2018-04-25',
        vote_average: 8.3,
        vote_count: 27000,
        genre_ids: [12, 28, 14],
        media_type: 'movie',
    },
    {
        id: 603,
        title: 'The Matrix',
        overview:
            'Set in the 22nd century, The Matrix tells the story of a computer hacker who joins a group of underground insurgents fighting the vast and powerful computers who now rule the earth.',
        poster_path: '/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg',
        backdrop_path: '/fNG7i7RqMErkcqhohV2a6cV1Ehy.jpg',
        release_date: '1999-03-30',
        vote_average: 8.2,
        vote_count: 24000,
        genre_ids: [28, 878],
        media_type: 'movie',
    },
    {
        id: 120,
        title: 'The Lord of the Rings: The Fellowship of the Ring',
        overview:
            'Young hobbit Frodo Baggins, after inheriting a mysterious ring from his uncle Bilbo, must leave his home in order to keep it from falling into the hands of its evil creator.',
        poster_path: '/6oom5QYQ2yQTMJIbnvbkBL9cHo6.jpg',
        backdrop_path: '/pIUvQ9Ed35wlWhY2oU6OmwEsmzG.jpg',
        release_date: '2001-12-18',
        vote_average: 8.4,
        vote_count: 23000,
        genre_ids: [12, 14, 28],
        media_type: 'movie',
    },
    {
        id: 157336,
        title: 'Interstellar',
        overview:
            'The adventures of a group of explorers who make use of a newly discovered wormhole to surpass the limitations on human space travel and conquer the vast distances involved in an interstellar voyage.',
        poster_path: '/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
        backdrop_path: '/pbrkL804c8yAv3zBZR4QPEafpAR.jpg',
        release_date: '2014-11-05',
        vote_average: 8.4,
        vote_count: 32000,
        genre_ids: [12, 18, 878],
        media_type: 'movie',
    },
    {
        id: 389,
        title: '12 Angry Men',
        overview:
            'The defense and the prosecution have rested and the jury is filing into the jury room to decide if a young Spanish-American is guilty or innocent of murdering his father.',
        poster_path: '/ow3wq89wM8qd5X7hWKxiRfsFf9C.jpg',
        backdrop_path: '/qqHQsStV6exghCM7zbObuYBiYxw.jpg',
        release_date: '1957-04-10',
        vote_average: 8.5,
        vote_count: 8000,
        genre_ids: [18],
        media_type: 'movie',
    },
    {
        id: 539,
        title: 'Psycho',
        overview:
            'When larcenous real estate clerk Marion Crane goes on the lam with a wad of cash and hopes of starting a new life, she ends up at the notorious Bates Motel.',
        poster_path: '/yz4QVqPx3h1hD1DfqqQkCq3rmxW.jpg',
        backdrop_path: '/3md49VBi6ke20Da2UrM3XD6LdLY.jpg',
        release_date: '1960-06-22',
        vote_average: 8.4,
        vote_count: 11000,
        genre_ids: [27, 53],
        media_type: 'movie',
    },
    {
        id: 19404,
        title: 'Dilwale Dulhania Le Jayenge',
        overview:
            'Raj is a rich, carefree, happy-go-lucky second generation NRI. Simran is the daughter of Chaudhary Baldev Singh.',
        poster_path: '/lfRkUr7DYdHldAqi3PwdQGBRBPM.jpg',
        backdrop_path: '/90ez6ArvpO8bvpyIngBuwXOqJm5.jpg',
        release_date: '1995-10-20',
        vote_average: 8.7,
        vote_count: 4000,
        genre_ids: [35, 18, 10749],
        media_type: 'movie',
    },
    {
        id: 346,
        title: 'Seven Samurai',
        overview:
            'A samurai answers a village request for protection after he falls on hard times.',
        poster_path: '/8OKmBV5BUFzmozIC3pPWKHy17kx.jpg',
        backdrop_path: '/sJNNMCc6B7KZIY3LH3JMYJJNH5j.jpg',
        release_date: '1954-04-26',
        vote_average: 8.5,
        vote_count: 3300,
        genre_ids: [28, 18],
        media_type: 'movie',
    },
    {
        id: 510,
        title: "One Flew Over the Cuckoo's Nest",
        overview:
            'A criminal pleads insanity and is admitted to a mental institution, where he rebels against the oppressive nurse.',
        poster_path: '/2Sns5oMb47z8kSoAcwL6ywMa2Jb.jpg',
        backdrop_path: '/6u8kGMtxVL2MwJPJR0Yz1sUPDsF.jpg',
        release_date: '1975-11-19',
        vote_average: 8.4,
        vote_count: 15000,
        genre_ids: [18],
        media_type: 'movie',
    },
    {
        id: 429,
        title: 'The Good, the Bad and the Ugly',
        overview:
            'While the Civil War rages on, three men comb the American Southwest in search of a strongbox containing $200,000 in stolen gold.',
        poster_path: '/bX2xnavhMYjWDoZp1VM6VnU1xwe.jpg',
        backdrop_path: '/gvHPG2Pl9TQBbYpuBdqDLFGNfwT.jpg',
        release_date: '1966-12-23',
        vote_average: 8.5,
        vote_count: 7500,
        genre_ids: [37],
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
    {
        id: 1402,
        name: 'The Walking Dead',
        overview:
            'Sheriff Deputy Rick Grimes wakes up from a coma to learn the world is in ruins and must lead a group of survivors to stay alive.',
        poster_path: '/vxuoMW6YBt6UsxvMfRNwRl9LtWS.jpg',
        backdrop_path: '/wvdWb5kTQipdMDqCclC6Y3zr4j3.jpg',
        first_air_date: '2010-10-31',
        vote_average: 8.1,
        vote_count: 14000,
        genre_ids: [18, 10765],
        media_type: 'tv',
    },
    {
        id: 1668,
        name: 'Friends',
        overview:
            'The misadventures of a group of friends as they navigate the pitfalls of work, life and love in Manhattan.',
        poster_path: '/f496cm9enuEsZkSPzCwnTESEK5s.jpg',
        backdrop_path: '/efiX8iir6GEBWCD0Vz7cQSWX0L3.jpg',
        first_air_date: '1994-09-22',
        vote_average: 8.4,
        vote_count: 6000,
        genre_ids: [35],
        media_type: 'tv',
    },
    {
        id: 1434,
        name: 'Family Guy',
        overview:
            'Sick, twisted, politically incorrect and Freakin Sweet animated series featuring the adventures of the dysfunctional Griffin family.',
        poster_path: '/y0HUz4eUNUe3TeEd8fQWYazPaC7.jpg',
        backdrop_path: '/rT0W7Q8fZ0YP2jKHT1qQ0Y6TcQc.jpg',
        first_air_date: '1999-01-31',
        vote_average: 7.3,
        vote_count: 4000,
        genre_ids: [16, 35],
        media_type: 'tv',
    },
    {
        id: 1622,
        name: 'Supernatural',
        overview:
            'When they were boys, Sam and Dean Winchester lost their mother to a mysterious and demonic supernatural force.',
        poster_path: '/KoYWXbnYuS3b0GyQPkbuexlVK9.jpg',
        backdrop_path: '/o9OKe3M06QMLOzTl3l6GStYtnE9.jpg',
        first_air_date: '2005-09-13',
        vote_average: 8.3,
        vote_count: 5000,
        genre_ids: [18, 9648, 10765],
        media_type: 'tv',
    },
    {
        id: 46952,
        name: 'The Boys',
        overview:
            'A group of vigilantes known informally as "The Boys" set out to take down corrupt superheroes with no more than blue-collar grit and a willingness to fight dirty.',
        poster_path: '/2zmTngn1tYC1AvfnrFLhxeD82hz.jpg',
        backdrop_path: '/mGVrXeIHyEc89C4Uaj6Qp0LGLGw.jpg',
        first_air_date: '2019-07-26',
        vote_average: 8.5,
        vote_count: 8000,
        genre_ids: [10765, 10759],
        media_type: 'tv',
    },
    {
        id: 4057,
        name: 'Criminal Minds',
        overview:
            "An elite team of FBI profilers analyze the country's most twisted criminal minds, anticipating their next moves before they strike again.",
        poster_path: '/7TCwgX7oQKxcWYEhSPRmaHe6ULN.jpg',
        backdrop_path: '/85WoMVoN3S0mDyFBThXA5FLHHA3.jpg',
        first_air_date: '2005-09-22',
        vote_average: 8.3,
        vote_count: 3500,
        genre_ids: [80, 18, 9648],
        media_type: 'tv',
    },
    {
        id: 61889,
        name: 'Stranger Things',
        overview:
            'When a young boy vanishes, a small town uncovers a mystery involving secret experiments, terrifying supernatural forces, and one strange little girl.',
        poster_path: '/49WJfeN0moxb9IPfGn8AIqMGskD.jpg',
        backdrop_path: '/56v2KjBlU4XaOv9rVYEQypROD7P.jpg',
        first_air_date: '2016-07-15',
        vote_average: 8.6,
        vote_count: 16000,
        genre_ids: [18, 10765, 9648],
        media_type: 'tv',
    },
    {
        id: 37854,
        name: 'One Piece',
        overview:
            'Years ago, the fearsome Pirate King, Gol D. Roger was executed leaving a huge pile of treasure and the famous "One Piece" behind.',
        poster_path: '/cMD9Ygz11zjJzAovURpO75Qg7rT.jpg',
        backdrop_path: '/2rmK7mnchw9Xr3XdiTFSxTTLXqv.jpg',
        first_air_date: '1999-10-20',
        vote_average: 8.7,
        vote_count: 4500,
        genre_ids: [16, 35, 10759],
        media_type: 'tv',
    },
    {
        id: 95396,
        name: 'Severance',
        overview:
            'Mark Scout leads a team at Lumon Industries, whose employees have undergone a severance procedure, which surgically divides their memories between their work and personal lives.',
        poster_path: '/ux27XEb42I01CysCt5VnfpEYz1s.jpg',
        backdrop_path: '/cHMJVsZDOcEVXfuaLeOlJbGqWDV.jpg',
        first_air_date: '2022-02-18',
        vote_average: 8.8,
        vote_count: 1100,
        genre_ids: [18, 9648, 10765],
        media_type: 'tv',
    },
    {
        id: 84773,
        name: 'The Lord of the Rings: The Rings of Power',
        overview:
            'Beginning in a time of relative peace, we follow an ensemble cast of characters as they confront the re-emergence of evil to Middle-earth.',
        poster_path: '/mYLOqiStMxDK3fYZFirgrMt8z5d.jpg',
        backdrop_path: '/1syhqGHEZIyvvtDnbqwVLs14IDN.jpg',
        first_air_date: '2022-09-01',
        vote_average: 7.4,
        vote_count: 2800,
        genre_ids: [10759, 10765, 18],
        media_type: 'tv',
    },
    {
        id: 60574,
        name: 'Peaky Blinders',
        overview:
            'A gangster family epic set in 1919 Birmingham, England and centered on a gang who sew razor blades in the peaks of their caps.',
        poster_path: '/vUUqzWa2LnHIVqkaKVlVGkVcZIW.jpg',
        backdrop_path: '/wiE9doxiLwq3WCGamDIOb2PqBqc.jpg',
        first_air_date: '2013-09-12',
        vote_average: 8.5,
        vote_count: 6500,
        genre_ids: [18, 80],
        media_type: 'tv',
    },
    {
        id: 87108,
        name: 'Chernobyl',
        overview:
            'The true story of one of the worst man-made catastrophes in history: the catastrophic nuclear accident at Chernobyl.',
        poster_path: '/hlLXt2tOPT6RRnjiUmoxyG1LTFi.jpg',
        backdrop_path: '/900tHlUYUkp7Ol04XFSoAaEIXcT.jpg',
        first_air_date: '2019-05-06',
        vote_average: 8.7,
        vote_count: 5800,
        genre_ids: [18],
        media_type: 'tv',
    },
]

export interface SeedDataOptions {
    likedCount?: number
    hiddenCount?: number
    watchHistoryCount?: number
    watchLaterCount?: number
    createCollections?: boolean
    notificationCount?: number
}

/**
 * Seeds user data with sample content
 */
export async function seedUserData(userId: string, options: SeedDataOptions = {}): Promise<void> {
    const {
        likedCount = 10,
        hiddenCount = 5,
        watchHistoryCount = 15,
        watchLaterCount = 12,
        createCollections = true,
        notificationCount = 8,
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
            await useGuestStore.getState().addLikedMovie(item)
        } else {
            await useAuthStore.getState().addLikedMovie(item)
        }
    }

    // Seed hidden content
    const hiddenContent = shuffled.slice(likedCount, likedCount + hiddenCount)
    console.log(`  👁️ Adding ${hiddenCount} hidden items`)

    for (const item of hiddenContent) {
        if (isGuest) {
            await useGuestStore.getState().addHiddenMovie(item)
        } else {
            await useAuthStore.getState().addHiddenMovie(item)
        }
    }

    // Seed Watch Later (default watchlist)
    const watchLaterContent = shuffled.slice(
        likedCount + hiddenCount,
        likedCount + hiddenCount + watchLaterCount
    )
    console.log(`  📺 Adding ${watchLaterCount} items to Watch Later`)

    for (const item of watchLaterContent) {
        if (isGuest) {
            await useGuestStore.getState().addToWatchlist(item)
        } else {
            await useAuthStore.getState().addToWatchlist(item)
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
                name: 'Epic Sci-Fi Adventures',
                emoji: '🚀',
                color: '#3B82F6',
                items: [sampleMovies[8], sampleMovies[16], sampleMovies[18], sampleTVShows[3]], // Inception, Matrix, Interstellar, Rick & Morty
            },
            {
                name: 'Mind-Bending Thrillers',
                emoji: '🧠',
                color: '#8B5CF6',
                items: [sampleMovies[0], sampleMovies[1], sampleMovies[20], sampleMovies[19]], // Fight Club, Pulp Fiction, Psycho, 12 Angry Men
            },
            {
                name: 'Animated Masterpieces',
                emoji: '🎨',
                color: '#EC4899',
                items: [
                    sampleMovies[7],
                    sampleMovies[9],
                    sampleTVShows[2],
                    sampleTVShows[3],
                    sampleTVShows[15],
                ], // Your Name, Spirited Away, Arcane, Rick & Morty, One Piece
            },
            {
                name: 'Crime & Drama Classics',
                emoji: '🎭',
                color: '#EF4444',
                items: [sampleMovies[5], sampleMovies[4], sampleMovies[13], sampleTVShows[0]], // Godfather, Shawshank, GoodFellas, Breaking Bad
            },
            {
                name: 'Epic Fantasy Sagas',
                emoji: '⚔️',
                color: '#10B981',
                items: [sampleMovies[10], sampleMovies[17], sampleTVShows[1], sampleTVShows[17]], // LOTR Return, LOTR Fellowship, GoT, Rings of Power
            },
            {
                name: 'Marvel Universe',
                emoji: '🦸',
                color: '#F59E0B',
                items: [sampleMovies[14], sampleMovies[15], sampleTVShows[5], sampleTVShows[4]], // Avengers, Infinity War, WandaVision, Mandalorian
            },
            {
                name: 'Comfort Classics',
                emoji: '☕',
                color: '#06B6D4',
                items: [sampleMovies[2], sampleMovies[12], sampleTVShows[9], sampleTVShows[14]], // Forrest Gump, Cinema Paradiso, Friends, Stranger Things
            },
            {
                name: 'Dark & Mysterious',
                emoji: '🌙',
                color: '#6366F1',
                items: [sampleTVShows[8], sampleTVShows[11], sampleTVShows[16], sampleTVShows[14]], // Walking Dead, Supernatural, Severance, Stranger Things
            },
        ]

        for (const collection of collections) {
            // Create the list first
            let listId: string
            if (isGuest) {
                listId = await useGuestStore.getState().createList({
                    name: collection.name,
                    emoji: collection.emoji,
                    color: collection.color,
                    collectionType: 'manual',
                    isPublic: false,
                })
            } else {
                listId = await useAuthStore.getState().createList({
                    name: collection.name,
                    emoji: collection.emoji,
                    color: collection.color,
                    collectionType: 'manual',
                    isPublic: false,
                })
            }

            // Add items to the created collection
            for (const item of collection.items) {
                if (isGuest) {
                    await useGuestStore.getState().addToList(listId, item)
                } else {
                    await useAuthStore.getState().addToList(listId, item)
                }
            }

            // Small delay to ensure unique timestamps
            await new Promise((resolve) => setTimeout(resolve, 10))
        }
    }

    // Seed notifications (only for authenticated users)
    if (!isGuest && notificationCount > 0) {
        console.log(`  🔔 Creating ${notificationCount} sample notifications`)

        // Import notification store dynamically
        const { useNotificationStore } = await import('../stores/notificationStore')

        const sampleNotifications: CreateNotificationRequest[] = [
            {
                type: 'trending_update',
                title: 'New Trending Movie',
                message: 'The Dark Knight just entered the top 10 trending movies!',
                contentId: 155,
                imageUrl: 'https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
                actionUrl: '/movie/155',
            },
            {
                type: 'trending_update',
                title: 'Trending Series Alert',
                message: 'Breaking Bad is now #1 on trending TV shows!',
                contentId: 1396,
                imageUrl: 'https://image.tmdb.org/t/p/w500/ggFHVNu6YYI5L9pCfOacjizRGt.jpg',
                actionUrl: '/tv/1396',
            },
            {
                type: 'new_release',
                title: 'New Season Available',
                message: 'Stranger Things Season 5 is now available to stream!',
                contentId: 61889,
                imageUrl: 'https://image.tmdb.org/t/p/w500/49WJfeN0moxb9IPfGn8AIqMGskD.jpg',
                actionUrl: '/tv/61889',
            },
            {
                type: 'collection_update',
                title: 'Collection Updated',
                message: 'Marvel Universe collection has 3 new titles added',
                actionUrl: '/collections',
            },
            {
                type: 'trending_update',
                title: 'Trending This Week',
                message: 'Inception is gaining popularity - watch it before it leaves!',
                contentId: 27205,
                imageUrl: 'https://image.tmdb.org/t/p/w500/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg',
                actionUrl: '/movie/27205',
            },
            {
                type: 'system',
                title: 'New Feature Available',
                message: 'Check out the new watch history tracking feature!',
                actionUrl: '/watch-history',
            },
            {
                type: 'new_release',
                title: 'Highly Anticipated Release',
                message: 'The sequel to Interstellar is coming next month!',
                contentId: 157336,
                imageUrl: 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
                actionUrl: '/movie/157336',
            },
            {
                type: 'trending_update',
                title: 'Must-Watch Alert',
                message: 'Arcane Season 2 is breaking viewership records!',
                contentId: 94605,
                imageUrl: 'https://image.tmdb.org/t/p/w500/fqldf2t8ztc9aiwn3k6mlX3tvRT.jpg',
                actionUrl: '/tv/94605',
            },
        ]

        // Create notifications with varying timestamps
        for (let i = 0; i < Math.min(notificationCount, sampleNotifications.length); i++) {
            try {
                await useNotificationStore
                    .getState()
                    .createNotification(userId, sampleNotifications[i])
                // Small delay between notifications
                await new Promise((resolve) => setTimeout(resolve, 100))
            } catch (error) {
                console.error(`Failed to create notification ${i}:`, error)
            }
        }
    }

    // Wait a bit to ensure all async saves complete before page reload
    console.log('⏳ Waiting for all saves to complete...')
    await new Promise((resolve) => setTimeout(resolve, 2000))

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

/**
 * Ready-made example moods for the AI search. Each has a saved result set in
 * public/example-moods/<id>.json (regenerate with
 * `npx tsx scripts/generate-example-moods.ts`), so clicking one works instantly
 * and never spends AI quota, even with no Gemini key.
 */

export interface ExampleMood {
    id: string
    label: string
    emoji: string
    /** Curated titles the script resolves on TMDB (year disambiguates). */
    picks: { title: string; year: number; type: 'movie' | 'tv' }[]
}

export const EXAMPLE_MOODS: ExampleMood[] = [
    {
        id: 'cozy-rainy-day-mysteries',
        label: 'Cozy rainy-day mysteries',
        emoji: '🌧️',
        picks: [
            { title: 'Knives Out', year: 2019, type: 'movie' },
            { title: 'Glass Onion: A Knives Out Mystery', year: 2022, type: 'movie' },
            { title: 'Only Murders in the Building', year: 2021, type: 'tv' },
            { title: 'Murder on the Orient Express', year: 2017, type: 'movie' },
            { title: 'Clue', year: 1985, type: 'movie' },
            { title: 'Gosford Park', year: 2001, type: 'movie' },
            { title: 'Enola Holmes', year: 2020, type: 'movie' },
            { title: 'See How They Run', year: 2022, type: 'movie' },
            { title: 'A Haunting in Venice', year: 2023, type: 'movie' },
            { title: "Miss Fisher's Murder Mysteries", year: 2012, type: 'tv' },
            { title: 'The Thin Man', year: 1934, type: 'movie' },
            { title: 'Death on the Nile', year: 2022, type: 'movie' },
        ],
    },
    {
        id: '90s-action-with-heart',
        label: '90s action with heart',
        emoji: '💥',
        picks: [
            { title: 'Terminator 2: Judgment Day', year: 1991, type: 'movie' },
            { title: 'Speed', year: 1994, type: 'movie' },
            { title: 'The Fugitive', year: 1993, type: 'movie' },
            { title: 'Die Hard with a Vengeance', year: 1995, type: 'movie' },
            { title: 'The Rock', year: 1996, type: 'movie' },
            { title: 'Face/Off', year: 1997, type: 'movie' },
            { title: 'Point Break', year: 1991, type: 'movie' },
            { title: 'True Lies', year: 1994, type: 'movie' },
            { title: 'Air Force One', year: 1997, type: 'movie' },
            { title: 'Twister', year: 1996, type: 'movie' },
            { title: 'Independence Day', year: 1996, type: 'movie' },
            { title: 'Con Air', year: 1997, type: 'movie' },
        ],
    },
    {
        id: 'mind-bending-sci-fi',
        label: 'Mind-bending sci-fi',
        emoji: '🌀',
        picks: [
            { title: 'Inception', year: 2010, type: 'movie' },
            { title: 'Arrival', year: 2016, type: 'movie' },
            { title: 'Interstellar', year: 2014, type: 'movie' },
            { title: 'The Matrix', year: 1999, type: 'movie' },
            { title: 'Ex Machina', year: 2015, type: 'movie' },
            { title: 'Dark', year: 2017, type: 'tv' },
            { title: 'Coherence', year: 2013, type: 'movie' },
            { title: 'Predestination', year: 2014, type: 'movie' },
            { title: 'Annihilation', year: 2018, type: 'movie' },
            { title: 'Source Code', year: 2011, type: 'movie' },
            { title: 'Primer', year: 2004, type: 'movie' },
            { title: 'Severance', year: 2022, type: 'tv' },
        ],
    },
    {
        id: 'feel-good-underdogs',
        label: 'Feel-good underdogs',
        emoji: '🏆',
        picks: [
            { title: 'Rocky', year: 1976, type: 'movie' },
            { title: 'Cool Runnings', year: 1993, type: 'movie' },
            { title: 'Ted Lasso', year: 2020, type: 'tv' },
            { title: 'Remember the Titans', year: 2000, type: 'movie' },
            { title: 'Rudy', year: 1993, type: 'movie' },
            { title: 'Eddie the Eagle', year: 2016, type: 'movie' },
            { title: 'Moneyball', year: 2011, type: 'movie' },
            { title: 'Little Miss Sunshine', year: 2006, type: 'movie' },
            { title: 'The Karate Kid', year: 1984, type: 'movie' },
            { title: 'School of Rock', year: 2003, type: 'movie' },
            { title: 'The Mighty Ducks', year: 1992, type: 'movie' },
            { title: 'Hoosiers', year: 1986, type: 'movie' },
        ],
    },
    {
        id: 'animated-films-that-hit-deep',
        label: 'Animated films that hit deep',
        emoji: '🎨',
        picks: [
            { title: 'Up', year: 2009, type: 'movie' },
            { title: 'Inside Out', year: 2015, type: 'movie' },
            { title: 'Coco', year: 2017, type: 'movie' },
            { title: 'Spirited Away', year: 2001, type: 'movie' },
            { title: 'WALL·E', year: 2008, type: 'movie' },
            { title: 'Grave of the Fireflies', year: 1988, type: 'movie' },
            { title: 'The Iron Giant', year: 1999, type: 'movie' },
            { title: 'Your Name.', year: 2016, type: 'movie' },
            { title: 'Toy Story 3', year: 2010, type: 'movie' },
            { title: 'Soul', year: 2020, type: 'movie' },
            { title: 'Spider-Man: Into the Spider-Verse', year: 2018, type: 'movie' },
            { title: 'Wolfwalkers', year: 2020, type: 'movie' },
        ],
    },
]

export const EXAMPLE_MOOD_IDS = new Set(EXAMPLE_MOODS.map((mood) => mood.id))

export function getExampleMood(id: string | null | undefined): ExampleMood | undefined {
    return EXAMPLE_MOODS.find((mood) => mood.id === id)
}

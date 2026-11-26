/**
 * @jest-environment node
 *
 * Every content route filters by the server's Child Safety Mode
 * (lib/childSafetyServer.ts), not by what the request asks for:
 * - mode on, no `childSafetyMode` parameter: filtered;
 * - mode on, `childSafetyMode=false`: still filtered;
 * - mode off: unchanged (the titles the mode hides come back);
 * - a single blocked title by id: blocked.
 *
 * TMDB is a fake answering by path, with titles the mode must hide (an R
 * film, a TV-MA show, an adult film, an adult performer) next to ones it
 * keeps. A response is checked as text, so whatever its shape, no hidden
 * name may appear in it.
 */

import { NextRequest } from 'next/server'

import { auth } from '@/auth'

import { GET as searchGET } from '@/app/api/search/route'
import { GET as searchPeopleGET } from '@/app/api/search/people/route'
import { GET as moviesTrendingGET } from '@/app/api/movies/trending/route'
import { GET as tvTrendingGET } from '@/app/api/tv/trending/route'
import { GET as moviesTopRatedGET } from '@/app/api/movies/top-rated/route'
import { GET as tvTopRatedGET } from '@/app/api/tv/top-rated/route'
import { GET as moviesGenreGET } from '@/app/api/movies/genre/[genre]/route'
import { GET as genresGET } from '@/app/api/genres/[type]/[id]/route'
import { GET as discoverGET } from '@/app/api/discover/route'
import { GET as byActorGET } from '@/app/api/discover/by-actor/route'
import { GET as randomGET } from '@/app/api/random-content/route'
import { GET as similarGET } from '@/app/api/recommendations/similar/[id]/route'
import { GET as genrePreviewsGET } from '@/app/api/recommendations/genre-previews/route'
import { POST as preferenceContentPOST } from '@/app/api/recommendations/preference-content/route'
import { POST as smartPreviewPOST } from '@/app/api/smart-suggestions/preview/route'
import { GET as customRowGET } from '@/app/api/custom-rows/[id]/content/route'
import { GET as creditsGET } from '@/app/api/people/[id]/credits/route'
import { GET as peopleTrendingGET } from '@/app/api/people/trending/route'
import { GET as personGET } from '@/app/api/people/[id]/route'
import { GET as contentGET } from '@/app/api/content/[id]/route'
import { GET as movieDetailsGET } from '@/app/api/movies/details/[id]/route'
import { GET as tvDetailsGET } from '@/app/api/tv/details/[id]/route'
import { GET as imagesGET } from '@/app/api/images/[mediaType]/[id]/route'

/* ------------------------------------------------------------------ */
/*  Who is asking                                                      */
/* ------------------------------------------------------------------ */

let guestCookie: string | undefined
jest.mock('next/headers', () => ({
    cookies: async () => ({
        get: (name: string) =>
            name === 'nettrailer_child_safety' && guestCookie !== undefined
                ? { name, value: guestCookie }
                : undefined,
        set: jest.fn(),
    }),
    headers: async () => new Headers(),
}))

let storedMode = false
jest.mock('@/db/queries/userPreferences', () => ({
    ...jest.requireActual('@/db/queries/userPreferences'),
    loadChildSafetyMode: jest.fn(async () => storedMode),
    // The custom-rows route reads hidden titles for a signed-in visitor.
    loadUserPreferences: jest.fn(async () => ({ hiddenMovies: [] })),
}))

const mockAuth = auth as unknown as jest.Mock

type Visitor = 'guest-off' | 'guest-on' | 'signed-in-on' | 'signed-in-off-cookie-on'

function become(visitor: Visitor) {
    const signedIn = visitor.startsWith('signed-in')
    mockAuth.mockResolvedValue(
        signedIn
            ? { user: { id: 'u1', email: 'u1@test.dev' }, expires: '2999-01-01T00:00:00.000Z' }
            : null
    )
    storedMode = visitor === 'signed-in-on'
    guestCookie =
        visitor === 'guest-on' || visitor === 'signed-in-off-cookie-on' ? 'true' : undefined
}

/* ------------------------------------------------------------------ */
/*  A fake TMDB                                                         */
/* ------------------------------------------------------------------ */

const HIDDEN = [
    'Fixture R Film',
    'Fixture Mature Show',
    'Fixture Adult Film',
    'Fixture Adult Performer',
]
const KEPT = ['Fixture Family Film', 'Fixture Kids Show']

const base = { overview: 'x', poster_path: '/p.jpg', backdrop_path: '/b.jpg', genre_ids: [35, 16] }
const film = (id: number, title: string, adult = false) => ({
    ...base,
    id,
    title,
    adult,
    release_date: '2020-01-01',
    vote_average: 7.5,
    vote_count: 900,
    popularity: 90 - (id % 10),
})
const series = (id: number, name: string) => ({
    ...base,
    id,
    name,
    adult: false,
    first_air_date: '2020-01-01',
    vote_average: 7.5,
    vote_count: 900,
    popularity: 90 - (id % 10),
    origin_country: ['US'],
})

const MOVIES = [
    film(901, 'Fixture Family Film'),
    film(902, 'Fixture R Film'),
    film(905, 'Fixture Adult Film', true),
]
const SHOWS = [series(903, 'Fixture Kids Show'), series(904, 'Fixture Mature Show')]
const MULTI = [
    ...MOVIES.map((m) => ({ ...m, media_type: 'movie' })),
    ...SHOWS.map((s) => ({ ...s, media_type: 'tv' })),
]
const CERT: Record<number, string> = { 901: 'PG', 902: 'R', 905: '' }
const TV_RATING: Record<number, string> = { 903: 'TV-Y', 904: 'TV-MA' }
const PEOPLE = [
    {
        id: 77,
        name: 'Fixture Director',
        adult: false,
        popularity: 50,
        profile_path: '/a.jpg',
        known_for_department: 'Directing',
        known_for: MULTI,
    },
    {
        id: 78,
        name: 'Fixture Adult Performer',
        adult: true,
        popularity: 40,
        profile_path: '/b.jpg',
        known_for_department: 'Acting',
        known_for: [],
    },
]

const page = (results: unknown[]) => ({
    page: 1,
    results,
    total_pages: 1,
    total_results: results.length,
})

function tmdb(rawUrl: string): unknown {
    const url = new URL(rawUrl)
    const path = url.pathname.replace(/^\/3/, '')
    let m: RegExpMatchArray | null
    if ((m = path.match(/^\/movie\/(\d+)\/release_dates$/))) {
        const cert = CERT[Number(m[1])]
        return { results: [{ iso_3166_1: 'US', release_dates: [{ certification: cert ?? 'PG' }] }] }
    }
    if ((m = path.match(/^\/tv\/(\d+)\/content_ratings$/))) {
        return { results: [{ iso_3166_1: 'US', rating: TV_RATING[Number(m[1])] ?? 'TV-G' }] }
    }
    if ((m = path.match(/^\/(movie|tv)\/(\d+)\/images$/)))
        return { posters: [{ file_path: '/i.jpg' }], backdrops: [] }
    if ((m = path.match(/^\/(movie|tv)\/(\d+)\/(similar|recommendations)$/))) {
        return page(m[1] === 'movie' ? MOVIES : SHOWS)
    }
    if ((m = path.match(/^\/(movie|tv)\/(\d+)\/credits$/))) {
        return { cast: [{ id: 77, name: 'Fixture Director' }], crew: [] }
    }
    if ((m = path.match(/^\/movie\/(\d+)$/))) {
        const found = MOVIES.find((f) => f.id === Number(m![1]))
        return found ?? null
    }
    if ((m = path.match(/^\/tv\/(\d+)$/))) {
        const found = SHOWS.find((s) => s.id === Number(m![1]))
        return found ?? null
    }
    if ((m = path.match(/^\/person\/(\d+)\/(combined_credits|movie_credits|tv_credits)$/))) {
        return {
            cast: MULTI.map((t) => ({ ...t, character: 'Self' })),
            crew: MULTI.map((t) => ({ ...t, job: 'Director', department: 'Directing' })),
        }
    }
    if ((m = path.match(/^\/person\/(\d+)$/)))
        return PEOPLE.find((p) => p.id === Number(m![1])) ?? null
    if (/^\/(trending\/person|search\/person|person\/popular)/.test(path)) return page(PEOPLE)
    if (/^\/(search\/multi|trending\/all)/.test(path)) return page(MULTI)
    if (
        /^\/discover\/movie/.test(path) ||
        /^\/(trending\/movie|movie\/(top_rated|popular|now_playing|upcoming))/.test(path)
    ) {
        // TMDB's own rating filter, which the routes rely on for discover.
        const rated = url.searchParams.has('certification.lte')
        return page(rated ? MOVIES.filter((f) => CERT[f.id] === 'PG' || f.adult) : MOVIES)
    }
    if (
        /^\/(discover\/tv|trending\/tv|tv\/(top_rated|popular|on_the_air|airing_today))/.test(path)
    ) {
        return page(SHOWS)
    }
    if (/^\/search\/(movie|tv)/.test(path)) return page(path.includes('movie') ? MOVIES : SHOWS)
    if (/^\/genre\//.test(path)) return { genres: [{ id: 35, name: 'Comedy' }] }
    return page([])
}

const realFetch = global.fetch
beforeAll(() => {
    global.fetch = jest.fn(async (input: RequestInfo | URL) => {
        const url =
            typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
        if (!url.includes('api.themoviedb.org')) {
            return new Response('{}', { status: 404 })
        }
        const body = tmdb(url)
        return body === null
            ? new Response(JSON.stringify({ status_message: 'not found' }), { status: 404 })
            : new Response(JSON.stringify(body), {
                  status: 200,
                  headers: { 'content-type': 'application/json' },
              })
    }) as typeof fetch
})
afterAll(() => {
    global.fetch = realFetch
})

beforeEach(() => {
    // The routes log what they filter; keep the test output quiet.
    for (const method of ['log', 'warn', 'error'] as const) {
        jest.spyOn(console, method).mockImplementation(() => undefined)
    }
})
afterEach(() => jest.restoreAllMocks())

/* ------------------------------------------------------------------ */
/*  The routes                                                          */
/* ------------------------------------------------------------------ */

const get = (path: string) => new NextRequest(`http://localhost:3000${path}`)
const post = (path: string, body: unknown) =>
    new NextRequest(`http://localhost:3000${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.9' },
        body: JSON.stringify(body),
    })
const withParams = <T extends Record<string, string>>(params: T) => ({
    params: Promise.resolve(params),
})

/** A list route, called with an optional extra query string or body field. */
interface ListRoute {
    name: string
    call: (ask: '' | 'false') => Promise<Response>
}

const q = (path: string, ask: '' | 'false') =>
    ask ? `${path}${path.includes('?') ? '&' : '?'}childSafetyMode=${ask}` : path

const LIST_ROUTES: ListRoute[] = [
    { name: 'search', call: (a) => searchGET(get(q('/api/search?query=fixture', a))) },
    {
        name: 'search people',
        call: (a) => searchPeopleGET(get(q('/api/search/people?query=fixture', a))),
    },
    { name: 'movies trending', call: (a) => moviesTrendingGET(get(q('/api/movies/trending', a))) },
    {
        name: 'movies trending by genre',
        call: (a) => moviesTrendingGET(get(q('/api/movies/trending?genres=comedy', a))),
    },
    { name: 'tv trending', call: (a) => tvTrendingGET(get(q('/api/tv/trending', a))) },
    {
        name: 'movies top rated',
        call: (a) => moviesTopRatedGET(get(q('/api/movies/top-rated', a))),
    },
    { name: 'tv top rated', call: (a) => tvTopRatedGET(get(q('/api/tv/top-rated', a))) },
    {
        name: 'movies by genre',
        call: (a) =>
            moviesGenreGET(get(q('/api/movies/genre/comedy', a)), withParams({ genre: 'comedy' })),
    },
    {
        name: 'genre page (movies)',
        call: (a) =>
            genresGET(get(q('/api/genres/movie/35', a)), withParams({ type: 'movie', id: '35' })),
    },
    {
        name: 'genre page (shows)',
        call: (a) =>
            genresGET(get(q('/api/genres/tv/35', a)), withParams({ type: 'tv', id: '35' })),
    },
    { name: 'discover shows', call: (a) => discoverGET(get(q('/api/discover?media_type=tv', a))) },
    {
        name: 'discover by actor',
        call: (a) => byActorGET(get(q('/api/discover/by-actor?actorId=77', a))),
    },
    {
        name: 'surprise me',
        call: (a) => randomGET(get(q('/api/random-content?count=20&media_type=tv', a))),
    },
    {
        name: 'similar titles',
        call: (a) =>
            similarGET(
                get(q('/api/recommendations/similar/901?mediaType=movie', a)),
                withParams({ id: '901' })
            ),
    },
    {
        name: 'genre previews',
        call: (a) =>
            genrePreviewsGET(
                get(q('/api/recommendations/genre-previews?genres=comedy&limit=5', a))
            ),
    },
    {
        name: 'preference picks',
        call: (a) =>
            preferenceContentPOST(
                post('/api/recommendations/preference-content', {
                    limit: 20,
                    ...(a ? { childSafetyMode: false } : {}),
                })
            ),
    },
    {
        name: 'smart preview (AI list)',
        call: (a) =>
            smartPreviewPOST(
                post('/api/smart-suggestions/preview', {
                    suggestions: [{ type: 'content_list', value: [901, 902, 905] }],
                    mediaType: 'movie',
                    ...(a ? { childSafetyMode: false } : {}),
                })
            ),
    },
    {
        name: 'custom row (curated ids)',
        call: (a) =>
            customRowGET(
                get(q('/api/custom-rows/r1/content?contentIds=901,902,905&mediaType=movie', a)),
                withParams({ id: 'r1' })
            ),
    },
    {
        name: 'person credits',
        call: (a) => creditsGET(get(q('/api/people/77/credits', a)), withParams({ id: '77' })),
    },
    { name: 'trending people', call: (a) => peopleTrendingGET(get(q('/api/people/trending', a))) },
]

async function text(response: Response): Promise<string> {
    expect(response.status).toBe(200)
    return JSON.stringify(await response.json())
}

const hiddenIn = (body: string) => HIDDEN.filter((name) => body.includes(name))
const keptIn = (body: string) => KEPT.filter((name) => body.includes(name))

describe.each(LIST_ROUTES)('$name', ({ call }) => {
    it('with the mode off, answers unchanged (the titles the mode hides come back)', async () => {
        become('guest-off')
        expect(hiddenIn(await text(await call('')))).not.toEqual([])
    })

    it.each<[Visitor, '' | 'false']>([
        ['guest-on', ''],
        ['guest-on', 'false'],
        ['signed-in-on', ''],
        ['signed-in-on', 'false'],
    ])('with the mode on (%s), parameter "%s": filtered', async (visitor, ask) => {
        become(visitor)
        const body = await text(await call(ask))
        expect(hiddenIn(body)).toEqual([])
        // Not empty because something failed: the titles it keeps are there.
        expect(keptIn(body)).not.toEqual([])
    })
})

describe('the client can ask for more filtering, never less', () => {
    it('filters for a guest without the mode who asks for it', async () => {
        become('guest-off')
        const body = await text(await searchGET(get('/api/search?query=ask&childSafetyMode=true')))
        expect(hiddenIn(body)).toEqual([])
        expect(keptIn(body)).not.toEqual([])
    })

    it('ignores the guest cookie for a signed-in account: its stored setting decides', async () => {
        become('signed-in-off-cookie-on')
        expect(hiddenIn(await text(await searchGET(get('/api/search?query=account'))))).not.toEqual(
            []
        )
    })
})

describe('a single blocked title by id', () => {
    const SINGLE: { name: string; call: (ask: '' | 'false') => Promise<Response> }[] = [
        {
            name: 'content (R film)',
            call: (a) => contentGET(get(q('/api/content/902', a)), withParams({ id: '902' })),
        },
        {
            name: 'movie details (R film)',
            call: (a) =>
                movieDetailsGET(
                    get(q('/api/movies/details/902?media_type=movie', a)),
                    withParams({ id: '902' })
                ),
        },
        {
            name: 'movie details (TV-MA show)',
            call: (a) =>
                movieDetailsGET(
                    get(q('/api/movies/details/904?media_type=tv', a)),
                    withParams({ id: '904' })
                ),
        },
        {
            name: 'tv details (TV-MA show)',
            call: (a) => tvDetailsGET(get(q('/api/tv/details/904', a)), withParams({ id: '904' })),
        },
        {
            name: 'person (adult performer)',
            call: (a) => personGET(get(q('/api/people/78', a)), withParams({ id: '78' })),
        },
    ]

    it.each(SINGLE)('$name: answered with the mode off', async ({ call }) => {
        become('guest-off')
        expect((await call('')).status).toBe(200)
    })

    it.each(SINGLE)('$name: 403 "child_safety", uncached, with the mode on', async ({ call }) => {
        for (const visitor of ['guest-on', 'signed-in-on'] as const) {
            for (const ask of ['', 'false'] as const) {
                become(visitor)
                const response = await call(ask)
                expect(response.status).toBe(403)
                expect((await response.json()).reason).toBe('child_safety')
                expect(response.headers.get('Cache-Control')).toBe('private, no-store')
            }
        }
    })

    it('keeps a PG film with the mode on', async () => {
        become('guest-on')
        expect((await contentGET(get('/api/content/901'), withParams({ id: '901' }))).status).toBe(
            200
        )
    })

    it('gives no alternate image of a blocked title with the mode on', async () => {
        become('guest-off')
        const off = await imagesGET(
            get('/api/images/movie/902'),
            withParams({ mediaType: 'movie', id: '902' })
        )
        expect((await off.json()).imageUrl).toContain('/i.jpg')
        become('guest-on')
        const on = await imagesGET(
            get('/api/images/movie/902'),
            withParams({ mediaType: 'movie', id: '902' })
        )
        expect((await on.json()).imageUrl).toBeNull()
    })
})

describe('caches keyed by the mode', () => {
    it('never serves a cached mode-off answer to a requester with the mode on', async () => {
        // The search and content routes keep answers in memory (utils/apiCache.ts).
        become('guest-off')
        const offSearch = await text(await searchGET(get('/api/search?query=cachecheck')))
        expect(hiddenIn(offSearch)).not.toEqual([])
        expect((await contentGET(get('/api/content/905'), withParams({ id: '905' }))).status).toBe(
            200
        )

        become('guest-on')
        expect(hiddenIn(await text(await searchGET(get('/api/search?query=cachecheck'))))).toEqual(
            []
        )
        expect((await contentGET(get('/api/content/905'), withParams({ id: '905' }))).status).toBe(
            403
        )

        // And the other way round: the filtered answer is not what mode-off gets.
        become('guest-off')
        expect(
            hiddenIn(await text(await searchGET(get('/api/search?query=cachecheck'))))
        ).not.toEqual([])
    })
})

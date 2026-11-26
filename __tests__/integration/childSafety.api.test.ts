/**
 * Child Safety Mode: one rule on every route.
 *
 * Runs the real route handlers against a fake TMDB that serves a fixture
 * catalogue (e2e/fixtures/child-safety-catalogue.json, modelled on live titles
 * whose list and single-title answers disagreed) and checks, with the mode on:
 * - each single-title route (movie/TV details, content) decides every title
 *   as the rule says (utils/childSafetyRule.ts);
 * - every title any list route returns is allowed by the single-title routes,
 *   so every title they block is absent from every list;
 * - trending and top-rated are the same lists as with the mode off, minus the
 *   blocked titles (nothing allowed goes missing, nothing else is swapped in).
 *
 * The fake TMDB answers discover queries the way TMDB does, including
 * `certification.lte`, which TMDB treats as "rated NR to PG-13".
 *
 * @jest-environment node
 */

import { NextRequest } from 'next/server'

import catalogue from '../../e2e/fixtures/child-safety-catalogue.json'

// The mode comes from a guest's server-set cookie (lib/childSafetyServer.ts).
let childSafetyCookie: string | undefined
jest.mock('next/headers', () => ({
    cookies: async () => ({
        get: (name: string) =>
            name === 'nettrailer_child_safety' && childSafetyCookie !== undefined
                ? { name, value: childSafetyCookie }
                : undefined,
    }),
}))
jest.mock('@/db/queries/userPreferences', () => ({
    loadChildSafetyMode: jest.fn(async () => false),
    loadUserPreferences: jest.fn(async () => ({})),
}))
jest.mock('@/lib/auth-middleware', () => ({
    verifyAuthentication: jest.fn(async () => ({ authenticated: false })),
}))

type Movie = (typeof catalogue.movies)[number]
type Show = (typeof catalogue.shows)[number]
type Kind = 'movie' | 'tv'

const movies = new Map<number, Movie>(catalogue.movies.map((m) => [m.id, m]))
const shows = new Map<number, Show>(catalogue.shows.map((s) => [s.id, s]))

// ---------------------------------------------------------------------------
// Fake TMDB
// ---------------------------------------------------------------------------

const CERT_ORDER: Record<string, number> = { NR: 0, G: 1, PG: 2, 'PG-13': 3, R: 4, 'NC-17': 5 }

function usCertifications(movie: Movie): string[] {
    if (movie.releaseDates === 'fail') return ['PG'] // TMDB knows it; only the lookup fails
    return movie.releaseDates
        .filter((r) => r.iso_3166_1 === 'US')
        .flatMap((r) => r.release_dates.map((d) => d.certification))
        .filter((c) => c !== '')
}

function movieItem(movie: Movie, index: number) {
    return {
        id: movie.id,
        title: movie.title,
        original_title: movie.title,
        adult: movie.adult ?? false,
        overview: movie.like,
        poster_path: `/poster-${movie.id}.jpg`,
        backdrop_path: `/backdrop-${movie.id}.jpg`,
        genre_ids: movie.genre_ids,
        release_date: '2026-01-01',
        vote_average: 7.5,
        vote_count: movie.vote_count,
        popularity: 1000 - index,
        original_language: 'en',
    }
}

function showItem(show: Show, index: number) {
    return {
        id: show.id,
        name: show.name,
        original_name: show.name,
        adult: false,
        overview: show.name,
        poster_path: `/poster-${show.id}.jpg`,
        backdrop_path: `/backdrop-${show.id}.jpg`,
        genre_ids: show.genre_ids,
        first_air_date: '2026-01-01',
        vote_average: 7.5,
        vote_count: show.vote_count,
        popularity: 1000 - index,
        origin_country: ['US'],
        original_language: 'en',
    }
}

function page(results: unknown[]) {
    return { page: 1, results, total_pages: 1, total_results: results.length }
}

function discoverMovies(params: URLSearchParams) {
    let list = catalogue.movies
    if (params.get('include_adult') === 'false') list = list.filter((m) => !m.adult)
    const lte = params.get('certification.lte')
    if (lte) {
        list = list.filter((m) =>
            usCertifications(m).some((c) => (CERT_ORDER[c] ?? 99) <= CERT_ORDER[lte])
        )
    }
    const exact = params.get('certification')
    if (exact) {
        const allowed = exact.split('|')
        list = list.filter((m) => usCertifications(m).some((c) => allowed.includes(c)))
    }
    return list.map(movieItem)
}

const tmdbCalls: string[] = []

async function fakeTmdb(input: RequestInfo | URL): Promise<Response> {
    const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url)
    const path = url.pathname.replace(/^\/3/, '')
    tmdbCalls.push(path)
    const json = (body: unknown, status = 200) =>
        new Response(JSON.stringify(body), {
            status,
            headers: { 'content-type': 'application/json' },
        })
    const notFound = () => json({ status_code: 34 }, 404)
    const p = url.searchParams

    if (path === '/trending/movie/week' || path === '/movie/top_rated') {
        return json(page(catalogue.movies.map(movieItem)))
    }
    if (path === '/trending/tv/week' || path === '/tv/top_rated' || path === '/discover/tv') {
        return json(page(catalogue.shows.map(showItem)))
    }
    if (path === '/discover/movie') return json(page(discoverMovies(p)))
    if (path === '/search/multi') {
        return json(
            page([
                ...catalogue.movies
                    .filter((m) => p.get('include_adult') !== 'false' || !m.adult)
                    .map((m, i) => ({ ...movieItem(m, i), media_type: 'movie' })),
                ...catalogue.shows.map((s, i) => ({ ...showItem(s, i), media_type: 'tv' })),
            ])
        )
    }

    let match = path.match(/^\/(movie|tv)\/(\d+)\/(similar|recommendations)$/)
    if (match) {
        return json(
            page(
                match[1] === 'movie'
                    ? catalogue.movies.map(movieItem)
                    : catalogue.shows.map(showItem)
            )
        )
    }
    match = path.match(/^\/movie\/(\d+)\/release_dates$/)
    if (match) {
        const movie = movies.get(Number(match[1]))
        if (!movie) return notFound()
        if (movie.releaseDates === 'fail') return json({ status_code: 25 }, 429)
        return json({ id: movie.id, results: movie.releaseDates })
    }
    match = path.match(/^\/tv\/(\d+)\/content_ratings$/)
    if (match) {
        const show = shows.get(Number(match[1]))
        if (!show) return notFound()
        if (show.contentRatings === 'fail') return json({ status_code: 25 }, 429)
        return json({ id: show.id, results: show.contentRatings })
    }
    match = path.match(/^\/(movie|tv)\/(\d+)\/credits$/)
    if (match) return json({ cast: [], crew: [] })
    match = path.match(/^\/movie\/(\d+)$/)
    if (match) {
        const movie = movies.get(Number(match[1]))
        if (!movie) return notFound()
        // A details answer with ratings appended; for the film whose lookup
        // fails, an appended PG the rule must not trust over the lookup.
        const releaseDates =
            movie.releaseDates === 'fail'
                ? [{ iso_3166_1: 'US', release_dates: [{ certification: 'PG', type: 3 }] }]
                : movie.releaseDates
        return json({
            ...movieItem(movie, 0),
            genres: movie.genre_ids.map((id) => ({ id, name: String(id) })),
            runtime: 100,
            release_dates: { results: releaseDates },
            videos: { results: [] },
        })
    }
    match = path.match(/^\/tv\/(\d+)$/)
    if (match) {
        const show = shows.get(Number(match[1]))
        if (!show) return notFound()
        return json({
            ...showItem(show, 0),
            genres: show.genre_ids.map((id) => ({ id, name: String(id) })),
            content_ratings: {
                results: show.contentRatings === 'fail' ? [] : show.contentRatings,
            },
            videos: { results: [] },
        })
    }
    return notFound()
}

// ---------------------------------------------------------------------------
// Calling the routes
// ---------------------------------------------------------------------------

type Handler = (
    request: NextRequest,
    context: { params: Promise<Record<string, string>> }
) => Promise<Response>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const routes: Record<string, any> = {}

beforeAll(async () => {
    process.env.TMDB_API_KEY = 'test-key'
    global.fetch = jest.fn(fakeTmdb) as unknown as typeof fetch
    // Imported after the key is set: the routes read it when they load.
    routes.movieTrending = await import('../../app/api/movies/trending/route')
    routes.movieTopRated = await import('../../app/api/movies/top-rated/route')
    routes.tvTrending = await import('../../app/api/tv/trending/route')
    routes.tvTopRated = await import('../../app/api/tv/top-rated/route')
    routes.movieGenre = await import('../../app/api/movies/genre/[genre]/route')
    routes.genres = await import('../../app/api/genres/[type]/[id]/route')
    routes.discover = await import('../../app/api/discover/route')
    routes.byActor = await import('../../app/api/discover/by-actor/route')
    routes.search = await import('../../app/api/search/route')
    routes.random = await import('../../app/api/random-content/route')
    routes.similar = await import('../../app/api/recommendations/similar/[id]/route')
    routes.customRows = await import('../../app/api/custom-rows/[id]/content/route')
    routes.movieDetails = await import('../../app/api/movies/details/[id]/route')
    routes.tvDetails = await import('../../app/api/tv/details/[id]/route')
    routes.content = await import('../../app/api/content/[id]/route')
})

afterAll(() => {
    delete process.env.TMDB_API_KEY
})

async function call(
    handler: Handler,
    path: string,
    params: Record<string, string> = {}
): Promise<{ status: number; body: Record<string, unknown> }> {
    const request = new NextRequest(new URL(path, 'http://localhost:3000'))
    const response = await handler(request, { params: Promise.resolve(params) })
    return { status: response.status, body: await response.json().catch(() => ({})) }
}

interface Title {
    id: number
    media_type: Kind
}

/** The titles in a list route's answer, whatever its shape. */
function titlesIn(body: Record<string, unknown>, kind?: Kind): Title[] {
    const raw = (body.results ??
        body.items ??
        (body.recommendations as { content: unknown }[] | undefined)?.map((r) => r.content) ??
        []) as { id: number; media_type?: string; title?: string }[]
    return raw.map((item) => ({
        id: item.id,
        media_type: (item.media_type ??
            kind ??
            (item.title !== undefined ? 'movie' : 'tv')) as Kind,
    }))
}

const key = (t: Title) => `${t.media_type}:${t.id}`

/** Every list route with the mode on, by name, with the kind of title it lists. */
const LIST_CALLS: [string, () => Promise<{ body: Record<string, unknown> }>, Kind?][] = [
    ['movies trending', () => call(routes.movieTrending.GET, '/api/movies/trending'), 'movie'],
    [
        'movies trending, page 21 (discover fallback)',
        () => call(routes.movieTrending.GET, '/api/movies/trending?page=21'),
        'movie',
    ],
    [
        'movies trending by genre',
        () => call(routes.movieTrending.GET, '/api/movies/trending?genres=comedy,animation'),
        'movie',
    ],
    ['movies top rated', () => call(routes.movieTopRated.GET, '/api/movies/top-rated'), 'movie'],
    [
        'movies top rated by genre',
        () => call(routes.movieTopRated.GET, '/api/movies/top-rated?genres=family'),
        'movie',
    ],
    ['TV trending', () => call(routes.tvTrending.GET, '/api/tv/trending'), 'tv'],
    [
        'TV trending, page 21 (discover fallback)',
        () => call(routes.tvTrending.GET, '/api/tv/trending?page=21'),
        'tv',
    ],
    ['TV top rated', () => call(routes.tvTopRated.GET, '/api/tv/top-rated'), 'tv'],
    [
        'movie genre',
        () => call(routes.movieGenre.GET, '/api/movies/genre/comedy', { genre: 'comedy' }),
        'movie',
    ],
    [
        'genres (movies)',
        () => call(routes.genres.GET, '/api/genres/movie/16', { type: 'movie', id: '16' }),
        'movie',
    ],
    [
        'genres (TV)',
        () => call(routes.genres.GET, '/api/genres/tv/16', { type: 'tv', id: '16' }),
        'tv',
    ],
    [
        'genres (movies and TV)',
        () => call(routes.genres.GET, '/api/genres/both/16', { type: 'both', id: '16' }),
    ],
    [
        'discover (movies)',
        () => call(routes.discover.GET, '/api/discover?media_type=movie&with_genres=16'),
        'movie',
    ],
    ['discover (TV)', () => call(routes.discover.GET, '/api/discover?media_type=tv'), 'tv'],
    [
        'discover by actor',
        () => call(routes.byActor.GET, '/api/discover/by-actor?actorId=31&mediaType=both'),
    ],
    ['search', () => call(routes.search.GET, '/api/search?query=fixture')],
    [
        'random content (movies)',
        () => call(routes.random.GET, '/api/random-content?count=20&media_type=movie'),
        'movie',
    ],
    [
        'random content (TV)',
        () => call(routes.random.GET, '/api/random-content?count=20&media_type=tv'),
        'tv',
    ],
    [
        'similar movies',
        () =>
            call(routes.similar.GET, '/api/recommendations/similar/990102?mediaType=movie', {
                id: '990102',
            }),
        'movie',
    ],
    [
        'similar shows',
        () =>
            call(routes.similar.GET, '/api/recommendations/similar/990201?mediaType=tv', {
                id: '990201',
            }),
        'tv',
    ],
    [
        'custom row (movies)',
        () =>
            call(
                routes.customRows.GET,
                '/api/custom-rows/row1/content?genres=comedy&mediaType=movie',
                {
                    id: 'row1',
                }
            ),
        'movie',
    ],
    [
        'custom row (TV)',
        () =>
            call(
                routes.customRows.GET,
                '/api/custom-rows/row1/content?genres=animation&mediaType=tv',
                {
                    id: 'row1',
                }
            ),
        'tv',
    ],
    [
        'custom row (movies and TV)',
        () =>
            call(
                routes.customRows.GET,
                '/api/custom-rows/row1/content?genres=comedy,animation&mediaType=both',
                { id: 'row1' }
            ),
    ],
    [
        'custom row (curated ids)',
        () =>
            call(
                routes.customRows.GET,
                `/api/custom-rows/row1/content?mediaType=movie&contentIds=${catalogue.movies
                    .map((m) => m.id)
                    .join(',')}`,
                { id: 'row1' }
            ),
        'movie',
    ],
]

/** The single-title routes' answers (HTTP status) for a title, with the mode on. */
async function singleTitleStatuses(title: Title): Promise<number[]> {
    const id = String(title.id)
    const details =
        title.media_type === 'movie'
            ? call(routes.movieDetails.GET, `/api/movies/details/${id}?media_type=movie`, { id })
            : call(routes.tvDetails.GET, `/api/tv/details/${id}`, { id })
    const content = call(routes.content.GET, `/api/content/${id}`, { id })
    return (await Promise.all([details, content])).map((r) => r.status)
}

const catalogueTitles: Title[] = [
    ...catalogue.movies.map((m) => ({ id: m.id, media_type: 'movie' as const })),
    ...catalogue.shows.map((s) => ({ id: s.id, media_type: 'tv' as const })),
]

describe('Child Safety Mode applies one rule on every route', () => {
    const allowed = new Set<string>()

    beforeAll(async () => {
        childSafetyCookie = 'true'
        for (const title of catalogueTitles) {
            const statuses = await singleTitleStatuses(title)
            if (statuses.every((s) => s === 200)) allowed.add(key(title))
        }
    })

    afterAll(() => {
        childSafetyCookie = undefined
    })

    it.each(catalogueTitles.map((t) => [key(t), t] as const))(
        'the single-title routes decide %s as the rule says',
        async (_name, title) => {
            const expected =
                title.media_type === 'movie'
                    ? movies.get(title.id)!.shown
                    : shows.get(title.id)!.shown
            const statuses = await singleTitleStatuses(title)
            expect(statuses).toEqual(expected ? [200, 200] : [403, 403])
        }
    )

    it.each(LIST_CALLS.map(([name, run, kind]) => [name, run, kind] as const))(
        '%s lists only titles the single-title routes allow',
        async (_name, run, kind) => {
            const { body } = await run()
            const listed = titlesIn(body, kind)
            const notAllowed = listed.filter((t) => !allowed.has(key(t))).map(key)
            expect(notAllowed).toEqual([])
        }
    )

    it.each([
        ['movies trending', '/api/movies/trending', 'movieTrending', 'movie'],
        ['movies top rated', '/api/movies/top-rated', 'movieTopRated', 'movie'],
        ['TV trending', '/api/tv/trending', 'tvTrending', 'tv'],
        ['TV top rated', '/api/tv/top-rated', 'tvTopRated', 'tv'],
    ] as const)(
        '%s is the same list as with the mode off, minus the blocked titles',
        async (_name, path, route, kind) => {
            childSafetyCookie = undefined
            const plain = titlesIn((await call(routes[route].GET, path)).body, kind)
            childSafetyCookie = 'true'
            const filtered = titlesIn((await call(routes[route].GET, path)).body, kind)
            expect(filtered.map(key)).toEqual(plain.filter((t) => allowed.has(key(t))).map(key))
            expect(filtered.length).toBeGreaterThan(0)
        }
    )
})

describe('Child Safety Mode TMDB calls', () => {
    it('one trending page asks TMDB for the list plus one ratings lookup per new title, then only the list', async () => {
        childSafetyCookie = 'true'
        const { certificationCache } = await import('../../utils/certificationCache')
        certificationCache.clear()
        tmdbCalls.length = 0
        await call(routes.movieTrending.GET, '/api/movies/trending')
        const cold = tmdbCalls.length
        tmdbCalls.length = 0
        await call(routes.movieTrending.GET, '/api/movies/trending')
        const warm = tmdbCalls.length
        // The failed lookup is the only one asked again.
        const failing = catalogue.movies.filter((m) => m.releaseDates === 'fail').length
        expect(cold).toBe(1 + catalogue.movies.filter((m) => !m.adult).length)
        expect(warm).toBe(1 + failing)
        childSafetyCookie = undefined
    })
})

/**
 * The Child Safety Mode rule (utils/childSafetyRule.ts) and the one function
 * every route applies it through (isChildSafe in utils/childSafetyFilter.ts),
 * over titles modelled on the ones whose list and single-title answers
 * disagreed on the live site (e2e/fixtures/child-safety-catalogue.json).
 *
 * @jest-environment node
 */

import catalogue from '../../e2e/fixtures/child-safety-catalogue.json'
import { certificationCache } from '../../utils/certificationCache'
import { isChildSafe } from '../../utils/childSafetyFilter'
import {
    CHILD_SAFE_DISCOVER_PARAMS,
    movieRatingsAllowed,
    showRatingsAllowed,
} from '../../utils/childSafetyRule'
import { fetchMovieCertifications, usCertificationsFrom } from '../../utils/movieCertifications'
import { fetchTVContentRatings } from '../../utils/tvContentRatings'

type Lookup = unknown[] | 'fail'

const movieLookups = new Map<number, Lookup>(
    catalogue.movies.map((m) => [m.id, m.releaseDates as Lookup])
)
const showLookups = new Map<number, Lookup>(
    catalogue.shows.map((s) => [s.id, s.contentRatings as Lookup])
)

const fetchMock = jest.fn(async (input: RequestInfo | URL) => {
    const url = new URL(String(input))
    const movie = url.pathname.match(/^\/3\/movie\/(\d+)\/release_dates$/)
    const show = url.pathname.match(/^\/3\/tv\/(\d+)\/content_ratings$/)
    const lookup = movie
        ? movieLookups.get(Number(movie[1]))
        : show
          ? showLookups.get(Number(show[1]))
          : undefined
    if (lookup === undefined) return new Response('{}', { status: 404 })
    if (lookup === 'fail') return new Response('{"status_code":25}', { status: 429 })
    return new Response(JSON.stringify({ results: lookup }), { status: 200 })
})

beforeAll(() => {
    global.fetch = fetchMock as unknown as typeof fetch
})

beforeEach(() => {
    certificationCache.clear()
    fetchMock.mockClear()
})

describe('movieRatingsAllowed', () => {
    it.each([
        [['G'], true],
        [['PG'], true],
        [['PG-13'], true],
        [['TV-14'], true],
        [['PG', 'PG', 'PG'], true],
        [['R'], false],
        [['NC-17'], false],
        [['NR'], false],
        [['NR', 'NR'], false],
        [['PG-13', 'NR'], false],
        [['PG', 'R'], false],
        [['TV-MA'], false],
        [['X'], false],
        [[], false],
    ])('%j -> %s', (certifications, expected) => {
        expect(movieRatingsAllowed(certifications)).toBe(expected)
    })

    it('hides a movie whose certifications could not be looked up', () => {
        expect(movieRatingsAllowed(null)).toBe(false)
    })
})

describe('showRatingsAllowed', () => {
    const r = (iso_3166_1: string, rating: string) => ({ iso_3166_1, rating })
    it.each([
        [[r('US', 'TV-Y')], true],
        [[r('US', 'TV-14')], true],
        [[r('GB', 'U'), r('DE', '0')], true],
        [[r('US', 'TV-MA')], false],
        [[r('US', 'NR')], false],
        [[r('US', 'TV-14'), r('AU', 'MA15+')], false],
        [[r('KR', '18')], false],
        [[r('US', '')], false],
        [[], false],
    ])('%j -> %s', (ratings, expected) => {
        expect(showRatingsAllowed(ratings)).toBe(expected)
    })

    it('hides a show whose ratings could not be looked up', () => {
        expect(showRatingsAllowed(null)).toBe(false)
    })
})

describe('usCertificationsFrom', () => {
    it('reads every US release and skips the blank ones (a premiere has none)', () => {
        expect(
            usCertificationsFrom([
                {
                    iso_3166_1: 'US',
                    release_dates: [
                        { certification: '' },
                        { certification: 'PG' },
                        { certification: ' NR ' },
                    ],
                },
                { iso_3166_1: 'GB', release_dates: [{ certification: '18' }] },
            ])
        ).toEqual(['PG', 'NR'])
    })

    it('is empty when TMDB lists no US release', () => {
        expect(usCertificationsFrom([])).toEqual([])
        expect(usCertificationsFrom(undefined)).toEqual([])
    })
})

describe('isChildSafe over the fixture catalogue', () => {
    it.each(catalogue.movies.map((m) => [m.title, m] as const))(
        'movie %s',
        async (_title, movie) => {
            expect(
                await isChildSafe(
                    { id: movie.id, title: movie.title, adult: movie.adult ?? false },
                    'key'
                )
            ).toBe(movie.shown)
        }
    )

    it.each(catalogue.shows.map((s) => [s.name, s] as const))('show %s', async (_name, show) => {
        expect(await isChildSafe({ id: show.id, name: show.name, media_type: 'tv' }, 'key')).toBe(
            show.shown
        )
    })

    it('judges a title on the lookup, not on ratings a route happened to embed', async () => {
        // A details answer for the explicit unrated film that claims PG: the rule
        // still reads the same lookup a list reads, so both agree.
        const embedded = {
            id: 990101,
            title: 'Fixture Explicit Unrated Film',
            adult: false,
            release_dates: {
                results: [{ iso_3166_1: 'US', release_dates: [{ certification: 'PG' }] }],
            },
        }
        expect(await isChildSafe(embedded, 'key')).toBe(false)
    })

    it('lets people through unless TMDB flags them adult', async () => {
        expect(await isChildSafe({ id: 1, media_type: 'person', adult: false }, 'key')).toBe(true)
        expect(await isChildSafe({ id: 2, media_type: 'person', adult: true }, 'key')).toBe(false)
        expect(fetchMock).not.toHaveBeenCalled()
    })

    it('hides anything without a usable id', async () => {
        expect(await isChildSafe({ id: 0, title: 'No id' }, 'key')).toBe(false)
        expect(await isChildSafe(null, 'key')).toBe(false)
    })
})

describe('the ratings lookups', () => {
    it('ask TMDB once per title, then answer from the cache', async () => {
        await fetchMovieCertifications(990102, 'key')
        await fetchMovieCertifications(990102, 'key')
        await fetchTVContentRatings(990201, 'key')
        await fetchTVContentRatings(990201, 'key')
        expect(fetchMock).toHaveBeenCalledTimes(2)
    })

    it('share one request between concurrent lookups of the same title', async () => {
        await Promise.all([
            fetchMovieCertifications(990103, 'key'),
            fetchMovieCertifications(990103, 'key'),
            fetchMovieCertifications(990103, 'key'),
        ])
        expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    it('keep movie and show ids apart (TMDB numbers them separately)', async () => {
        movieLookups.set(4242, [
            { iso_3166_1: 'US', release_dates: [{ certification: 'R', type: 3 }] },
        ])
        showLookups.set(4242, [{ iso_3166_1: 'US', rating: 'TV-Y' }])
        expect(await isChildSafe({ id: 4242, title: 'Movie 4242' }, 'key')).toBe(false)
        expect(await isChildSafe({ id: 4242, name: 'Show 4242', media_type: 'tv' }, 'key')).toBe(
            true
        )
    })

    it('never cache a failed lookup: the title shows once TMDB answers again', async () => {
        movieLookups.set(4343, 'fail')
        expect(await isChildSafe({ id: 4343, title: 'Rate limited' }, 'key')).toBe(false)
        movieLookups.set(4343, [
            { iso_3166_1: 'US', release_dates: [{ certification: 'PG', type: 3 }] },
        ])
        expect(await isChildSafe({ id: 4343, title: 'Rate limited' }, 'key')).toBe(true)
        expect(fetchMock).toHaveBeenCalledTimes(2)
    })

    it('treat a network error as a failed lookup', async () => {
        fetchMock.mockRejectedValueOnce(new Error('offline'))
        expect(await fetchMovieCertifications(990102, 'key')).toBeNull()
        expect(await fetchMovieCertifications(990102, 'key')).toEqual(['PG', 'PG'])
    })
})

describe('the discover prefilter', () => {
    it('asks TMDB for G, PG and PG-13 only, never certification.lte (which includes NR)', () => {
        expect(CHILD_SAFE_DISCOVER_PARAMS).toEqual({
            certification_country: 'US',
            certification: 'G|PG|PG-13',
            include_adult: 'false',
        })
        expect(Object.keys(CHILD_SAFE_DISCOVER_PARAMS)).not.toContain('certification.lte')
    })
})

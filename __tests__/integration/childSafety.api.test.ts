/**
 * Integration Tests for Child Safety Filtering - API Layer
 *
 * These tests verify that ALL API endpoints properly filter content
 * when child safety mode is enabled, ensuring:
 * - Movies with adult=true are blocked
 * - TV shows with mature ratings (TV-MA, etc.) are blocked
 * - Appropriate content passes through
 */

import { NextApiRequest, NextApiResponse } from 'next'
import { createMocks } from 'node-mocks-http'

// Mock the TV content ratings module
jest.mock('../../utils/tvContentRatings', () => ({
    fetchTVContentRatings: jest.fn(),
    hasMatureRating: jest.fn(),
    filterMatureTVShows: jest.fn((shows: any[]) => {
        // Filter out shows with id > 1000 (our test convention for mature content)
        return shows.filter((show) => show.id <= 1000)
    }),
    MATURE_TV_RATINGS: new Set(['TV-MA', 'TV-14', '18', 'R']),
}))

// Mock contentFilter
jest.mock('../../utils/contentFilter', () => ({
    filterContentByAdultFlag: jest.fn((content: any[], childSafetyMode: boolean) => {
        if (!childSafetyMode) return content
        return content.filter((item) => item.adult !== true)
    }),
}))

// Mock TMDBApiClient
const mockGetMovieDetails = jest.fn()
jest.mock('../../utils/tmdbApi', () => ({
    TMDBApiClient: {
        getInstance: () => ({
            getMovieDetails: mockGetMovieDetails,
        }),
    },
    setCacheHeaders: jest.fn(),
    handleApiError: (res: any, error: any) => {
        return res.status(500).json({ error: 'API Error' })
    },
}))

import contentHandler from '../../pages/api/content/[id]'
import genresHandler from '../../pages/api/genres/[type]/[id]'
import detailsHandler from '../../pages/api/movies/details/[id]'
import { fetchTVContentRatings, hasMatureRating } from '../../utils/tvContentRatings'

describe('Child Safety API Integration Tests', () => {
    const originalEnv = process.env.TMDB_API_KEY

    beforeAll(() => {
        process.env.TMDB_API_KEY = 'test-api-key'
    })

    afterAll(() => {
        process.env.TMDB_API_KEY = originalEnv
    })

    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe('/api/content/[id] - Individual Content Details', () => {
        test('should block adult movie when child safety is ON', async () => {
            // Mock fetch to return adult movie
            global.fetch = jest.fn().mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    id: 123,
                    title: 'Adult Movie',
                    adult: true,
                    media_type: 'movie',
                }),
            })

            const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
                method: 'GET',
                query: {
                    id: '123',
                    childSafetyMode: 'true',
                },
            })

            await contentHandler(req, res)

            expect(res._getStatusCode()).toBe(403)
            const data = JSON.parse(res._getData())
            expect(data.error).toContain('blocked by child safety')
            expect(data.reason).toBe('adult_content')
        })

        test('should allow safe movie when child safety is ON', async () => {
            global.fetch = jest.fn().mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    id: 456,
                    title: 'Family Movie',
                    adult: false,
                    media_type: 'movie',
                }),
            })

            const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
                method: 'GET',
                query: {
                    id: '456',
                    childSafetyMode: 'true',
                },
            })

            await contentHandler(req, res)

            expect(res._getStatusCode()).toBe(200)
            const data = JSON.parse(res._getData())
            expect(data.title).toBe('Family Movie')
        })

        test('should block mature TV show when child safety is ON', async () => {
            // Mock movie fetch to fail, TV fetch to succeed
            global.fetch = jest
                .fn()
                .mockResolvedValueOnce({
                    ok: false,
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({
                        id: 789,
                        name: 'Mature Show',
                        media_type: 'tv',
                    }),
                })

            // Mock TV ratings check
            ;(fetchTVContentRatings as jest.Mock).mockResolvedValueOnce([
                { iso_3166_1: 'US', rating: 'TV-MA' },
            ])
            ;(hasMatureRating as jest.Mock).mockReturnValueOnce(true)

            const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
                method: 'GET',
                query: {
                    id: '789',
                    childSafetyMode: 'true',
                },
            })

            await contentHandler(req, res)

            expect(res._getStatusCode()).toBe(403)
            const data = JSON.parse(res._getData())
            expect(data.error).toContain('blocked by child safety')
            expect(data.reason).toBe('mature_rating')
        })

        test('should allow safe TV show when child safety is ON', async () => {
            global.fetch = jest
                .fn()
                .mockResolvedValueOnce({ ok: false })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({
                        id: 999,
                        name: 'Kids Show',
                        media_type: 'tv',
                    }),
                })
            ;(fetchTVContentRatings as jest.Mock).mockResolvedValueOnce([
                { iso_3166_1: 'US', rating: 'TV-G' },
            ])
            ;(hasMatureRating as jest.Mock).mockReturnValueOnce(false)

            const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
                method: 'GET',
                query: {
                    id: '999',
                    childSafetyMode: 'true',
                },
            })

            await contentHandler(req, res)

            expect(res._getStatusCode()).toBe(200)
            const data = JSON.parse(res._getData())
            expect(data.name).toBe('Kids Show')
        })

        test('should allow adult content when child safety is OFF', async () => {
            global.fetch = jest.fn().mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    id: 123,
                    title: 'Adult Movie',
                    adult: true,
                }),
            })

            const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
                method: 'GET',
                query: {
                    id: '123',
                    childSafetyMode: 'false',
                },
            })

            await contentHandler(req, res)

            expect(res._getStatusCode()).toBe(200)
            const data = JSON.parse(res._getData())
            expect(data.title).toBe('Adult Movie')
        })
    })

    describe('/api/genres/[type]/[id] - Genre Browsing', () => {
        test('should filter adult movies from genre results', async () => {
            global.fetch = jest.fn().mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    results: [
                        { id: 1, title: 'Safe Movie', adult: false },
                        { id: 2, title: 'Adult Movie', adult: true },
                        { id: 3, title: 'Another Safe Movie', adult: false },
                    ],
                    total_results: 3,
                }),
            })

            const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
                method: 'GET',
                query: {
                    type: 'movie',
                    id: '28',
                    childSafetyMode: 'true',
                },
            })

            await genresHandler(req, res)

            expect(res._getStatusCode()).toBe(200)
            const data = JSON.parse(res._getData())
            expect(data.results).toHaveLength(2)
            expect(data.child_safety_enabled).toBe(true)
            expect(data.hidden_count).toBe(1)
            expect(data.results.every((item: any) => item.adult !== true)).toBe(true)
        })

        test('should filter mature TV shows from genre results', async () => {
            global.fetch = jest.fn().mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    results: [
                        { id: 100, name: 'Safe Show' },
                        { id: 2000, name: 'Mature Show' }, // id > 1000 = mature in our mock
                        { id: 300, name: 'Another Safe Show' },
                    ],
                    total_results: 3,
                }),
            })

            const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
                method: 'GET',
                query: {
                    type: 'tv',
                    id: '10765',
                    childSafetyMode: 'true',
                },
            })

            await genresHandler(req, res)

            expect(res._getStatusCode()).toBe(200)
            const data = JSON.parse(res._getData())
            expect(data.results).toHaveLength(2)
            expect(data.child_safety_enabled).toBe(true)
            expect(data.results.every((item: any) => item.id <= 1000)).toBe(true)
        })

        test('should not filter when child safety is OFF', async () => {
            global.fetch = jest.fn().mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    results: [
                        { id: 1, title: 'Safe Movie', adult: false },
                        { id: 2, title: 'Adult Movie', adult: true },
                    ],
                }),
            })

            const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
                method: 'GET',
                query: {
                    type: 'movie',
                    id: '28',
                    childSafetyMode: 'false',
                },
            })

            await genresHandler(req, res)

            expect(res._getStatusCode()).toBe(200)
            const data = JSON.parse(res._getData())
            expect(data.results).toHaveLength(2)
            expect(data.child_safety_enabled).toBeUndefined()
        })
    })

    describe('/api/movies/details/[id] - Movie/TV Details', () => {
        test('should block adult movie details', async () => {
            mockGetMovieDetails.mockResolvedValueOnce({
                id: 123,
                title: 'Adult Movie',
                adult: true,
            })

            const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
                method: 'GET',
                query: {
                    id: '123',
                    media_type: 'movie',
                    childSafetyMode: 'true',
                },
            })

            await detailsHandler(req, res)

            expect(res._getStatusCode()).toBe(403)
            const data = JSON.parse(res._getData())
            expect(data.message).toContain('blocked by child safety')
        })

        test('should block mature TV show details', async () => {
            mockGetMovieDetails.mockResolvedValueOnce({
                id: 456,
                name: 'Mature Show',
            })
            ;(fetchTVContentRatings as jest.Mock).mockResolvedValueOnce([
                { iso_3166_1: 'US', rating: 'TV-MA' },
            ])
            ;(hasMatureRating as jest.Mock).mockReturnValueOnce(true)

            const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
                method: 'GET',
                query: {
                    id: '456',
                    media_type: 'tv',
                    childSafetyMode: 'true',
                },
            })

            await detailsHandler(req, res)

            expect(res._getStatusCode()).toBe(403)
        })

        test('should allow safe movie details', async () => {
            mockGetMovieDetails.mockResolvedValueOnce({
                id: 789,
                title: 'Family Movie',
                adult: false,
            })

            const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
                method: 'GET',
                query: {
                    id: '789',
                    media_type: 'movie',
                    childSafetyMode: 'true',
                },
            })

            await detailsHandler(req, res)

            expect(res._getStatusCode()).toBe(200)
            const data = JSON.parse(res._getData())
            expect(data.title).toBe('Family Movie')
        })
    })

    describe('Integration: Full Content Lifecycle', () => {
        test('should block content at every access point when child safety is ON', async () => {
            const adultMovieId = '666'

            // Test 1: Blocked in search/genre lists
            global.fetch = jest.fn().mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    results: [{ id: parseInt(adultMovieId), title: 'Adult Movie', adult: true }],
                }),
            })

            let { req, res } = createMocks<NextApiRequest, NextApiResponse>({
                method: 'GET',
                query: { type: 'movie', id: '28', childSafetyMode: 'true' },
            })

            await genresHandler(req, res)
            const data = JSON.parse(res._getData())
            expect(data.results).toHaveLength(0)

            // Test 2: Blocked when accessing directly
            global.fetch = jest.fn().mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    id: parseInt(adultMovieId),
                    title: 'Adult Movie',
                    adult: true,
                }),
            })
            ;({ req, res } = createMocks<NextApiRequest, NextApiResponse>({
                method: 'GET',
                query: { id: adultMovieId, childSafetyMode: 'true' },
            }))

            await contentHandler(req, res)
            expect(res._getStatusCode()).toBe(403)
        })

        test('should allow appropriate content at all access points when child safety is ON', async () => {
            const safeMovieId = '100'

            // Test 1: Visible in search/genre lists
            global.fetch = jest.fn().mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    results: [{ id: parseInt(safeMovieId), title: 'Family Movie', adult: false }],
                }),
            })

            let { req, res } = createMocks<NextApiRequest, NextApiResponse>({
                method: 'GET',
                query: { type: 'movie', id: '28', childSafetyMode: 'true' },
            })

            await genresHandler(req, res)
            let data = JSON.parse(res._getData())
            expect(data.results).toHaveLength(1)
            expect(data.results[0].title).toBe('Family Movie')

            // Test 2: Accessible when accessing directly
            global.fetch = jest.fn().mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    id: parseInt(safeMovieId),
                    title: 'Family Movie',
                    adult: false,
                }),
            })
            ;({ req, res } = createMocks<NextApiRequest, NextApiResponse>({
                method: 'GET',
                query: { id: safeMovieId, childSafetyMode: 'true' },
            }))

            await contentHandler(req, res)
            expect(res._getStatusCode()).toBe(200)
            data = JSON.parse(res._getData())
            expect(data.title).toBe('Family Movie')
        })
    })
})

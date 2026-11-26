/**
 * /api/recommendations/similar/[id]: "nothing found" is an empty 200, a TMDB
 * failure is an honest non-500 status, and neither is cached.
 *
 * @jest-environment node
 */

import { NextRequest } from 'next/server'
import { GET } from '../../../../app/api/recommendations/similar/[id]/route'

const mockFetch = jest.fn()
jest.mock('../../../../utils/tmdbApi', () => ({
    TMDBApiClient: {
        getInstance: () => ({ fetch: (...args: unknown[]) => mockFetch(...args) }),
    },
}))

function tmdbError(status?: number, code?: string): Error {
    const error = new Error(status ? `TMDB API error: ${status}` : 'Network error') as Error & {
        status?: number
        code?: string
    }
    error.status = status
    error.code = code
    return error
}

const film = (id: number) => ({ id, title: `Film ${id}`, vote_count: 500, adult: false })

function call(id: string, query = 'mediaType=movie&limit=12') {
    const request = new NextRequest(
        `http://localhost:3000/api/recommendations/similar/${id}?${query}`
    )
    return GET(request, { params: Promise.resolve({ id }) })
}

describe('GET /api/recommendations/similar/[id]', () => {
    beforeEach(() => {
        mockFetch.mockReset()
        jest.spyOn(console, 'error').mockImplementation(() => {})
    })
    afterEach(() => jest.restoreAllMocks())

    it('returns the mixed, deduplicated list', async () => {
        mockFetch.mockImplementation(async (endpoint: string) => ({
            results: endpoint.endsWith('/similar') ? [film(1), film(2)] : [film(2), film(3)],
        }))
        const response = await call('603')
        const body = await response.json()
        expect(response.status).toBe(200)
        expect(body.success).toBe(true)
        expect(body.recommendations.map((r: { content: { id: number } }) => r.content.id)).toEqual([
            1, 2, 3,
        ])
    })

    it('answers an empty 200 when TMDB has no results', async () => {
        mockFetch.mockResolvedValue({ results: [] })
        const response = await call('1205851')
        expect(response.status).toBe(200)
        expect(await response.json()).toMatchObject({ success: true, recommendations: [] })
    })

    it('answers an empty 200 when TMDB says the title has no lists (404)', async () => {
        mockFetch.mockRejectedValue(tmdbError(404))
        const response = await call('1205851', 'mediaType=tv&limit=12')
        expect(response.status).toBe(200)
        expect(await response.json()).toMatchObject({ success: true, recommendations: [] })
    })

    it('still answers from one list when the other TMDB call fails', async () => {
        mockFetch.mockImplementation(async (endpoint: string) => {
            if (endpoint.endsWith('/similar')) throw tmdbError(503)
            return { results: [film(7)] }
        })
        const response = await call('603')
        const body = await response.json()
        expect(response.status).toBe(200)
        expect(body.recommendations).toHaveLength(1)
    })

    it('answers 502, uncached, when TMDB fails on both calls', async () => {
        mockFetch.mockRejectedValue(tmdbError(503))
        const response = await call('603')
        expect(response.status).toBe(502)
        expect(response.headers.get('Cache-Control')).toBe('no-store')
        expect((await response.json()).success).toBe(false)
    })

    it('answers 502 on a network failure', async () => {
        mockFetch.mockRejectedValue(tmdbError(undefined, 'NETWORK_ERROR'))
        expect((await call('603')).status).toBe(502)
    })

    it('answers 429 with Retry-After when TMDB rate limits', async () => {
        mockFetch.mockRejectedValue(tmdbError(429))
        const response = await call('603')
        expect(response.status).toBe(429)
        expect(response.headers.get('Retry-After')).toBe('30')
    })

    it('rejects a bad id and a bad media type with 400', async () => {
        expect((await call('abc')).status).toBe(400)
        expect((await call('603', 'mediaType=person')).status).toBe(400)
    })

    it('falls back to the default limit when limit is not a number', async () => {
        mockFetch.mockResolvedValue({ results: [film(1)] })
        expect((await call('603', 'mediaType=movie&limit=abc')).status).toBe(200)
    })
})

/**
 * Unit Tests for App Router API Route: /api/smart-suggestions
 *
 * Focuses on the new text-only workflow, Gemini merge path, and creative naming flow.
 *
 * @jest-environment node
 */

import { NextRequest } from 'next/server'
import { POST } from '../../../../app/api/smart-suggestions/route'
import { generateSmartSuggestions } from '../../../../utils/smartRowSuggestions'
import { consumeGeminiRateLimit } from '@/lib/geminiRateLimiter'
import { getRequestIdentity } from '@/lib/requestIdentity'
import { routeGeminiRequest, extractGeminiText } from '@/lib/geminiRouter'
import { TMDBApiClient } from '@/utils/tmdbApi'

jest.mock('../../../../utils/smartRowSuggestions')
jest.mock('@/lib/requestIdentity', () => ({
    getRequestIdentity: jest.fn(),
}))
jest.mock('@/lib/geminiRateLimiter', () => ({
    consumeGeminiRateLimit: jest.fn(),
}))
jest.mock('@/lib/geminiRouter', () => ({
    routeGeminiRequest: jest.fn(),
    extractGeminiText: jest.fn(),
    FLASH_LITE_PRIORITY: ['mock-model'],
}))
jest.mock('@/utils/tmdbApi', () => ({
    TMDBApiClient: {
        getInstance: jest.fn(),
    },
}))

const mockGenerateSmartSuggestions = generateSmartSuggestions as jest.MockedFunction<
    typeof generateSmartSuggestions
>
const mockGetRequestIdentity = getRequestIdentity as jest.MockedFunction<typeof getRequestIdentity>
const mockConsumeGeminiRateLimit = consumeGeminiRateLimit as jest.MockedFunction<
    typeof consumeGeminiRateLimit
>
const mockRouteGeminiRequest = routeGeminiRequest as jest.MockedFunction<typeof routeGeminiRequest>
const mockExtractGeminiText = extractGeminiText as jest.MockedFunction<typeof extractGeminiText>
const mockGetTMDBInstance = TMDBApiClient.getInstance as jest.Mock

function createTmdbResult() {
    return {
        suggestions: [
            {
                type: 'person',
                value: { name: 'Ridley Scott', id: 578 },
                confidence: 90,
                source: 'tmdb',
            },
        ],
        rowNames: ['Ridley Scott Films'],
        insight: 'Director-focused picks',
    }
}

describe('/api/smart-suggestions - Refactored flow', () => {
    let mockTMDBFetch: jest.Mock

    beforeEach(() => {
        jest.clearAllMocks()
        mockGenerateSmartSuggestions.mockReset()
        mockGetRequestIdentity.mockResolvedValue({ userId: null, rateLimitKey: 'test-rate' })
        mockConsumeGeminiRateLimit.mockReturnValue({ allowed: true, retryAfterMs: 0 })
        mockRouteGeminiRequest.mockResolvedValue({ success: true, data: {} })
        mockExtractGeminiText.mockReturnValue(null)

        mockTMDBFetch = jest.fn().mockResolvedValue({ results: [] })
        mockGetTMDBInstance.mockReturnValue({ fetch: mockTMDBFetch })

        process.env.GEMINI_API_KEY = 'test-gemini-key'
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({
                genreIds: [],
                mediaType: 'both',
                movieRecommendations: [],
            }),
        }) as unknown as typeof fetch
    })

    afterAll(() => {
        delete process.env.GEMINI_API_KEY
    })

    function createRequest(body: Record<string, unknown>): NextRequest {
        const url = new URL('http://localhost:3000/api/smart-suggestions')
        return new NextRequest(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        })
    }

    describe('Validation', () => {
        it('requires a query with at least five characters', async () => {
            const response = await POST(createRequest({ rawText: 'hey' }))
            const data = await response.json()

            expect(response.status).toBe(400)
            expect(data.error).toContain('Query text is required')
            expect(mockGenerateSmartSuggestions).not.toHaveBeenCalled()
        })

        it('sanitizes text and defaults invalid media types to "both"', async () => {
            mockGenerateSmartSuggestions.mockResolvedValueOnce(createTmdbResult())

            const response = await POST(
                createRequest({
                    rawText: '   action    vibes   marathon  ',
                    mediaType: 'podcast',
                })
            )
            await response.json()

            expect(mockGenerateSmartSuggestions).toHaveBeenCalledWith(
                {
                    entities: [],
                    mediaType: 'both',
                    rawText: 'action vibes marathon',
                },
                undefined
            )
        })
    })

    describe('Gemini merge', () => {
        it('merges Gemini genre IDs and updates mediaType from analysis', async () => {
            mockGenerateSmartSuggestions.mockResolvedValueOnce(createTmdbResult())
            ;(global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({
                    genreIds: ['horror', 'thriller'],
                    mediaType: 'tv',
                    movieRecommendations: [],
                }),
            })

            const response = await POST(
                createRequest({ rawText: 'moody horror miniseries', mediaType: 'movie' })
            )
            const data = await response.json()

            expect(response.status).toBe(200)
            const genreSuggestion = data.suggestions.find((s: any) => s.type === 'genre')
            expect(genreSuggestion).toBeDefined()
            expect(genreSuggestion.value).toEqual(['horror', 'thriller'])
            expect(genreSuggestion.source).toBe('gemini')
            expect(mockGenerateSmartSuggestions).toHaveBeenCalledWith(
                expect.objectContaining({ mediaType: 'tv' }),
                undefined
            )
        })

        it('converts Gemini movie recommendations into a content list after TMDB lookup', async () => {
            mockGenerateSmartSuggestions.mockResolvedValueOnce(createTmdbResult())
            mockTMDBFetch.mockResolvedValueOnce({ results: [{ id: 42 }] })
            ;(global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({
                    genreIds: [],
                    mediaType: 'movie',
                    movieRecommendations: [{ title: 'Blade Runner', year: 1982 }],
                }),
            })

            const response = await POST(
                createRequest({ rawText: 'neon soaked sci-fi noir', mediaType: 'movie' })
            )
            const data = await response.json()

            const contentList = data.suggestions.find((s: any) => s.type === 'content_list')
            expect(contentList).toBeDefined()
            expect(contentList.value).toEqual([42])
            expect(contentList.source).toBe('gemini')
            expect(mockTMDBFetch).toHaveBeenCalledWith('/search/movie', {
                query: 'Blade Runner',
                year: 1982,
            })
        })
    })

    describe('Creative naming + rate limits', () => {
        it('adds the creative Gemini row name before TMDB defaults', async () => {
            mockGenerateSmartSuggestions.mockResolvedValueOnce(createTmdbResult())
            mockExtractGeminiText.mockReturnValue(' "Certified Bangers" ')

            const response = await POST(
                createRequest({ rawText: 'intense sci-fi thrillers', mediaType: 'movie' })
            )
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(data.rowNames[0]).toBe('Certified Bangers')
            expect(data.rowNames[1]).toBe('Ridley Scott Films')
            expect(mockRouteGeminiRequest).toHaveBeenCalled()
            expect(mockConsumeGeminiRateLimit).toHaveBeenCalledWith('test-rate')
        })

        it('returns 429 when the naming rate limit is exhausted', async () => {
            mockGenerateSmartSuggestions.mockResolvedValueOnce(createTmdbResult())
            mockConsumeGeminiRateLimit.mockReturnValueOnce({ allowed: false, retryAfterMs: 2500 })

            const response = await POST(
                createRequest({ rawText: 'ambient space adventures', mediaType: 'movie' })
            )
            const data = await response.json()

            expect(response.status).toBe(429)
            expect(data.error).toContain('AI naming limit')
            expect(data.retryAfterMs).toBe(2500)
            expect(data.suggestions[0].source).toBe('tmdb')
            expect(mockRouteGeminiRequest).not.toHaveBeenCalled()
        })
    })

    describe('Failure handling', () => {
        it('continues with TMDB data when Gemini analysis fails', async () => {
            mockGenerateSmartSuggestions.mockResolvedValueOnce(createTmdbResult())
            ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('network down'))

            const response = await POST(
                createRequest({ rawText: 'crime mystery series', mediaType: 'tv' })
            )
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(data.suggestions).toHaveLength(1)
            expect(data.suggestions[0].source).toBe('tmdb')
        })

        it('returns 500 when TMDB generation fails', async () => {
            mockGenerateSmartSuggestions.mockRejectedValueOnce(new Error('TMDB API error'))

            const response = await POST(
                createRequest({ rawText: 'gritty detective dramas', mediaType: 'tv' })
            )
            const data = await response.json()

            expect(response.status).toBe(500)
            expect(data.error).toBe('Failed to generate suggestions')
        })
    })
})

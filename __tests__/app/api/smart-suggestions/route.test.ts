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
import { consumeAiQuota } from '@/lib/aiQuota'
import { getAiVisitor } from '@/lib/aiVisitor'
import { routeGeminiRequest, extractGeminiText } from '@/lib/geminiRouter'
import { TMDBApiClient } from '@/utils/tmdbApi'

jest.mock('../../../../utils/smartRowSuggestions')
jest.mock('@/lib/aiVisitor', () => ({
    getAiVisitor: jest.fn(),
}))
jest.mock('@/lib/aiQuota', () => ({
    consumeAiQuota: jest.fn(),
    refundAiQuota: jest.fn().mockResolvedValue(undefined),
    quotaExhaustedMessage: jest.fn(() => 'limit'),
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
const mockGetAiVisitor = getAiVisitor as jest.MockedFunction<typeof getAiVisitor>
const mockConsumeAiQuota = consumeAiQuota as jest.MockedFunction<typeof consumeAiQuota>
const quotaOk = {
    allowed: true,
    remaining: 9,
    limit: 10,
    exhausted: null,
    resetsAt: '2026-11-09T00:00:00.000Z',
} as const
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
        mockGetAiVisitor.mockResolvedValue({ userId: null, key: 'test-rate' })
        mockConsumeAiQuota.mockResolvedValue({ ...quotaOk })
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
            headers: {
                'Content-Type': 'application/json',
                Origin: 'http://localhost:3000', // Required for CSRF protection
            },
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
            mockGenerateSmartSuggestions.mockResolvedValueOnce(createTmdbResult()) // Gemini analysis now runs in-process (lib/gemini/analyzeText)
            mockExtractGeminiText.mockReturnValueOnce(
                JSON.stringify({
                    genreIds: ['horror', 'thriller'],
                    mediaType: 'tv',
                    movieRecommendations: [],
                })
            )

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
            mockTMDBFetch.mockResolvedValueOnce({ results: [{ id: 42 }] }) // Gemini analysis now runs in-process (lib/gemini/analyzeText)
            mockExtractGeminiText.mockReturnValueOnce(
                JSON.stringify({
                    genreIds: [],
                    mediaType: 'movie',
                    movieRecommendations: [{ title: 'Blade Runner', year: 1982 }],
                })
            )

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
            expect(mockConsumeAiQuota).toHaveBeenCalledWith('test-rate')
        })

        it('falls back to TMDB-only and says so when the AI quota is used up', async () => {
            mockGenerateSmartSuggestions.mockResolvedValueOnce(createTmdbResult())
            mockConsumeAiQuota.mockResolvedValueOnce({
                ...quotaOk,
                allowed: false,
                remaining: 0,
                exhausted: 'visitor',
            })

            const response = await POST(
                createRequest({ rawText: 'ambient space adventures', mediaType: 'movie' })
            )
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(data.ai).toBe('limit')
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

/**
 * Unit Tests for App Router API Route: /api/smart-suggestions
 *
 * Tests the orchestrator that combines TMDB analysis and Gemini AI insights
 *
 * @jest-environment node
 */

import { NextRequest } from 'next/server'
import { POST } from '../../../../app/api/smart-suggestions/route'
import { generateSmartSuggestions } from '../../../../utils/smartRowSuggestions'

// Mock dependencies
jest.mock('../../../../utils/smartRowSuggestions')
const mockGenerateSmartSuggestions = generateSmartSuggestions as jest.MockedFunction<
    typeof generateSmartSuggestions
>

// Mock fetch globally for Gemini calls
global.fetch = jest.fn()

describe('/api/smart-suggestions - Orchestration Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    /**
     * Helper to create a POST request with JSON body
     */
    function createRequest(body: Record<string, unknown>): NextRequest {
        const url = new URL('http://localhost:3000/api/smart-suggestions')
        return new NextRequest(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        })
    }

    describe('TMDB-Only Suggestions', () => {
        it('should return TMDB suggestions without Gemini for short text', async () => {
            const tmdbResult = {
                suggestions: [
                    {
                        type: 'person',
                        value: { name: 'Tom Hanks', id: 31 },
                        confidence: 95,
                        reason: 'Popular actor',
                        source: 'tmdb',
                    },
                ],
                rowNames: ['Tom Hanks Collection'],
                insight: 'Based on tagged actors',
            }

            mockGenerateSmartSuggestions.mockResolvedValueOnce(tmdbResult)

            const request = createRequest({
                entities: [{ type: 'person', name: 'Tom Hanks', id: 31 }],
                mediaType: 'movie',
                rawText: 'hi', // Too short for Gemini
            })

            const response = await POST(request)
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(data.suggestions).toHaveLength(1)
            expect(data.suggestions[0].source).toBe('tmdb')
            expect(global.fetch).not.toHaveBeenCalled() // No Gemini call
        })

        it('should return TMDB suggestions when rawText is missing', async () => {
            const tmdbResult = {
                suggestions: [
                    {
                        type: 'content',
                        value: { title: 'Inception', id: 27205 },
                        confidence: 90,
                        source: 'tmdb',
                    },
                ],
                rowNames: ['Mind-Bending Films'],
                insight: 'Based on selected content',
            }

            mockGenerateSmartSuggestions.mockResolvedValueOnce(tmdbResult)

            const request = createRequest({
                entities: [{ type: 'movie', name: 'Inception', id: 27205 }],
                mediaType: 'movie',
            })

            const response = await POST(request)
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(data.suggestions).toHaveLength(1)
            expect(global.fetch).not.toHaveBeenCalled()
        })
    })

    describe('Combined TMDB + Gemini Suggestions', () => {
        it('should merge TMDB and Gemini insights when text is provided', async () => {
            const tmdbResult = {
                suggestions: [
                    {
                        type: 'person',
                        value: { name: 'Ridley Scott', id: 578 },
                        confidence: 90,
                        source: 'tmdb',
                    },
                ],
                rowNames: ['Ridley Scott Films'],
                insight: 'Based on director',
            }

            mockGenerateSmartSuggestions.mockResolvedValueOnce(tmdbResult)

            // Mock successful Gemini response
            ;(global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({
                    genres: ['Science Fiction', 'Thriller'],
                    style: { tone: 'dark', maturity: 'mature' },
                    themes: ['dystopia'],
                    yearRange: { min: 1980, max: 1989 },
                    certification: ['R'],
                    recommendations: [
                        {
                            type: 'keyword',
                            value: 'cyberpunk',
                            reason: 'Dark sci-fi aesthetic',
                            confidence: 85,
                        },
                    ],
                    insight: 'User wants dark sci-fi from the 80s',
                }),
            })

            const request = createRequest({
                entities: [{ type: 'person', name: 'Ridley Scott', id: 578 }],
                mediaType: 'movie',
                rawText: 'dark gritty sci-fi like Blade Runner',
            })

            const response = await POST(request)
            const data = await response.json()

            expect(response.status).toBe(200)
            // Should have TMDB suggestion + Gemini genre + Gemini recommendations
            expect(data.suggestions.length).toBeGreaterThan(1)
            expect(data.suggestions.some((s: any) => s.source === 'tmdb')).toBe(true)
            expect(data.suggestions.some((s: any) => s.source === 'gemini')).toBe(true)
            expect(data.insight).toBe('User wants dark sci-fi from the 80s') // Gemini insight takes precedence
        })

        it('should add Gemini genre suggestions to combined results', async () => {
            mockGenerateSmartSuggestions.mockResolvedValueOnce({
                suggestions: [],
                rowNames: [],
                insight: '',
            })
            ;(global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({
                    genres: ['Horror', 'Thriller'],
                    recommendations: [],
                    insight: 'Scary movies requested',
                }),
            })

            const request = createRequest({
                entities: [],
                mediaType: 'movie',
                rawText: 'scary horror films',
            })

            const response = await POST(request)
            const data = await response.json()

            expect(response.status).toBe(200)
            const genreSuggestion = data.suggestions.find((s: any) => s.type === 'genre')
            expect(genreSuggestion).toBeDefined()
            expect(genreSuggestion.value).toEqual(['Horror', 'Thriller'])
            expect(genreSuggestion.source).toBe('gemini')
            expect(genreSuggestion.confidence).toBe(85)
        })

        it('should add Gemini recommendations to combined results', async () => {
            mockGenerateSmartSuggestions.mockResolvedValueOnce({
                suggestions: [],
                rowNames: [],
                insight: '',
            })
            ;(global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({
                    genres: [],
                    recommendations: [
                        { type: 'rating', value: 'PG', reason: 'Family-friendly', confidence: 90 },
                        { type: 'year_range', value: { min: 2000, max: 2010 }, confidence: 75 },
                    ],
                    insight: 'Family movies from 2000s',
                }),
            })

            const request = createRequest({
                entities: [],
                mediaType: 'movie',
                rawText: 'family friendly movies from the 2000s',
            })

            const response = await POST(request)
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(data.suggestions).toHaveLength(2)
            expect(data.suggestions[0].source).toBe('gemini')
            expect(data.suggestions[0].confidence).toBe(90)
        })
    })

    describe('Gemini Failure Handling', () => {
        it('should gracefully fall back to TMDB-only when Gemini fails', async () => {
            const tmdbResult = {
                suggestions: [{ type: 'person', value: { name: 'Actor', id: 1 }, source: 'tmdb' }],
                rowNames: ['Collection'],
                insight: 'TMDB insight',
            }

            mockGenerateSmartSuggestions.mockResolvedValueOnce(tmdbResult)

            // Mock Gemini API failure
            ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Gemini API timeout'))

            const request = createRequest({
                entities: [{ type: 'person', name: 'Actor', id: 1 }],
                mediaType: 'movie',
                rawText: 'action movies',
            })

            const response = await POST(request)
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(data.suggestions).toHaveLength(1)
            expect(data.suggestions[0].source).toBe('tmdb')
            expect(data.insight).toBe('TMDB insight')
        })

        it('should handle Gemini 404 errors gracefully', async () => {
            mockGenerateSmartSuggestions.mockResolvedValueOnce({
                suggestions: [{ type: 'genre', value: ['Action'], source: 'tmdb' }],
                rowNames: ['Action'],
                insight: 'TMDB',
            })
            ;(global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: false,
                status: 404,
            })

            const request = createRequest({
                entities: [],
                mediaType: 'movie',
                rawText: 'action films',
            })

            const response = await POST(request)
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(data.suggestions).toHaveLength(1)
        })

        it('should handle Gemini network errors gracefully', async () => {
            mockGenerateSmartSuggestions.mockResolvedValueOnce({
                suggestions: [],
                rowNames: [],
                insight: 'Base insight',
            })
            ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('ECONNREFUSED'))

            const request = createRequest({
                entities: [],
                mediaType: 'movie',
                rawText: 'thriller movies',
            })

            const response = await POST(request)

            expect(response.status).toBe(200)
        })
    })

    describe('Input Validation', () => {
        it('should reject invalid entities', async () => {
            const request = createRequest({
                entities: 'not an array',
                mediaType: 'movie',
            })

            const response = await POST(request)
            const data = await response.json()

            expect(response.status).toBe(400)
            expect(data.error).toBe('Invalid entities')
        })

        it('should reject missing entities', async () => {
            const request = createRequest({
                mediaType: 'movie',
            })

            const response = await POST(request)
            const data = await response.json()

            expect(response.status).toBe(400)
            expect(data.error).toBe('Invalid entities')
        })

        it('should reject invalid mediaType', async () => {
            const request = createRequest({
                entities: [],
                mediaType: 'podcast',
            })

            const response = await POST(request)
            const data = await response.json()

            expect(response.status).toBe(400)
            expect(data.error).toBe('Invalid media type')
        })

        it('should reject missing mediaType', async () => {
            const request = createRequest({
                entities: [],
            })

            const response = await POST(request)
            const data = await response.json()

            expect(response.status).toBe(400)
            expect(data.error).toBe('Invalid media type')
        })

        it('should accept valid mediaType values', async () => {
            mockGenerateSmartSuggestions.mockResolvedValue({
                suggestions: [],
                rowNames: [],
                insight: '',
            })

            for (const mediaType of ['movie', 'tv', 'both']) {
                const request = createRequest({
                    entities: [],
                    mediaType,
                })

                const response = await POST(request)
                expect(response.status).toBe(200)
            }
        })
    })

    describe('API Orchestration Flow', () => {
        it('should call generateSmartSuggestions with correct input', async () => {
            mockGenerateSmartSuggestions.mockResolvedValueOnce({
                suggestions: [],
                rowNames: [],
                insight: '',
            })

            const inputData = {
                entities: [{ type: 'person', name: 'Actor', id: 123 }],
                mediaType: 'movie',
                rawText: 'test',
            }

            const request = createRequest(inputData)
            await POST(request)

            expect(mockGenerateSmartSuggestions).toHaveBeenCalledWith(inputData)
        })

        it('should call Gemini analyze endpoint with correct parameters', async () => {
            mockGenerateSmartSuggestions.mockResolvedValueOnce({
                suggestions: [],
                rowNames: [],
                insight: '',
            })
            ;(global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({
                    genres: [],
                    recommendations: [],
                    insight: '',
                }),
            })

            const request = createRequest({
                entities: [{ type: 'movie', name: 'Inception', id: 27205 }],
                mediaType: 'movie',
                rawText: 'mind-bending films',
            })

            await POST(request)

            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/gemini/analyze'),
                expect.objectContaining({
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: expect.stringContaining('mind-bending films'),
                })
            )
        })
    })

    describe('Error Handling', () => {
        it('should return 500 when TMDB suggestions fail', async () => {
            mockGenerateSmartSuggestions.mockRejectedValueOnce(new Error('TMDB API error'))

            const request = createRequest({
                entities: [],
                mediaType: 'movie',
            })

            const response = await POST(request)
            const data = await response.json()

            expect(response.status).toBe(500)
            expect(data.error).toBe('Failed to generate suggestions')
        })
    })

    describe('Response Format', () => {
        it('should return expected structure with suggestions, rowNames, and insight', async () => {
            mockGenerateSmartSuggestions.mockResolvedValueOnce({
                suggestions: [{ type: 'genre', value: ['Action'] }],
                rowNames: ['Action Row'],
                insight: 'Test insight',
            })

            const request = createRequest({
                entities: [],
                mediaType: 'movie',
            })

            const response = await POST(request)
            const data = await response.json()

            expect(data).toHaveProperty('suggestions')
            expect(data).toHaveProperty('rowNames')
            expect(data).toHaveProperty('insight')
            expect(Array.isArray(data.suggestions)).toBe(true)
            expect(Array.isArray(data.rowNames)).toBe(true)
        })

        it('should preserve TMDB suggestions order and add Gemini suggestions', async () => {
            mockGenerateSmartSuggestions.mockResolvedValueOnce({
                suggestions: [
                    { type: 'person', value: 'A', source: 'tmdb' },
                    { type: 'content', value: 'B', source: 'tmdb' },
                ],
                rowNames: [],
                insight: '',
            })
            ;(global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({
                    genres: ['Action'],
                    recommendations: [{ type: 'rating', value: 'PG-13' }],
                    insight: '',
                }),
            })

            const request = createRequest({
                entities: [],
                mediaType: 'movie',
                rawText: 'action',
            })

            const response = await POST(request)
            const data = await response.json()

            // TMDB suggestions should come first
            expect(data.suggestions[0].source).toBe('tmdb')
            expect(data.suggestions[1].source).toBe('tmdb')
            // Then Gemini suggestions
            expect(data.suggestions[2].source).toBe('gemini')
        })
    })
})

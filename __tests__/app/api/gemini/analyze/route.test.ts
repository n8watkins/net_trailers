/**
 * Unit Tests for App Router API Route: /api/gemini/analyze
 *
 * Tests the Gemini AI semantic analysis endpoint
 *
 * @jest-environment node
 */

import { NextRequest } from 'next/server'
import { POST } from '../../../../../app/api/gemini/analyze/route'

// Mock fetch globally
global.fetch = jest.fn()

describe('/api/gemini/analyze - Semantic Analysis Tests', () => {
    const originalEnv = process.env

    beforeEach(() => {
        jest.clearAllMocks()
        process.env = { ...originalEnv, GEMINI_API_KEY: 'test-api-key' }
    })

    afterEach(() => {
        process.env = originalEnv
    })

    /**
     * Helper to create a POST request with JSON body
     */
    function createRequest(body: Record<string, unknown>): NextRequest {
        const url = new URL('http://localhost:3000/api/gemini/analyze')
        return new NextRequest(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        })
    }

    /**
     * Helper to create mock Gemini API response
     */
    function mockGeminiResponse(analysisData: Record<string, unknown>) {
        return {
            ok: true,
            status: 200,
            json: async () => ({
                candidates: [
                    {
                        content: {
                            parts: [
                                {
                                    text: JSON.stringify(analysisData),
                                },
                            ],
                        },
                    },
                ],
            }),
        }
    }

    describe('Successful Analysis', () => {
        it('should analyze dark gritty sci-fi text correctly', async () => {
            const mockAnalysis = {
                genres: ['Science Fiction', 'Thriller'],
                style: { tone: 'dark', maturity: 'mature' },
                themes: ['dystopia', 'artificial intelligence'],
                yearRange: { min: 1980, max: 1989 },
                certification: ['R'],
                recommendations: [
                    {
                        type: 'keyword',
                        value: 'cyberpunk',
                        reason: 'Blade Runner is quintessential cyberpunk',
                        confidence: 95,
                    },
                ],
                insight: 'User wants mature, dark sci-fi with dystopian themes',
            }

            ;(global.fetch as jest.Mock).mockResolvedValueOnce(mockGeminiResponse(mockAnalysis))

            const request = createRequest({
                text: 'dark gritty sci-fi like Blade Runner',
                entities: [],
                mediaType: 'movie',
            })

            const response = await POST(request)
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(data.genres).toEqual(['Science Fiction', 'Thriller'])
            expect(data.style.tone).toBe('dark')
            expect(data.themes).toContain('dystopia')
            expect(data.yearRange).toEqual({ min: 1980, max: 1989 })
            expect(data.certification).toEqual(['R'])
            expect(data.recommendations).toHaveLength(1)
            expect(data.insight).toBeTruthy()
        })

        it('should handle family-friendly content analysis', async () => {
            const mockAnalysis = {
                genres: ['Animation', 'Comedy', 'Family'],
                style: { tone: 'light', maturity: 'family' },
                themes: ['friendship', 'adventure'],
                yearRange: null,
                certification: ['G', 'PG'],
                recommendations: [
                    {
                        type: 'rating',
                        value: 'G',
                        reason: 'Family-friendly keywords indicate G-rated content',
                        confidence: 90,
                    },
                ],
                insight: 'User wants wholesome animated content for all ages',
            }

            ;(global.fetch as jest.Mock).mockResolvedValueOnce(mockGeminiResponse(mockAnalysis))

            const request = createRequest({
                text: 'fun animated movies for kids with talking animals',
                entities: [],
                mediaType: 'movie',
            })

            const response = await POST(request)
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(data.style.maturity).toBe('family')
            expect(data.certification).toContain('G')
        })

        it('should include tagged entities in analysis', async () => {
            const mockAnalysis = {
                genres: ['Action', 'Adventure'],
                style: { tone: 'light', maturity: 'teen' },
                themes: ['heroism'],
                yearRange: null,
                certification: ['PG-13'],
                recommendations: [],
                insight: 'User wants Marvel-style action adventures',
            }

            ;(global.fetch as jest.Mock).mockResolvedValueOnce(mockGeminiResponse(mockAnalysis))

            const request = createRequest({
                text: 'superhero movies',
                entities: [
                    { type: 'person', name: 'Robert Downey Jr.', id: 3223 },
                    { type: 'movie', name: 'Iron Man', id: 1726 },
                ],
                mediaType: 'movie',
            })

            const response = await POST(request)
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('generativelanguage.googleapis.com'),
                expect.objectContaining({
                    method: 'POST',
                    body: expect.stringContaining('Robert Downey Jr.'),
                })
            )
        })
    })

    describe('Input Validation', () => {
        it('should reject empty text', async () => {
            const request = createRequest({
                text: '',
                entities: [],
                mediaType: 'movie',
            })

            const response = await POST(request)
            const data = await response.json()

            expect(response.status).toBe(400)
            expect(data.error).toBe('Text too short for analysis')
        })

        it('should reject text shorter than 5 characters', async () => {
            const request = createRequest({
                text: 'hi',
                entities: [],
                mediaType: 'movie',
            })

            const response = await POST(request)
            const data = await response.json()

            expect(response.status).toBe(400)
            expect(data.error).toBe('Text too short for analysis')
        })

        it('should trim whitespace before validation', async () => {
            const request = createRequest({
                text: '   a   ',
                entities: [],
                mediaType: 'movie',
            })

            const response = await POST(request)
            const data = await response.json()

            expect(response.status).toBe(400)
            expect(data.error).toBe('Text too short for analysis')
        })
    })

    describe('API Configuration', () => {
        it('should return 503 when API key is missing', async () => {
            delete process.env.GEMINI_API_KEY

            const request = createRequest({
                text: 'test text here',
                entities: [],
                mediaType: 'movie',
            })

            const response = await POST(request)
            const data = await response.json()

            expect(response.status).toBe(503)
            expect(data.error).toBe('AI analysis unavailable')
        })

        it('should use correct Gemini model and parameters', async () => {
            const mockAnalysis = {
                genres: ['Action'],
                style: { tone: 'light', maturity: 'teen' },
                themes: [],
                yearRange: null,
                certification: null,
                recommendations: [],
                insight: 'Test insight',
            }

            ;(global.fetch as jest.Mock).mockResolvedValueOnce(mockGeminiResponse(mockAnalysis))

            const request = createRequest({
                text: 'action movies',
                entities: [],
                mediaType: 'movie',
            })

            await POST(request)

            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('gemini-1.5-flash:generateContent'),
                expect.objectContaining({
                    method: 'POST',
                    body: expect.stringContaining('"temperature":0.3'),
                })
            )
        })
    })

    describe('Error Handling', () => {
        it('should handle Gemini API errors', async () => {
            ;(global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: false,
                status: 500,
            })

            const request = createRequest({
                text: 'test text',
                entities: [],
                mediaType: 'movie',
            })

            const response = await POST(request)
            const data = await response.json()

            expect(response.status).toBe(500)
            expect(data.error).toBe('Failed to analyze text')
        })

        it('should handle malformed Gemini response', async () => {
            ;(global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({}),
            })

            const request = createRequest({
                text: 'test text',
                entities: [],
                mediaType: 'movie',
            })

            const response = await POST(request)
            const data = await response.json()

            expect(response.status).toBe(500)
            expect(data.error).toBe('Failed to analyze text')
        })

        it('should handle invalid JSON in Gemini response', async () => {
            ;(global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({
                    candidates: [
                        {
                            content: {
                                parts: [{ text: 'not valid json' }],
                            },
                        },
                    ],
                }),
            })

            const request = createRequest({
                text: 'test text',
                entities: [],
                mediaType: 'movie',
            })

            const response = await POST(request)
            const data = await response.json()

            expect(response.status).toBe(500)
            expect(data.error).toBe('Failed to analyze text')
        })

        it('should handle network errors', async () => {
            ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

            const request = createRequest({
                text: 'test text',
                entities: [],
                mediaType: 'movie',
            })

            const response = await POST(request)
            const data = await response.json()

            expect(response.status).toBe(500)
            expect(data.error).toBe('Failed to analyze text')
        })
    })

    describe('Response Format', () => {
        it('should return all expected fields', async () => {
            const mockAnalysis = {
                genres: ['Horror'],
                style: { tone: 'dark', maturity: 'adult' },
                themes: ['survival'],
                yearRange: null,
                certification: ['R'],
                recommendations: [],
                insight: 'Test',
            }

            ;(global.fetch as jest.Mock).mockResolvedValueOnce(mockGeminiResponse(mockAnalysis))

            const request = createRequest({
                text: 'scary horror films',
                entities: [],
                mediaType: 'movie',
            })

            const response = await POST(request)
            const data = await response.json()

            expect(data).toHaveProperty('genres')
            expect(data).toHaveProperty('style')
            expect(data).toHaveProperty('themes')
            expect(data).toHaveProperty('yearRange')
            expect(data).toHaveProperty('certification')
            expect(data).toHaveProperty('recommendations')
            expect(data).toHaveProperty('insight')
        })

        it('should provide empty arrays for missing optional fields', async () => {
            const mockAnalysis = {
                insight: 'Minimal response',
            }

            ;(global.fetch as jest.Mock).mockResolvedValueOnce(mockGeminiResponse(mockAnalysis))

            const request = createRequest({
                text: 'test query',
                entities: [],
                mediaType: 'movie',
            })

            const response = await POST(request)
            const data = await response.json()

            expect(data.genres).toEqual([])
            expect(data.style).toEqual({})
            expect(data.themes).toEqual([])
            expect(data.yearRange).toBeNull()
            expect(data.certification).toBeNull()
            expect(data.recommendations).toEqual([])
        })
    })
})

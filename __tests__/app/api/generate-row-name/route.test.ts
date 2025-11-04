/**
 * Unit Tests for App Router API Route: /api/generate-row-name
 *
 * Tests the Gemini AI creative row name generation endpoint
 *
 * @jest-environment node
 */

import { NextRequest } from 'next/server'
import { POST } from '../../../../app/api/generate-row-name/route'

// Mock fetch globally
global.fetch = jest.fn()

describe('/api/generate-row-name - Creative Name Generation Tests', () => {
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
        const url = new URL('http://localhost:3000/api/generate-row-name')
        return new NextRequest(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        })
    }

    /**
     * Helper to create mock Gemini API response
     */
    function mockGeminiResponse(generatedName: string) {
        return {
            ok: true,
            status: 200,
            json: async () => ({
                candidates: [
                    {
                        content: {
                            parts: [{ text: generatedName }],
                        },
                    },
                ],
            }),
        }
    }

    describe('Successful Name Generation', () => {
        it('should generate creative name for Action + Comedy', async () => {
            ;(global.fetch as jest.Mock).mockResolvedValueOnce(
                mockGeminiResponse('Punch & Giggles')
            )

            const request = createRequest({
                genres: [28, 35], // Action, Comedy
                genreLogic: 'AND',
                mediaType: 'movie',
            })

            const response = await POST(request)
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(data.name).toBe('Punch & Giggles')
        })

        it('should generate creative name for Horror + Romance', async () => {
            ;(global.fetch as jest.Mock).mockResolvedValueOnce(mockGeminiResponse('Love Bites'))

            const request = createRequest({
                genres: [27, 10749], // Horror, Romance
                genreLogic: 'AND',
                mediaType: 'movie',
            })

            const response = await POST(request)
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(data.name).toBe('Love Bites')
        })

        it('should handle Sci-Fi + Western combination', async () => {
            ;(global.fetch as jest.Mock).mockResolvedValueOnce(mockGeminiResponse('Space Cowboys'))

            const request = createRequest({
                genres: [878, 37], // Sci-Fi, Western
                genreLogic: 'AND',
                mediaType: 'movie',
            })

            const response = await POST(request)
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(data.name).toBe('Space Cowboys')
        })

        it('should handle OR logic differently than AND', async () => {
            ;(global.fetch as jest.Mock).mockResolvedValueOnce(
                mockGeminiResponse('Action or Laughs')
            )

            const request = createRequest({
                genres: [28, 35], // Action, Comedy
                genreLogic: 'OR',
                mediaType: 'movie',
            })

            const response = await POST(request)

            expect(response.status).toBe(200)
            expect(global.fetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    body: expect.stringContaining('ANY of'),
                })
            )
        })

        it('should handle TV shows differently than movies', async () => {
            ;(global.fetch as jest.Mock).mockResolvedValueOnce(mockGeminiResponse('Drama Queens'))

            const request = createRequest({
                genres: [18], // Drama
                genreLogic: 'AND',
                mediaType: 'tv',
            })

            const response = await POST(request)

            expect(response.status).toBe(200)
            expect(global.fetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    body: expect.stringContaining('TV shows'),
                })
            )
        })

        it('should handle both movies and TV shows', async () => {
            ;(global.fetch as jest.Mock).mockResolvedValueOnce(mockGeminiResponse('Screen Scares'))

            const request = createRequest({
                genres: [27], // Horror
                genreLogic: 'AND',
                mediaType: 'both',
            })

            const response = await POST(request)

            expect(response.status).toBe(200)
            expect(global.fetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    body: expect.stringContaining('movies and TV shows'),
                })
            )
        })

        it('should clean up quoted and formatted responses', async () => {
            ;(global.fetch as jest.Mock).mockResolvedValueOnce(
                mockGeminiResponse('"**Animated Adventures**"')
            )

            const request = createRequest({
                genres: [16, 12], // Animation, Adventure
                genreLogic: 'AND',
                mediaType: 'movie',
            })

            const response = await POST(request)
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(data.name).toBe('Animated Adventures') // Should strip quotes and markdown
        })
    })

    describe('Input Validation', () => {
        it('should reject request with empty genres array', async () => {
            const request = createRequest({
                genres: [],
                genreLogic: 'AND',
                mediaType: 'movie',
            })

            const response = await POST(request)
            const data = await response.json()

            expect(response.status).toBe(400)
            expect(data.error).toBe('Bad request')
            expect(data.message).toContain('genres array is required')
        })

        it('should reject request with missing genres', async () => {
            const request = createRequest({
                genreLogic: 'AND',
                mediaType: 'movie',
            })

            const response = await POST(request)
            const data = await response.json()

            expect(response.status).toBe(400)
            expect(data.error).toBe('Bad request')
        })

        it('should reject invalid genreLogic', async () => {
            const request = createRequest({
                genres: [28],
                genreLogic: 'XOR',
                mediaType: 'movie',
            })

            const response = await POST(request)
            const data = await response.json()

            expect(response.status).toBe(400)
            expect(data.message).toContain('genreLogic must be AND or OR')
        })

        it('should reject invalid mediaType', async () => {
            const request = createRequest({
                genres: [28],
                genreLogic: 'AND',
                mediaType: 'podcast',
            })

            const response = await POST(request)
            const data = await response.json()

            expect(response.status).toBe(400)
            expect(data.message).toContain('mediaType must be movie, tv, or both')
        })

        it('should reject missing genreLogic', async () => {
            const request = createRequest({
                genres: [28],
                mediaType: 'movie',
            })

            const response = await POST(request)
            const data = await response.json()

            expect(response.status).toBe(400)
        })

        it('should reject missing mediaType', async () => {
            const request = createRequest({
                genres: [28],
                genreLogic: 'AND',
            })

            const response = await POST(request)
            const data = await response.json()

            expect(response.status).toBe(400)
        })
    })

    describe('Genre Mapping', () => {
        it('should map genre IDs to names correctly', async () => {
            ;(global.fetch as jest.Mock).mockResolvedValueOnce(
                mockGeminiResponse('Science Thrills')
            )

            const request = createRequest({
                genres: [878, 53], // Sci-Fi (878), Thriller (53)
                genreLogic: 'AND',
                mediaType: 'movie',
            })

            await POST(request)

            expect(global.fetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    body: expect.stringContaining('Science Fiction'),
                })
            )
            expect(global.fetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    body: expect.stringContaining('Thriller'),
                })
            )
        })

        it('should handle unknown genre IDs gracefully', async () => {
            ;(global.fetch as jest.Mock).mockResolvedValueOnce(mockGeminiResponse('Mystery Mix'))

            const request = createRequest({
                genres: [99999], // Non-existent genre ID
                genreLogic: 'AND',
                mediaType: 'movie',
            })

            const response = await POST(request)

            expect(response.status).toBe(200)
            expect(global.fetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    body: expect.stringContaining('Genre 99999'),
                })
            )
        })

        it('should handle TV-specific genres', async () => {
            ;(global.fetch as jest.Mock).mockResolvedValueOnce(mockGeminiResponse('Reality Check'))

            const request = createRequest({
                genres: [10764], // Reality TV
                genreLogic: 'AND',
                mediaType: 'tv',
            })

            await POST(request)

            expect(global.fetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    body: expect.stringContaining('Reality'),
                })
            )
        })
    })

    describe('API Configuration', () => {
        it('should return 500 when API key is missing', async () => {
            delete process.env.GEMINI_API_KEY

            const request = createRequest({
                genres: [28],
                genreLogic: 'AND',
                mediaType: 'movie',
            })

            const response = await POST(request)
            const data = await response.json()

            expect(response.status).toBe(500)
            expect(data.error).toBe('Configuration error')
            expect(data.message).toContain('Gemini API key not configured')
        })

        it('should use creative temperature (0.9) for name generation', async () => {
            ;(global.fetch as jest.Mock).mockResolvedValueOnce(mockGeminiResponse('Creative Name'))

            const request = createRequest({
                genres: [28],
                genreLogic: 'AND',
                mediaType: 'movie',
            })

            await POST(request)

            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('gemini-2.5-flash:generateContent'),
                expect.objectContaining({
                    body: expect.stringContaining('"temperature":0.9'),
                })
            )
        })

        it('should allocate 5000 tokens for Gemini 2.5 thinking mode', async () => {
            ;(global.fetch as jest.Mock).mockResolvedValueOnce(mockGeminiResponse('Short Name'))

            const request = createRequest({
                genres: [28],
                genreLogic: 'AND',
                mediaType: 'movie',
            })

            await POST(request)

            expect(global.fetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    body: expect.stringContaining('"maxOutputTokens":5000'),
                })
            )
        })
    })

    describe('Error Handling', () => {
        it('should handle Gemini API errors', async () => {
            ;(global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: false,
                status: 429,
                text: async () => 'Rate limit exceeded',
            })

            const request = createRequest({
                genres: [28],
                genreLogic: 'AND',
                mediaType: 'movie',
            })

            const response = await POST(request)
            const data = await response.json()

            expect(response.status).toBe(500)
            expect(data.error).toBe('AI service error')
        })

        it('should handle malformed Gemini response', async () => {
            ;(global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({}),
            })

            const request = createRequest({
                genres: [28],
                genreLogic: 'AND',
                mediaType: 'movie',
            })

            const response = await POST(request)
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(data.name).toBe('Untitled Row') // Fallback name
        })

        it('should handle network errors', async () => {
            ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network timeout'))

            const request = createRequest({
                genres: [28],
                genreLogic: 'AND',
                mediaType: 'movie',
            })

            const response = await POST(request)
            const data = await response.json()

            expect(response.status).toBe(500)
            expect(data.error).toBe('Internal server error')
        })
    })

    describe('Prompt Quality', () => {
        it('should include creative requirements in prompt', async () => {
            ;(global.fetch as jest.Mock).mockResolvedValueOnce(mockGeminiResponse('Test Name'))

            const request = createRequest({
                genres: [28, 35],
                genreLogic: 'AND',
                mediaType: 'movie',
            })

            await POST(request)

            const fetchCall = (global.fetch as jest.Mock).mock.calls[0][1]
            const body = JSON.parse(fetchCall.body)
            const prompt = body.contents[0].parts[0].text

            expect(prompt).toContain('creative')
            expect(prompt).toContain('catchy')
            expect(prompt).toContain('funny')
            expect(prompt).toContain('2-4 words')
        })

        it('should include genre examples in prompt', async () => {
            ;(global.fetch as jest.Mock).mockResolvedValueOnce(mockGeminiResponse('Test Name'))

            const request = createRequest({
                genres: [28],
                genreLogic: 'AND',
                mediaType: 'movie',
            })

            await POST(request)

            const fetchCall = (global.fetch as jest.Mock).mock.calls[0][1]
            const body = JSON.parse(fetchCall.body)
            const prompt = body.contents[0].parts[0].text

            expect(prompt).toContain('Punch & Giggles')
            expect(prompt).toContain('Love Bites')
            expect(prompt).toContain('Space Cowboys')
        })
    })
})

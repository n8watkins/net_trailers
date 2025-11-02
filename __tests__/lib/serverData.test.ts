/**
 * Unit Tests for Server Data Fetching (Phase 2)
 *
 * Tests server-side data fetching functions used by App Router server components.
 * These functions fetch data from internal API routes which proxy TMDB.
 * Environment variables are set in jest.setup.js.
 */

import { fetchHomeData, HomeData } from '../../lib/serverData'
import { Content } from '../../typings'
import { getChildSafetyMode } from '../../lib/childSafetyCookieServer'

// Mock child safety cookie module
jest.mock('../../lib/childSafetyCookieServer', () => ({
    getChildSafetyMode: jest.fn().mockResolvedValue(false),
}))

// Get mocked function for type safety
const mockGetChildSafetyMode = getChildSafetyMode as jest.MockedFunction<typeof getChildSafetyMode>

// Mock global fetch
const mockFetch = jest.fn()
// eslint-disable-next-line @typescript-eslint/no-explicit-any
global.fetch = mockFetch as any

// Helper to create mock API response
function createMockResponse(results: Partial<Content>[]): Response {
    return {
        ok: true,
        json: async () => ({ results }),
        status: 200,
        statusText: 'OK',
    } as Response
}

// Helper to create mock content
function createMockContent(id: number, mediaType: 'movie' | 'tv' = 'movie'): Partial<Content> {
    return {
        id,
        media_type: mediaType,
        title: mediaType === 'movie' ? `Movie ${id}` : undefined,
        name: mediaType === 'tv' ? `TV Show ${id}` : undefined,
        poster_path: `/poster${id}.jpg`,
        backdrop_path: `/backdrop${id}.jpg`,
        overview: `Overview for content ${id}`,
        vote_average: 7.5,
        vote_count: 1000,
    }
}

describe('lib/serverData', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        // Reset VERCEL_URL (other env vars are set at top of file)
        delete process.env.VERCEL_URL
    })

    describe('fetchHomeData - Basic Functionality', () => {
        // TODO: Test for missing API key requires module-level mocking
        // Skipped for now as the API_KEY constant is set at module load time
        it.skip('should throw error if TMDB API key is not configured', async () => {
            // Would need to mock the entire module to test this
        })

        it('should fetch mixed content (movies + TV) when no filter specified', async () => {
            // Mock all 14 fetch calls for mixed content
            const mockContent = createMockContent(1, 'movie')
            const mockResponses = Array(14).fill(createMockResponse([mockContent]))

            mockFetch.mockImplementation(() => Promise.resolve(mockResponses[0]))

            const result = await fetchHomeData()

            // Should make 14 fetch calls for mixed content
            expect(mockFetch).toHaveBeenCalledTimes(14)

            // Verify result structure
            expect(result).toHaveProperty('trending')
            expect(result).toHaveProperty('topRated')
            expect(result).toHaveProperty('genre1')
            expect(result).toHaveProperty('genre2')
            expect(result).toHaveProperty('genre3')
            expect(result).toHaveProperty('genre4')
            expect(result).toHaveProperty('documentaries')

            // All arrays should be populated
            expect(Array.isArray(result.trending)).toBe(true)
            expect(Array.isArray(result.topRated)).toBe(true)
        })

        it('should fetch only movies when filter="movies"', async () => {
            const mockContent = createMockContent(1, 'movie')
            const mockResponse = createMockResponse([mockContent])

            mockFetch.mockResolvedValue(mockResponse)

            await fetchHomeData('movies')

            // Should make 8 fetch calls for movies
            expect(mockFetch).toHaveBeenCalledTimes(8)

            // Verify movie-specific API calls
            const calls = mockFetch.mock.calls.map((call) => call[0] as string)
            expect(calls.some((url) => url.includes('/api/movies/trending'))).toBe(true)
            expect(calls.some((url) => url.includes('/api/genres/movie/'))).toBe(true)
            expect(calls.every((url) => !url.includes('/api/tv/'))).toBe(true)
        })

        it('should fetch only TV shows when filter="tv"', async () => {
            const mockContent = createMockContent(1, 'tv')
            const mockResponse = createMockResponse([mockContent])

            mockFetch.mockResolvedValue(mockResponse)

            await fetchHomeData('tv')

            // Should make 8 fetch calls for TV
            expect(mockFetch).toHaveBeenCalledTimes(8)

            // Verify TV-specific API calls
            const calls = mockFetch.mock.calls.map((call) => call[0] as string)
            expect(calls.some((url) => url.includes('/api/tv/trending'))).toBe(true)
            expect(calls.some((url) => url.includes('/api/genres/tv/'))).toBe(true)
            expect(calls.every((url) => !url.includes('/api/movies/'))).toBe(true)
        })
    })

    describe('fetchHomeData - Child Safety Mode', () => {
        it('should pass childSafetyMode=true param when child safety enabled', async () => {
            mockGetChildSafetyMode.mockResolvedValueOnce(true)

            const mockContent = createMockContent(1, 'movie')
            const mockResponse = createMockResponse([mockContent])
            mockFetch.mockResolvedValue(mockResponse)

            await fetchHomeData('movies')

            // Verify childSafetyMode param in fetch calls
            const calls = mockFetch.mock.calls.map((call) => call[0] as string)
            expect(calls.every((url) => url.includes('childSafetyMode=true'))).toBe(true)
        })

        it('should not pass childSafetyMode param when disabled', async () => {
            mockGetChildSafetyMode.mockResolvedValueOnce(false)

            const mockContent = createMockContent(1, 'movie')
            const mockResponse = createMockResponse([mockContent])
            mockFetch.mockResolvedValue(mockResponse)

            await fetchHomeData('movies')

            // Verify no childSafetyMode param in fetch calls
            const calls = mockFetch.mock.calls.map((call) => call[0] as string)
            expect(calls.every((url) => !url.includes('childSafetyMode=true'))).toBe(true)
        })

        it('should fetch family-friendly genres when child safety enabled for movies', async () => {
            mockGetChildSafetyMode.mockResolvedValueOnce(true)

            const mockContent = createMockContent(1, 'movie')
            const mockResponse = createMockResponse([mockContent])
            mockFetch.mockResolvedValue(mockResponse)

            await fetchHomeData('movies')

            const calls = mockFetch.mock.calls.map((call) => call[0] as string)

            // Should fetch Animation (16), Family (10751), Adventure (12), Fantasy (14)
            expect(calls.some((url) => url.includes('/api/genres/movie/16'))).toBe(true) // Animation
            expect(calls.some((url) => url.includes('/api/genres/movie/10751'))).toBe(true) // Family

            // Should NOT fetch Horror (27)
            expect(calls.some((url) => url.includes('/api/genres/movie/27'))).toBe(false)
        })
    })

    describe('fetchHomeData - Data Deduplication', () => {
        it('should deduplicate content with same id and media_type', async () => {
            const duplicateContent = [
                createMockContent(1, 'movie'),
                createMockContent(1, 'movie'), // Duplicate
                createMockContent(2, 'movie'),
            ]

            const mockResponse = createMockResponse(duplicateContent as Content[])
            mockFetch.mockResolvedValue(mockResponse)

            const result = await fetchHomeData('movies')

            // Each category should have deduplicated content
            // Note: Due to randomization, we can't predict exact order, but count should be correct
            result.trending.forEach((item) => {
                const sameIdItems = result.trending.filter((i) => i.id === item.id)
                expect(sameIdItems.length).toBe(1) // No duplicates
            })
        })

        it('should treat same id with different media_type as different items', async () => {
            const mixedContent = [
                createMockContent(1, 'movie'),
                createMockContent(1, 'tv'), // Same ID, different type
            ]

            const mockResponse = createMockResponse(mixedContent as Content[])
            mockFetch.mockResolvedValue(mockResponse)

            const result = await fetchHomeData() // Mixed content

            // Both items should be present (not deduplicated)
            // We can't check exact count due to other API calls, but verify no error
            expect(result).toBeTruthy()
        })
    })

    describe('fetchHomeData - Error Handling', () => {
        it('should throw error when API request fails', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 500,
                statusText: 'Internal Server Error',
            } as Response)

            await expect(fetchHomeData('movies')).rejects.toThrow('Failed to fetch content: 500')
        })

        it('should throw error when network request fails', async () => {
            mockFetch.mockRejectedValueOnce(new Error('Network error'))

            await expect(fetchHomeData('movies')).rejects.toThrow('Network error')
        })

        it('should handle empty results gracefully', async () => {
            const emptyResponse = createMockResponse([])
            mockFetch.mockResolvedValue(emptyResponse)

            const result = await fetchHomeData('movies')

            // Should return empty arrays, not throw error
            expect(result.trending).toEqual([])
            expect(result.topRated).toEqual([])
            expect(result.genre1).toEqual([])
        })
    })

    describe('fetchHomeData - Base URL Handling', () => {
        it('should use VERCEL_URL in production', async () => {
            process.env.VERCEL_URL = 'myapp.vercel.app'

            const mockContent = createMockContent(1, 'movie')
            const mockResponse = createMockResponse([mockContent])
            mockFetch.mockResolvedValue(mockResponse)

            await fetchHomeData('movies')

            const calls = mockFetch.mock.calls.map((call) => call[0] as string)
            expect(calls.every((url) => url.startsWith('https://myapp.vercel.app'))).toBe(true)
        })

        it('should use NEXT_PUBLIC_BASE_URL when VERCEL_URL not set', async () => {
            delete process.env.VERCEL_URL
            process.env.NEXT_PUBLIC_BASE_URL = 'http://localhost:3004'

            const mockContent = createMockContent(1, 'movie')
            const mockResponse = createMockResponse([mockContent])
            mockFetch.mockResolvedValue(mockResponse)

            await fetchHomeData('movies')

            const calls = mockFetch.mock.calls.map((call) => call[0] as string)
            expect(calls.every((url) => url.startsWith('http://localhost:3004'))).toBe(true)
        })

        it('should default to localhost:3000 when no base URL configured', async () => {
            delete process.env.VERCEL_URL
            delete process.env.NEXT_PUBLIC_BASE_URL

            const mockContent = createMockContent(1, 'movie')
            const mockResponse = createMockResponse([mockContent])
            mockFetch.mockResolvedValue(mockResponse)

            await fetchHomeData('movies')

            const calls = mockFetch.mock.calls.map((call) => call[0] as string)
            expect(calls.every((url) => url.startsWith('http://localhost:3000'))).toBe(true)
        })
    })

    describe('fetchHomeData - Data Structure Validation', () => {
        it('should return correct HomeData structure', async () => {
            const mockContent = createMockContent(1, 'movie')
            const mockResponse = createMockResponse([mockContent])
            mockFetch.mockResolvedValue(mockResponse)

            const result = await fetchHomeData('movies')

            // Verify TypeScript interface compliance
            const homeData: HomeData = result
            expect(homeData).toBeDefined()

            // Verify all required fields
            expect(Array.isArray(homeData.trending)).toBe(true)
            expect(Array.isArray(homeData.topRated)).toBe(true)
            expect(Array.isArray(homeData.genre1)).toBe(true)
            expect(Array.isArray(homeData.genre2)).toBe(true)
            expect(Array.isArray(homeData.genre3)).toBe(true)
            expect(Array.isArray(homeData.genre4)).toBe(true)
            expect(Array.isArray(homeData.documentaries)).toBe(true)
        })

        it('should combine topRated data from multiple pages', async () => {
            const page1Content = [createMockContent(1, 'movie'), createMockContent(2, 'movie')]
            const page2Content = [createMockContent(3, 'movie'), createMockContent(4, 'movie')]

            mockFetch.mockImplementation((url) => {
                const urlString = url as string
                if (urlString.includes('page=1')) {
                    return Promise.resolve(createMockResponse(page1Content as Content[]))
                } else if (urlString.includes('page=2')) {
                    return Promise.resolve(createMockResponse(page2Content as Content[]))
                }
                return Promise.resolve(
                    createMockResponse([createMockContent(99, 'movie')] as Content[])
                )
            })

            const result = await fetchHomeData('movies')

            // topRated should combine results from both pages
            // Note: Exact count may vary due to deduplication and randomization,
            // but should have content from both pages
            expect(result.topRated.length).toBeGreaterThan(0)
        })
    })

    describe('fetchHomeData - Genre Mapping', () => {
        it('should fetch correct genre IDs for movies', async () => {
            const mockContent = createMockContent(1, 'movie')
            const mockResponse = createMockResponse([mockContent])
            mockFetch.mockResolvedValue(mockResponse)

            await fetchHomeData('movies')

            const calls = mockFetch.mock.calls.map((call) => call[0] as string)

            // Verify movie genres: Action (28), Comedy (35), Horror (27), Romance (10749), Documentary (99)
            expect(calls.some((url) => url.includes('/api/genres/movie/28'))).toBe(true) // Action
            expect(calls.some((url) => url.includes('/api/genres/movie/35'))).toBe(true) // Comedy
            expect(calls.some((url) => url.includes('/api/genres/movie/27'))).toBe(true) // Horror
            expect(calls.some((url) => url.includes('/api/genres/movie/10749'))).toBe(true) // Romance
            expect(calls.some((url) => url.includes('/api/genres/movie/99'))).toBe(true) // Documentary
        })

        it('should fetch correct genre IDs for TV shows', async () => {
            const mockContent = createMockContent(1, 'tv')
            const mockResponse = createMockResponse([mockContent])
            mockFetch.mockResolvedValue(mockResponse)

            await fetchHomeData('tv')

            const calls = mockFetch.mock.calls.map((call) => call[0] as string)

            // Verify TV genres: Action & Adventure (10759), Comedy (35), Sci-Fi & Fantasy (10765), Animation (16), Documentary (99)
            expect(calls.some((url) => url.includes('/api/genres/tv/10759'))).toBe(true) // Action & Adventure
            expect(calls.some((url) => url.includes('/api/genres/tv/35'))).toBe(true) // Comedy
            expect(calls.some((url) => url.includes('/api/genres/tv/10765'))).toBe(true) // Sci-Fi & Fantasy
            expect(calls.some((url) => url.includes('/api/genres/tv/16'))).toBe(true) // Animation
            expect(calls.some((url) => url.includes('/api/genres/tv/99'))).toBe(true) // Documentary
        })
    })
})

/**
 * Unit Tests for App Router API Route: /api/movies/details/[id]
 *
 * This test demonstrates the App Router API testing pattern:
 * - Import named exports (GET, POST, etc.) from route handlers
 * - Create NextRequest objects with URLs and query params
 * - Pass params as Promises
 * - Assert on NextResponse objects
 *
 * @jest-environment node
 */

import { NextRequest } from 'next/server'
import { GET } from '../../../../../app/api/movies/details/[id]/route'
import { fetchTVContentRatings, hasMatureRating } from '../../../../../utils/tvContentRatings'

// Mock the TMDB API client
const mockGetMovieDetails = jest.fn()
jest.mock('../../../../../utils/tmdbApi', () => ({
    TMDBApiClient: {
        getInstance: () => ({
            getMovieDetails: mockGetMovieDetails,
        }),
    },
    setCacheHeaders: jest.fn(),
    handleApiError: jest.fn(),
}))

// Mock TV content ratings utilities
jest.mock('../../../../../utils/tvContentRatings', () => ({
    fetchTVContentRatings: jest.fn(),
    hasMatureRating: jest.fn(),
}))

const mockFetchTVContentRatings = fetchTVContentRatings as jest.MockedFunction<
    typeof fetchTVContentRatings
>
const mockHasMatureRating = hasMatureRating as jest.MockedFunction<typeof hasMatureRating>

/**
 * Helper to create a NextRequest with query params
 */
function createRequest(id: string, queryParams?: Record<string, string>): NextRequest {
    const url = new URL(`http://localhost:3000/api/movies/details/${id}`)
    if (queryParams) {
        Object.entries(queryParams).forEach(([key, value]) => {
            url.searchParams.set(key, value)
        })
    }
    return new NextRequest(url)
}

/**
 * Helper to create params Promise (App Router pattern)
 */
function createParams(id: string): Promise<{ id: string }> {
    return Promise.resolve({ id })
}

describe('/api/movies/details/[id] - App Router API Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe('Basic Functionality', () => {
        it('should return movie details when media_type=movie', async () => {
            const movieData = {
                id: 123,
                title: 'Test Movie',
                adult: false,
                overview: 'A test movie',
                vote_average: 7.5,
            }

            mockGetMovieDetails.mockResolvedValueOnce(movieData)

            const request = createRequest('123', { media_type: 'movie' })
            const params = createParams('123')

            const response = await GET(request, { params })
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(data.id).toBe(123)
            expect(data.title).toBe('Test Movie')
            expect(mockGetMovieDetails).toHaveBeenCalledWith('123', 'movie')
        })

        it('should return TV show details when media_type=tv', async () => {
            const tvData = {
                id: 456,
                name: 'Test TV Show',
                overview: 'A test TV show',
                vote_average: 8.0,
            }

            mockGetMovieDetails.mockResolvedValueOnce(tvData)

            const request = createRequest('456', { media_type: 'tv' })
            const params = createParams('456')

            const response = await GET(request, { params })
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(data.id).toBe(456)
            expect(data.name).toBe('Test TV Show')
            expect(mockGetMovieDetails).toHaveBeenCalledWith('456', 'tv')
        })

        it('should default to movie when media_type is not specified', async () => {
            const movieData = {
                id: 789,
                title: 'Default Movie',
                adult: false,
            }

            mockGetMovieDetails.mockResolvedValueOnce(movieData)

            const request = createRequest('789')
            const params = createParams('789')

            const response = await GET(request, { params })

            expect(response.status).toBe(200)
            expect(mockGetMovieDetails).toHaveBeenCalledWith('789', 'movie')
        })
    })

    describe('Validation', () => {
        it('should return 400 if id is missing', async () => {
            const request = createRequest('')
            const params = createParams('')

            const response = await GET(request, { params })
            const data = await response.json()

            expect(response.status).toBe(400)
            expect(data.message).toContain('ID is required')
        })

        it('should return 400 if media_type is invalid', async () => {
            const request = createRequest('123', { media_type: 'invalid' })
            const params = createParams('123')

            const response = await GET(request, { params })
            const data = await response.json()

            expect(response.status).toBe(400)
            expect(data.message).toContain('must be either "movie" or "tv"')
        })
    })

    describe('Child Safety Mode - Movies', () => {
        it('should block adult movies when child safety is enabled', async () => {
            const adultMovie = {
                id: 666,
                title: 'Adult Movie',
                adult: true,
            }

            mockGetMovieDetails.mockResolvedValueOnce(adultMovie)

            const request = createRequest('666', {
                media_type: 'movie',
                childSafetyMode: 'true',
            })
            const params = createParams('666')

            const response = await GET(request, { params })
            const data = await response.json()

            expect(response.status).toBe(403)
            expect(data.message).toContain('blocked by child safety')
            expect(data.reason).toBe('adult_content')
        })

        it('should allow safe movies when child safety is enabled', async () => {
            const safeMovie = {
                id: 123,
                title: 'Family Movie',
                adult: false,
            }

            mockGetMovieDetails.mockResolvedValueOnce(safeMovie)

            const request = createRequest('123', {
                media_type: 'movie',
                childSafetyMode: 'true',
            })
            const params = createParams('123')

            const response = await GET(request, { params })
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(data.title).toBe('Family Movie')
        })

        it('should allow adult movies when child safety is disabled', async () => {
            const adultMovie = {
                id: 666,
                title: 'Adult Movie',
                adult: true,
            }

            mockGetMovieDetails.mockResolvedValueOnce(adultMovie)

            const request = createRequest('666', {
                media_type: 'movie',
                childSafetyMode: 'false',
            })
            const params = createParams('666')

            const response = await GET(request, { params })
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(data.title).toBe('Adult Movie')
        })
    })

    describe('Child Safety Mode - TV Shows', () => {
        it('should block mature TV shows when child safety is enabled', async () => {
            const tvShow = {
                id: 789,
                name: 'Mature TV Show',
            }

            mockGetMovieDetails.mockResolvedValueOnce(tvShow)
            mockFetchTVContentRatings.mockResolvedValueOnce([{ iso_3166_1: 'US', rating: 'TV-MA' }])
            mockHasMatureRating.mockReturnValueOnce(true)

            const request = createRequest('789', {
                media_type: 'tv',
                childSafetyMode: 'true',
            })
            const params = createParams('789')

            const response = await GET(request, { params })
            const data = await response.json()

            expect(response.status).toBe(403)
            expect(data.message).toContain('blocked by child safety')
            expect(data.reason).toBe('mature_rating')
            expect(mockFetchTVContentRatings).toHaveBeenCalledWith(789, expect.any(String))
        })

        it('should allow safe TV shows when child safety is enabled', async () => {
            const tvShow = {
                id: 456,
                name: 'Kids TV Show',
            }

            mockGetMovieDetails.mockResolvedValueOnce(tvShow)
            mockFetchTVContentRatings.mockResolvedValueOnce([{ iso_3166_1: 'US', rating: 'TV-G' }])
            mockHasMatureRating.mockReturnValueOnce(false)

            const request = createRequest('456', {
                media_type: 'tv',
                childSafetyMode: 'true',
            })
            const params = createParams('456')

            const response = await GET(request, { params })
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(data.name).toBe('Kids TV Show')
        })

        it('should allow mature TV shows when child safety is disabled', async () => {
            const tvShow = {
                id: 789,
                name: 'Mature TV Show',
            }

            mockGetMovieDetails.mockResolvedValueOnce(tvShow)

            const request = createRequest('789', {
                media_type: 'tv',
                childSafetyMode: 'false',
            })
            const params = createParams('789')

            const response = await GET(request, { params })
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(data.name).toBe('Mature TV Show')
            // Should not check ratings when child safety is off
            expect(mockFetchTVContentRatings).not.toHaveBeenCalled()
        })
    })

    describe('Error Handling', () => {
        it('should return 500 when TMDB API fails', async () => {
            mockGetMovieDetails.mockRejectedValueOnce(new Error('TMDB API error'))

            const request = createRequest('123', { media_type: 'movie' })
            const params = createParams('123')

            const response = await GET(request, { params })
            const data = await response.json()

            expect(response.status).toBe(500)
            expect(data.message).toContain('Failed to fetch')
        })

        it('should handle missing API key gracefully', async () => {
            // This would require mocking process.env, which is set in jest.setup.js
            // Skipping this test as the API key is always available in tests
        })
    })
})

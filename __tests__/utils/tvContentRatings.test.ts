/**
 * TV Content Ratings Tests
 *
 * Tests for the child safety TV content rating filtering system.
 * Ensures mature TV shows are properly filtered when child safety mode is enabled.
 */

import {
    MATURE_TV_RATINGS,
    hasMatureRating,
    fetchTVContentRatings,
    filterMatureTVShows,
    ContentRating,
} from '../../utils/tvContentRatings'

// Mock global fetch
global.fetch = jest.fn()

describe('tvContentRatings - MATURE_TV_RATINGS Set', () => {
    it('should include TV-MA in mature ratings', () => {
        expect(MATURE_TV_RATINGS.has('TV-MA')).toBe(true)
    })

    it('should include TV-14 in mature ratings', () => {
        expect(MATURE_TV_RATINGS.has('TV-14')).toBe(true)
    })

    it('should include R in mature ratings', () => {
        expect(MATURE_TV_RATINGS.has('R')).toBe(true)
    })

    it('should include regional mature ratings (18, 18+, M, MA15+, 16, 15)', () => {
        expect(MATURE_TV_RATINGS.has('18')).toBe(true)
        expect(MATURE_TV_RATINGS.has('18+')).toBe(true)
        expect(MATURE_TV_RATINGS.has('M')).toBe(true)
        expect(MATURE_TV_RATINGS.has('MA15+')).toBe(true)
        expect(MATURE_TV_RATINGS.has('16')).toBe(true)
        expect(MATURE_TV_RATINGS.has('15')).toBe(true)
    })

    it('should NOT include child-safe ratings (TV-G, TV-PG, TV-Y)', () => {
        expect(MATURE_TV_RATINGS.has('TV-G')).toBe(false)
        expect(MATURE_TV_RATINGS.has('TV-PG')).toBe(false)
        expect(MATURE_TV_RATINGS.has('TV-Y')).toBe(false)
        expect(MATURE_TV_RATINGS.has('TV-Y7')).toBe(false)
    })
})

describe('tvContentRatings - hasMatureRating()', () => {
    it('should return false for empty ratings array', () => {
        expect(hasMatureRating([])).toBe(false)
    })

    it('should return false for null ratings', () => {
        expect(hasMatureRating(null as any)).toBe(false)
    })

    it('should return false for undefined ratings', () => {
        expect(hasMatureRating(undefined as any)).toBe(false)
    })

    it('should return true for TV-MA rating (US)', () => {
        const ratings: ContentRating[] = [{ iso_3166_1: 'US', rating: 'TV-MA' }]
        expect(hasMatureRating(ratings)).toBe(true)
    })

    it('should return true for TV-14 rating (US)', () => {
        const ratings: ContentRating[] = [{ iso_3166_1: 'US', rating: 'TV-14' }]
        expect(hasMatureRating(ratings)).toBe(true)
    })

    it('should return false for TV-PG rating (US)', () => {
        const ratings: ContentRating[] = [{ iso_3166_1: 'US', rating: 'TV-PG' }]
        expect(hasMatureRating(ratings)).toBe(false)
    })

    it('should return false for TV-G rating (US)', () => {
        const ratings: ContentRating[] = [{ iso_3166_1: 'US', rating: 'TV-G' }]
        expect(hasMatureRating(ratings)).toBe(false)
    })

    it('should prioritize US rating when multiple regions present', () => {
        const ratings: ContentRating[] = [
            { iso_3166_1: 'GB', rating: 'PG' }, // UK - safe
            { iso_3166_1: 'US', rating: 'TV-MA' }, // US - mature
            { iso_3166_1: 'AU', rating: 'PG' }, // Australia - safe
        ]
        expect(hasMatureRating(ratings)).toBe(true)
    })

    it('should check other regions if no US rating present', () => {
        const ratings: ContentRating[] = [
            { iso_3166_1: 'GB', rating: '18' }, // UK - mature
            { iso_3166_1: 'AU', rating: 'PG' }, // Australia - safe
        ]
        expect(hasMatureRating(ratings)).toBe(true)
    })

    it('should return false when only non-mature regional ratings present', () => {
        const ratings: ContentRating[] = [
            { iso_3166_1: 'GB', rating: 'PG' },
            { iso_3166_1: 'AU', rating: 'PG' },
            { iso_3166_1: 'CA', rating: 'G' },
        ]
        expect(hasMatureRating(ratings)).toBe(false)
    })

    it('should detect mature rating from any region if no US rating', () => {
        const ratings: ContentRating[] = [
            { iso_3166_1: 'DE', rating: '18' }, // Germany - mature
        ]
        expect(hasMatureRating(ratings)).toBe(true)
    })
})

describe('tvContentRatings - fetchTVContentRatings()', () => {
    const mockApiKey = 'test-api-key'

    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('should fetch content ratings from TMDB API', async () => {
        const mockResponse = {
            results: [
                { iso_3166_1: 'US', rating: 'TV-MA' },
                { iso_3166_1: 'GB', rating: '18' },
            ],
            id: 12345,
        }

        ;(global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => mockResponse,
        })

        const result = await fetchTVContentRatings(12345, mockApiKey)

        expect(global.fetch).toHaveBeenCalledWith(
            `https://api.themoviedb.org/3/tv/12345/content_ratings?api_key=${mockApiKey}`
        )
        expect(result).toEqual(mockResponse.results)
    })

    it('should return null if API request fails', async () => {
        ;(global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: false,
            status: 404,
        })

        const result = await fetchTVContentRatings(99999, mockApiKey)

        expect(result).toBeNull()
    })

    it('should return null if fetch throws error', async () => {
        ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

        const result = await fetchTVContentRatings(12345, mockApiKey)

        expect(result).toBeNull()
    })

    it('should return empty array if results is missing', async () => {
        ;(global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ id: 12345 }), // No results field
        })

        const result = await fetchTVContentRatings(12345, mockApiKey)

        expect(result).toEqual([])
    })
})

describe('tvContentRatings - filterMatureTVShows()', () => {
    const mockApiKey = 'test-api-key'

    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('should return empty array if input is empty', async () => {
        const result = await filterMatureTVShows([], mockApiKey)
        expect(result).toEqual([])
    })

    it('should return empty array if input is null', async () => {
        const result = await filterMatureTVShows(null as any, mockApiKey)
        expect(result).toEqual([])
    })

    it('should filter out TV shows with TV-MA rating', async () => {
        const tvShows = [
            { id: 1, name: 'Breaking Bad', media_type: 'tv' },
            { id: 2, name: 'Stranger Things', media_type: 'tv' },
        ]

        // Mock API responses
        ;(global.fetch as jest.Mock)
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    results: [{ iso_3166_1: 'US', rating: 'TV-MA' }],
                }),
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    results: [{ iso_3166_1: 'US', rating: 'TV-14' }],
                }),
            })

        const result = await filterMatureTVShows(tvShows, mockApiKey)

        // Both shows should be filtered (TV-MA and TV-14 are both in MATURE_TV_RATINGS)
        expect(result).toEqual([])
    })

    it('should keep TV shows with child-safe ratings', async () => {
        const tvShows = [
            { id: 1, name: 'Avatar: The Last Airbender', media_type: 'tv' },
            { id: 2, name: 'Bluey', media_type: 'tv' },
        ]

        ;(global.fetch as jest.Mock)
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    results: [{ iso_3166_1: 'US', rating: 'TV-Y7' }],
                }),
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    results: [{ iso_3166_1: 'US', rating: 'TV-G' }],
                }),
            })

        const result = await filterMatureTVShows(tvShows, mockApiKey)

        expect(result).toEqual(tvShows)
    })

    it('should keep shows when ratings cannot be fetched (fail open)', async () => {
        const tvShows = [{ id: 1, name: 'Unknown Show', media_type: 'tv' }]

        ;(global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: false,
            status: 500,
        })

        const result = await filterMatureTVShows(tvShows, mockApiKey)

        expect(result).toEqual(tvShows)
    })

    it('should handle mixed ratings - filter mature, keep safe', async () => {
        const tvShows = [
            { id: 1, name: 'The Wire', media_type: 'tv' },
            { id: 2, name: 'Sesame Street', media_type: 'tv' },
            { id: 3, name: 'Game of Thrones', media_type: 'tv' },
        ]

        ;(global.fetch as jest.Mock)
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    results: [{ iso_3166_1: 'US', rating: 'TV-MA' }],
                }),
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    results: [{ iso_3166_1: 'US', rating: 'TV-Y' }],
                }),
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    results: [{ iso_3166_1: 'US', rating: 'TV-MA' }],
                }),
            })

        const result = await filterMatureTVShows(tvShows, mockApiKey)

        expect(result).toEqual([tvShows[1]]) // Only Sesame Street
    })

    it('should make parallel API calls for all shows', async () => {
        const tvShows = [
            { id: 1, name: 'Show 1', media_type: 'tv' },
            { id: 2, name: 'Show 2', media_type: 'tv' },
            { id: 3, name: 'Show 3', media_type: 'tv' },
        ]

        ;(global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: async () => ({
                results: [{ iso_3166_1: 'US', rating: 'TV-PG' }],
            }),
        })

        await filterMatureTVShows(tvShows, mockApiKey)

        // Should have made 3 parallel fetch calls
        expect(global.fetch).toHaveBeenCalledTimes(3)
    })

    it('should handle shows with no ratings (empty array)', async () => {
        const tvShows = [{ id: 1, name: 'Unknown Ratings', media_type: 'tv' }]

        ;(global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                results: [], // Empty ratings
            }),
        })

        const result = await filterMatureTVShows(tvShows, mockApiKey)

        // Should keep show with no ratings (fail open)
        expect(result).toEqual(tvShows)
    })
})

describe('tvContentRatings - Integration Tests', () => {
    const mockApiKey = 'test-api-key'

    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('should correctly filter real-world TV show scenario', async () => {
        // Simulate a mix of family shows and mature content
        const tvShows = [
            { id: 1396, name: 'Breaking Bad', media_type: 'tv' }, // TV-MA
            { id: 60625, name: 'Rick and Morty', media_type: 'tv' }, // TV-14
            { id: 1399, name: 'Game of Thrones', media_type: 'tv' }, // TV-MA
            { id: 60735, name: 'The Flash', media_type: 'tv' }, // TV-PG
            { id: 1668, name: 'Friends', media_type: 'tv' }, // TV-PG
        ]

        // Mock realistic TMDB responses
        ;(global.fetch as jest.Mock)
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    results: [{ iso_3166_1: 'US', rating: 'TV-MA' }],
                }),
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    results: [{ iso_3166_1: 'US', rating: 'TV-14' }],
                }),
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    results: [{ iso_3166_1: 'US', rating: 'TV-MA' }],
                }),
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    results: [{ iso_3166_1: 'US', rating: 'TV-PG' }],
                }),
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    results: [{ iso_3166_1: 'US', rating: 'TV-14' }],
                }),
            })

        const result = await filterMatureTVShows(tvShows, mockApiKey)

        // Should only keep The Flash (TV-PG)
        // Breaking Bad, Rick and Morty, Game of Thrones, and Friends (TV-14) should be filtered
        expect(result.length).toBe(1)
        expect(result[0].name).toBe('The Flash')
    })

    it('should handle API failures gracefully in real scenario', async () => {
        const tvShows = [
            { id: 1, name: 'Show with working API', media_type: 'tv' },
            { id: 2, name: 'Show with broken API', media_type: 'tv' },
            { id: 3, name: 'Show with mature rating', media_type: 'tv' },
        ]

        ;(global.fetch as jest.Mock)
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    results: [{ iso_3166_1: 'US', rating: 'TV-G' }],
                }),
            })
            .mockResolvedValueOnce({
                ok: false,
                status: 500,
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    results: [{ iso_3166_1: 'US', rating: 'TV-MA' }],
                }),
            })

        const result = await filterMatureTVShows(tvShows, mockApiKey)

        // Should keep shows 1 and 2 (safe + failed API)
        // Should filter show 3 (TV-MA)
        expect(result.length).toBe(2)
        expect(result[0].name).toBe('Show with working API')
        expect(result[1].name).toBe('Show with broken API')
    })
})

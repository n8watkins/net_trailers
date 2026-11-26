/**
 * TV content ratings lookup (utils/tvContentRatings.ts).
 *
 * What the ratings mean for Child Safety Mode is tested with the rule itself
 * (__tests__/utils/childSafetyRule.test.ts); this file covers the lookup:
 * the TMDB request, what it returns, and what it caches.
 */

import { certificationCache } from '../../utils/certificationCache'
import { fetchTVContentRatings } from '../../utils/tvContentRatings'

// Mock global fetch
global.fetch = jest.fn()

describe('tvContentRatings - fetchTVContentRatings()', () => {
    const mockApiKey = 'test-api-key'

    beforeEach(() => {
        jest.clearAllMocks()
        certificationCache.clear()
    })

    it('should fetch content ratings from TMDB API, through the shared data cache', async () => {
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
            `https://api.themoviedb.org/3/tv/12345/content_ratings?api_key=${mockApiKey}`,
            { next: { revalidate: 21600 } }
        )
        expect(result).toEqual(mockResponse.results)
    })

    it('should answer a second lookup from memory', async () => {
        ;(global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ results: [{ iso_3166_1: 'US', rating: 'TV-G' }] }),
        })

        await fetchTVContentRatings(777, mockApiKey)
        const again = await fetchTVContentRatings(777, mockApiKey)

        expect(again).toEqual([{ iso_3166_1: 'US', rating: 'TV-G' }])
        expect(global.fetch).toHaveBeenCalledTimes(1)
    })

    it('should return null if API request fails, and not cache it', async () => {
        ;(global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: false,
            status: 429,
        })

        expect(await fetchTVContentRatings(99999, mockApiKey)).toBeNull()
        expect(certificationCache.getTV(99999)).toBeUndefined()
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

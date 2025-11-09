/**
 * Unit tests for applyFilters function
 *
 * Tests the pure filtering logic in isolation from the React hook
 */

import { applyFilters } from '../../../hooks/search/useSearchFilters'
import type { Content, Movie, TVShow } from '../../../typings'
import type { SearchFilters } from '../../../stores/searchStore'

// Mock content for testing
const mockMovies: Movie[] = [
    {
        id: 1,
        title: 'High Rated New Movie',
        media_type: 'movie',
        vote_average: 9.0,
        release_date: '2023-06-15',
        revenue: 2000000,
        poster_path: '/poster1.jpg',
        overview: 'A new hit',
        genre_ids: [28],
        adult: false,
        backdrop_path: '/backdrop1.jpg',
        original_language: 'en',
        original_title: 'High Rated New Movie',
        popularity: 200,
        video: false,
        vote_count: 5000,
    },
    {
        id: 2,
        title: 'Medium Rated Old Movie',
        media_type: 'movie',
        vote_average: 7.5,
        release_date: '2005-03-20',
        revenue: 1000000,
        poster_path: '/poster2.jpg',
        overview: 'An older movie',
        genre_ids: [28],
        adult: false,
        backdrop_path: '/backdrop2.jpg',
        original_language: 'en',
        original_title: 'Medium Rated Old Movie',
        popularity: 150,
        video: false,
        vote_count: 3000,
    },
    {
        id: 3,
        title: 'Low Rated Movie',
        media_type: 'movie',
        vote_average: 6.2,
        release_date: '2015-08-10',
        revenue: 500000,
        poster_path: '/poster3.jpg',
        overview: 'Not great',
        genre_ids: [35],
        adult: false,
        backdrop_path: '/backdrop3.jpg',
        original_language: 'en',
        original_title: 'Low Rated Movie',
        popularity: 80,
        video: false,
        vote_count: 1000,
    },
]

const mockTVShows: TVShow[] = [
    {
        id: 4,
        name: 'Great TV Show',
        media_type: 'tv',
        vote_average: 8.5,
        first_air_date: '2022-09-01',
        poster_path: '/poster4.jpg',
        overview: 'A great show',
        genre_ids: [18],
        adult: false,
        backdrop_path: '/backdrop4.jpg',
        original_language: 'en',
        original_name: 'Great TV Show',
        origin_country: ['US'],
        popularity: 180,
        vote_count: 4000,
    },
    {
        id: 5,
        name: 'Mediocre TV Show',
        media_type: 'tv',
        vote_average: 6.8,
        first_air_date: '2010-04-15',
        poster_path: '/poster5.jpg',
        overview: 'An okay show',
        genre_ids: [18],
        adult: false,
        backdrop_path: '/backdrop5.jpg',
        original_language: 'en',
        original_name: 'Mediocre TV Show',
        origin_country: ['US'],
        popularity: 120,
        vote_count: 2500,
    },
]

const allContent: Content[] = [...mockMovies, ...mockTVShows]

const defaultFilters: SearchFilters = {
    contentType: 'all',
    rating: 'all',
    year: 'all',
    sortBy: 'popularity.desc',
}

describe('applyFilters', () => {
    describe('Content Type Filtering', () => {
        it('should return all content when contentType is "all"', async () => {
            const result = await applyFilters(allContent, defaultFilters)
            expect(result).toHaveLength(5)
        })

        it('should filter to only movies', async () => {
            const filters: SearchFilters = {
                ...defaultFilters,
                contentType: 'movie',
            }
            const result = await applyFilters(allContent, filters)

            expect(result).toHaveLength(3)
            expect(result.every((item) => item.media_type === 'movie')).toBe(true)
        })

        it('should filter to only TV shows', async () => {
            const filters: SearchFilters = {
                ...defaultFilters,
                contentType: 'tv',
            }
            const result = await applyFilters(allContent, filters)

            expect(result).toHaveLength(2)
            expect(result.every((item) => item.media_type === 'tv')).toBe(true)
        })
    })

    describe('Rating Filtering', () => {
        it('should not filter when rating is "all"', async () => {
            const result = await applyFilters(allContent, defaultFilters)
            expect(result).toHaveLength(5)
        })

        it('should filter to 7.0+ ratings', async () => {
            const filters: SearchFilters = {
                ...defaultFilters,
                rating: '7.0+',
            }
            const result = await applyFilters(allContent, filters)

            expect(result.every((item) => item.vote_average >= 7.0)).toBe(true)
            expect(result).toHaveLength(3) // Movie 1 (9.0), Movie 2 (7.5), TV 4 (8.5)
        })

        it('should filter to 8.0+ ratings', async () => {
            const filters: SearchFilters = {
                ...defaultFilters,
                rating: '8.0+',
            }
            const result = await applyFilters(allContent, filters)

            expect(result.every((item) => item.vote_average >= 8.0)).toBe(true)
            expect(result).toHaveLength(2) // Movie 1 (9.0), TV 4 (8.5)
        })

        it('should filter to 9.0+ ratings', async () => {
            const filters: SearchFilters = {
                ...defaultFilters,
                rating: '9.0+',
            }
            const result = await applyFilters(allContent, filters)

            expect(result.every((item) => item.vote_average >= 9.0)).toBe(true)
            expect(result).toHaveLength(1) // Only Movie 1 (9.0)
        })

        it('should handle content with undefined vote_average', async () => {
            const contentWithUndefinedRating: Content[] = [
                {
                    ...mockMovies[0],
                    vote_average: undefined,
                },
            ]

            const filters: SearchFilters = {
                ...defaultFilters,
                rating: '7.0+',
            }

            const result = await applyFilters(contentWithUndefinedRating, filters)
            expect(result).toHaveLength(0) // Undefined treated as 0
        })
    })

    describe('Year Filtering', () => {
        it('should filter to 2020s content', async () => {
            const filters: SearchFilters = {
                ...defaultFilters,
                year: '2020s',
            }
            const result = await applyFilters(allContent, filters)

            // Movie 1 (2023), TV 4 (2022)
            expect(result).toHaveLength(2)
        })

        it('should filter to 2010s content', async () => {
            const filters: SearchFilters = {
                ...defaultFilters,
                year: '2010s',
            }
            const result = await applyFilters(allContent, filters)

            // Movie 3 (2015), TV 5 (2010)
            expect(result).toHaveLength(2)
        })

        it('should filter to 2000s content', async () => {
            const filters: SearchFilters = {
                ...defaultFilters,
                year: '2000s',
            }
            const result = await applyFilters(allContent, filters)

            // Movie 2 (2005)
            expect(result).toHaveLength(1)
        })

        it('should handle content with no date', async () => {
            const contentWithNoDate: Content[] = [
                {
                    ...mockMovies[0],
                    release_date: undefined,
                },
            ]

            const filters: SearchFilters = {
                ...defaultFilters,
                year: '2020s',
            }

            const result = await applyFilters(contentWithNoDate, filters)
            // Content with no date is not filtered out (passes year filter)
            expect(result).toHaveLength(1)
        })
    })

    describe('Sorting', () => {
        it('should not modify order when sortBy is "popularity.desc"', async () => {
            const result = await applyFilters(allContent, defaultFilters)

            // Should maintain original order
            expect(result[0].id).toBe(allContent[0].id)
            expect(result[1].id).toBe(allContent[1].id)
        })

        it('should sort by revenue descending', async () => {
            const filters: SearchFilters = {
                ...defaultFilters,
                sortBy: 'revenue.desc',
            }
            const result = await applyFilters(allContent, filters)

            // Movies sorted by revenue: 1 (2M), 2 (1M), 3 (500K), then TV shows (0)
            expect(result[0].id).toBe(1)
            expect(result[1].id).toBe(2)
            expect(result[2].id).toBe(3)
            // TV shows should be at end (0 revenue)
            expect(result[3].media_type).toBe('tv')
            expect(result[4].media_type).toBe('tv')
        })

        it('should sort by vote average descending', async () => {
            const filters: SearchFilters = {
                ...defaultFilters,
                sortBy: 'vote_average.desc',
            }
            const result = await applyFilters(allContent, filters)

            // Sorted by rating: 1 (9.0), 4 (8.5), 2 (7.5), 5 (6.8), 3 (6.2)
            expect(result[0].id).toBe(1)
            expect(result[1].id).toBe(4)
            expect(result[2].id).toBe(2)
            expect(result[3].id).toBe(5)
            expect(result[4].id).toBe(3)
        })

        it('should treat TV shows as 0 revenue when sorting', async () => {
            const filters: SearchFilters = {
                ...defaultFilters,
                sortBy: 'revenue.desc',
            }
            const result = await applyFilters(allContent, filters)

            // All movies should come before TV shows
            const movieIndices = result
                .map((item, i) => (item.media_type === 'movie' ? i : -1))
                .filter((i) => i >= 0)
            const tvIndices = result
                .map((item, i) => (item.media_type === 'tv' ? i : -1))
                .filter((i) => i >= 0)

            expect(Math.max(...movieIndices)).toBeLessThan(Math.min(...tvIndices))
        })
    })

    describe('Combined Filters', () => {
        it('should apply multiple filters together', async () => {
            const filters: SearchFilters = {
                contentType: 'movie',
                rating: '7.0+',
                year: '2020s',
                sortBy: 'vote_average.desc',
            }
            const result = await applyFilters(allContent, filters)

            // Only Movie 1 matches (movie, 9.0 rating, 2023)
            expect(result).toHaveLength(1)
            expect(result[0].id).toBe(1)
        })

        it('should return empty array when no content matches', async () => {
            const filters: SearchFilters = {
                contentType: 'tv',
                rating: '9.0+',
                year: '2000s',
                sortBy: 'popularity.desc',
            }
            const result = await applyFilters(allContent, filters)

            expect(result).toHaveLength(0)
        })

        it('should handle empty input array', async () => {
            const result = await applyFilters([], defaultFilters)
            expect(result).toHaveLength(0)
        })
    })

    describe('Edge Cases', () => {
        it('should handle content with missing optional properties', async () => {
            const minimalContent: Content[] = [
                {
                    id: 999,
                    title: 'Minimal Movie',
                    media_type: 'movie',
                    poster_path: null,
                    overview: 'Test',
                    genre_ids: [],
                    adult: false,
                    backdrop_path: null,
                    original_language: 'en',
                    original_title: 'Minimal Movie',
                    popularity: 50,
                    video: false,
                    vote_count: 100,
                    // Missing: vote_average, release_date, revenue
                } as Movie,
            ]

            const result = await applyFilters(minimalContent, defaultFilters)
            expect(result).toHaveLength(1)
        })

        it('should be async and maintain Promise interface', async () => {
            const result = applyFilters(allContent, defaultFilters)
            expect(result).toBeInstanceOf(Promise)
            await expect(result).resolves.toHaveLength(5)
        })

        it('should not mutate original array', async () => {
            const originalLength = allContent.length
            const originalFirstId = allContent[0].id

            await applyFilters(allContent, {
                ...defaultFilters,
                sortBy: 'vote_average.desc',
            })

            // Original array should be unchanged
            expect(allContent).toHaveLength(originalLength)
            expect(allContent[0].id).toBe(originalFirstId)
        })
    })
})

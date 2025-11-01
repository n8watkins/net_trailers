/**
 * Integration Tests for Child Safety Filtering - Client/UI Layer
 *
 * These tests verify that React components properly filter content
 * when child safety mode is enabled at the UI layer
 */

import { render, screen, waitFor } from '@testing-library/react'
import { filterContentByAdultFlag } from '../../utils/contentFilter'
import { Movie, TVShow } from '../../typings'

// Helper to create test movie data
function createMockMovie(id: number, title: string, adult: boolean): Movie {
    return {
        id,
        title,
        original_title: title,
        media_type: 'movie',
        backdrop_path: '/test.jpg',
        genre_ids: [],
        origin_country: ['US'],
        original_language: 'en',
        overview: 'Test overview',
        popularity: 100,
        poster_path: '/poster.jpg',
        vote_average: 7.5,
        vote_count: 1000,
        release_date: '2024-01-01',
        adult,
    }
}

// Helper to create test TV show data
function createMockTVShow(id: number, name: string): TVShow {
    return {
        id,
        name,
        original_name: name,
        media_type: 'tv',
        backdrop_path: '/test.jpg',
        genre_ids: [],
        origin_country: ['US'],
        original_language: 'en',
        overview: 'Test overview',
        popularity: 100,
        poster_path: '/poster.jpg',
        vote_average: 7.5,
        vote_count: 1000,
        first_air_date: '2024-01-01',
    }
}

describe('Client-Side Child Safety Filtering', () => {
    describe('filterContentByAdultFlag', () => {
        test('should filter out adult movies when child safety is ON', () => {
            const content = [
                createMockMovie(1, 'Family Movie 1', false),
                createMockMovie(2, 'Adult Movie', true),
                createMockMovie(3, 'Family Movie 2', false),
                createMockMovie(4, 'Another Adult Movie', true),
                createMockMovie(5, 'Kids Movie', false),
            ]

            const filtered = filterContentByAdultFlag(content, true)

            expect(filtered).toHaveLength(3)
            expect(
                filtered.every((item) => {
                    if (item.media_type === 'movie') {
                        return item.adult !== true
                    }
                    return true
                })
            ).toBe(true)
            expect(filtered.map((c) => c.id)).toEqual([1, 3, 5])
        })

        test('should keep all content when child safety is OFF', () => {
            const content = [
                createMockMovie(1, 'Family Movie', false),
                createMockMovie(2, 'Adult Movie', true),
            ]

            const filtered = filterContentByAdultFlag(content, false)

            expect(filtered).toHaveLength(2)
            expect(filtered).toEqual(content)
        })

        test('should handle mixed movie and TV content', () => {
            const content = [
                createMockMovie(1, 'Family Movie', false),
                createMockMovie(2, 'Adult Movie', true),
                createMockTVShow(3, 'TV Show 1'),
                createMockTVShow(4, 'TV Show 2'),
            ]

            const filtered = filterContentByAdultFlag(content, true)

            // Should filter out adult movie but keep TV shows (they use different filtering)
            expect(filtered).toHaveLength(3)
            expect(filtered.find((c) => c.id === 2)).toBeUndefined()
            expect(filtered.find((c) => c.id === 1)).toBeDefined()
            expect(filtered.find((c) => c.id === 3)).toBeDefined()
            expect(filtered.find((c) => c.id === 4)).toBeDefined()
        })

        test('should handle empty array', () => {
            const filtered = filterContentByAdultFlag([], true)
            expect(filtered).toEqual([])
        })

        test('should not mutate original array', () => {
            const content = [createMockMovie(1, 'Safe', false), createMockMovie(2, 'Adult', true)]
            const originalLength = content.length

            filterContentByAdultFlag(content, true)

            expect(content).toHaveLength(originalLength)
            expect(content[1].title).toBe('Adult')
        })

        test('should handle content without adult flag as safe', () => {
            const content = [
                createMockMovie(1, 'Movie 1', false),
                { ...createMockMovie(2, 'Movie 2', false), adult: undefined },
                createMockMovie(3, 'Adult Movie', true),
            ]

            const filtered = filterContentByAdultFlag(content, true)

            expect(filtered).toHaveLength(2)
            expect(filtered.find((c) => c.id === 2)).toBeDefined()
        })
    })

    describe('Content Filtering Statistics', () => {
        test('should accurately report filtering statistics', () => {
            const content = [
                createMockMovie(1, 'Safe 1', false),
                createMockMovie(2, 'Adult 1', true),
                createMockMovie(3, 'Safe 2', false),
                createMockMovie(4, 'Adult 2', true),
                createMockMovie(5, 'Safe 3', false),
            ]

            const filtered = filterContentByAdultFlag(content, true)

            const stats = {
                total: content.length,
                shown: filtered.length,
                hidden: content.length - filtered.length,
                percentageHidden: (
                    ((content.length - filtered.length) / content.length) *
                    100
                ).toFixed(1),
            }

            expect(stats.total).toBe(5)
            expect(stats.shown).toBe(3)
            expect(stats.hidden).toBe(2)
            expect(stats.percentageHidden).toBe('40.0')
        })

        test('should handle 100% filtering rate', () => {
            const allAdultContent = [
                createMockMovie(1, 'Adult 1', true),
                createMockMovie(2, 'Adult 2', true),
            ]

            const filtered = filterContentByAdultFlag(allAdultContent, true)

            expect(filtered).toHaveLength(0)
            expect(allAdultContent.length - filtered.length).toBe(2)
        })

        test('should handle 0% filtering rate', () => {
            const allSafeContent = [
                createMockMovie(1, 'Safe 1', false),
                createMockMovie(2, 'Safe 2', false),
            ]

            const filtered = filterContentByAdultFlag(allSafeContent, true)

            expect(filtered).toHaveLength(2)
            expect(allSafeContent.length - filtered.length).toBe(0)
        })
    })

    describe('Edge Cases and Real-World Scenarios', () => {
        test('should handle large arrays efficiently', () => {
            // Create 1000 items (500 safe, 500 adult)
            const largeArray = Array.from({ length: 1000 }, (_, i) =>
                createMockMovie(i, `Movie ${i}`, i % 2 === 0)
            )

            const startTime = Date.now()
            const filtered = filterContentByAdultFlag(largeArray, true)
            const endTime = Date.now()

            expect(filtered).toHaveLength(500)
            expect(endTime - startTime).toBeLessThan(100) // Should complete in < 100ms
        })

        test('should maintain content order after filtering', () => {
            const content = [
                createMockMovie(10, 'Movie A', false),
                createMockMovie(20, 'Movie B', true),
                createMockMovie(30, 'Movie C', false),
                createMockMovie(40, 'Movie D', true),
                createMockMovie(50, 'Movie E', false),
            ]

            const filtered = filterContentByAdultFlag(content, true)

            expect(filtered.map((c) => c.id)).toEqual([10, 30, 50])
            expect((filtered[0] as Movie).title).toBe('Movie A')
            expect((filtered[1] as Movie).title).toBe('Movie C')
            expect((filtered[2] as Movie).title).toBe('Movie E')
        })

        test('should handle duplicate IDs correctly', () => {
            const content = [
                createMockMovie(1, 'Safe Original', false),
                createMockMovie(1, 'Adult Duplicate', true),
                createMockMovie(2, 'Another Safe', false),
            ]

            const filtered = filterContentByAdultFlag(content, true)

            // Should filter based on adult flag, not ID
            expect(filtered).toHaveLength(2)
            expect(filtered.find((c) => (c as Movie).title === 'Adult Duplicate')).toBeUndefined()
        })

        test('should handle movies with missing required fields gracefully', () => {
            const content = [
                createMockMovie(1, 'Complete Movie', false),
                { id: 2, media_type: 'movie' as const, adult: true }, // Minimal movie
                createMockMovie(3, 'Another Complete', false),
            ]

            const filtered = filterContentByAdultFlag(content, true)

            expect(filtered).toHaveLength(2)
            expect(filtered.find((c) => c.id === 2)).toBeUndefined()
        })
    })

    describe('UI Integration Scenarios', () => {
        test('should demonstrate filtering pipeline: API → State → UI', () => {
            // Simulate API response
            const apiResponse = [
                createMockMovie(1, 'Family Film', false),
                createMockMovie(2, 'Restricted Film', true),
                createMockMovie(3, 'Kids Film', false),
            ]

            // User has child safety enabled
            const childSafetyEnabled = true

            // Apply filtering (as would happen in component)
            const filteredForDisplay = filterContentByAdultFlag(apiResponse, childSafetyEnabled)

            // Verify UI would only receive safe content
            expect(filteredForDisplay).toHaveLength(2)
            expect(
                filteredForDisplay.every((movie) => {
                    if (movie.media_type === 'movie') {
                        return movie.adult !== true
                    }
                    return true
                })
            ).toBe(true)
        })

        test('should handle user toggling child safety on/off', () => {
            const content = [createMockMovie(1, 'Safe', false), createMockMovie(2, 'Adult', true)]

            // User enables child safety
            let filtered = filterContentByAdultFlag(content, true)
            expect(filtered).toHaveLength(1)

            // User disables child safety
            filtered = filterContentByAdultFlag(content, false)
            expect(filtered).toHaveLength(2)

            // User re-enables child safety
            filtered = filterContentByAdultFlag(content, true)
            expect(filtered).toHaveLength(1)
        })
    })
})

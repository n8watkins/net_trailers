/**
 * Tests for Content Filtering Utilities
 */

import {
    filterContentByAdultFlag,
    filterContentWithStats,
    isContentRestricted,
    getRequestMultiplier,
} from '../../utils/contentFilter'
import { Movie } from '../../typings'

// Helper to create minimal valid Movie objects for testing
function createMockMovie(id: number, title: string, adult?: boolean): Movie {
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

describe('filterContentByAdultFlag', () => {
    const testContent = [
        createMockMovie(1, 'Family Movie', false),
        createMockMovie(2, 'Adult Movie', true),
        createMockMovie(3, 'Another Family Movie', false),
        createMockMovie(4, 'Explicit Content', true),
        createMockMovie(5, 'Kids Show'), // No adult flag
    ]

    test('should return all items when childSafetyMode is disabled', () => {
        const result = filterContentByAdultFlag(testContent, false)
        expect(result).toHaveLength(5)
        expect(result).toEqual(testContent)
    })

    test('should filter out adult content when childSafetyMode is enabled', () => {
        const result = filterContentByAdultFlag(testContent, true)
        expect(result).toHaveLength(3)
        // All returned movies should not be marked as adult
        expect(
            result.every((item) => (item.media_type === 'movie' ? item.adult !== true : true))
        ).toBe(true)
    })

    test('should handle items without adult flag as safe', () => {
        const result = filterContentByAdultFlag(testContent, true)
        const itemWithoutFlag = result.find((item) => item.id === 5)
        expect(itemWithoutFlag).toBeDefined()
    })

    test('should handle empty array', () => {
        const result = filterContentByAdultFlag([], true)
        expect(result).toEqual([])
    })

    test('should not mutate original array', () => {
        const originalLength = testContent.length
        filterContentByAdultFlag(testContent, true)
        expect(testContent).toHaveLength(originalLength)
    })
})

describe('filterContentWithStats', () => {
    const testContent = [
        createMockMovie(1, 'Family Movie', false),
        createMockMovie(2, 'Adult Movie', true),
        createMockMovie(3, 'Another Family Movie', false),
        createMockMovie(4, 'Explicit Content', true),
        createMockMovie(5, 'Kids Show'), // No adult flag
    ]

    test('should return stats when childSafetyMode is disabled', () => {
        const result = filterContentWithStats(testContent, false)
        expect(result.items).toHaveLength(5)
        expect(result.shown).toBe(5)
        expect(result.hidden).toBe(0)
        expect(result.totalBefore).toBe(5)
    })

    test('should return stats when childSafetyMode is enabled', () => {
        const result = filterContentWithStats(testContent, true)
        expect(result.items).toHaveLength(3)
        expect(result.shown).toBe(3)
        expect(result.hidden).toBe(2)
        expect(result.totalBefore).toBe(5)
    })

    test('should handle empty array with correct stats', () => {
        const result = filterContentWithStats([], true)
        expect(result.items).toEqual([])
        expect(result.shown).toBe(0)
        expect(result.hidden).toBe(0)
        expect(result.totalBefore).toBe(0)
    })

    test('should handle all safe content', () => {
        const safeContent = [
            createMockMovie(1, 'Safe 1', false),
            createMockMovie(2, 'Safe 2', false),
        ]
        const result = filterContentWithStats(safeContent, true)
        expect(result.shown).toBe(2)
        expect(result.hidden).toBe(0)
    })

    test('should handle all restricted content', () => {
        const restrictedContent = [
            createMockMovie(1, 'Adult 1', true),
            createMockMovie(2, 'Adult 2', true),
        ]
        const result = filterContentWithStats(restrictedContent, true)
        expect(result.shown).toBe(0)
        expect(result.hidden).toBe(2)
    })
})

describe('isContentRestricted', () => {
    test('should return false for safe content when childSafetyMode disabled', () => {
        const content = { adult: false }
        expect(isContentRestricted(content, false)).toBe(false)
    })

    test('should return false for adult content when childSafetyMode disabled', () => {
        const content = { adult: true }
        expect(isContentRestricted(content, false)).toBe(false)
    })

    test('should return false for safe content when childSafetyMode enabled', () => {
        const content = { adult: false }
        expect(isContentRestricted(content, true)).toBe(false)
    })

    test('should return true for adult content when childSafetyMode enabled', () => {
        const content = { adult: true }
        expect(isContentRestricted(content, true)).toBe(true)
    })

    test('should treat content without adult flag as safe', () => {
        const content = { id: 1, title: 'Movie' }
        expect(isContentRestricted(content, true)).toBe(false)
    })
})

describe('getRequestMultiplier', () => {
    test('should return same amount when childSafetyMode is disabled', () => {
        expect(getRequestMultiplier(false, 20)).toBe(20)
    })

    test('should return doubled amount for small base amount', () => {
        // For 20 items, request 2x to compensate for filtering
        const amount = getRequestMultiplier(true, 20)
        expect(amount).toBe(40)
    })

    test('should return doubled amount for typical page size', () => {
        const amount = getRequestMultiplier(true, 20)
        expect(amount).toBe(40)
    })

    test('should handle zero base amount', () => {
        const amount = getRequestMultiplier(true, 0)
        expect(amount).toBe(0)
    })

    test('should handle large base amounts', () => {
        const amount = getRequestMultiplier(true, 100)
        expect(amount).toBe(200)
    })

    test('should consistently double the request amount', () => {
        expect(getRequestMultiplier(true, 10)).toBe(20)
        expect(getRequestMultiplier(true, 50)).toBe(100)
        expect(getRequestMultiplier(true, 75)).toBe(150)
    })
})

/**
 * Tests for Content Filtering Utilities
 */

import {
    filterContentByAdultFlag,
    filterContentWithStats,
    isContentRestricted,
    getRequestMultiplier,
} from '../../utils/contentFilter'

describe('filterContentByAdultFlag', () => {
    const testContent = [
        { id: 1, title: 'Family Movie', adult: false },
        { id: 2, title: 'Adult Movie', adult: true },
        { id: 3, title: 'Another Family Movie', adult: false },
        { id: 4, title: 'Explicit Content', adult: true },
        { id: 5, title: 'Kids Show' }, // No adult flag
    ]

    test('should return all items when childSafetyMode is disabled', () => {
        const result = filterContentByAdultFlag(testContent, false)
        expect(result).toHaveLength(5)
        expect(result).toEqual(testContent)
    })

    test('should filter out adult content when childSafetyMode is enabled', () => {
        const result = filterContentByAdultFlag(testContent, true)
        expect(result).toHaveLength(3)
        expect(result.every((item) => item.adult !== true)).toBe(true)
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
        { id: 1, title: 'Family Movie', adult: false },
        { id: 2, title: 'Adult Movie', adult: true },
        { id: 3, title: 'Another Family Movie', adult: false },
        { id: 4, title: 'Explicit Content', adult: true },
        { id: 5, title: 'Kids Show' }, // No adult flag
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
            { id: 1, adult: false },
            { id: 2, adult: false },
        ]
        const result = filterContentWithStats(safeContent, true)
        expect(result.shown).toBe(2)
        expect(result.hidden).toBe(0)
    })

    test('should handle all restricted content', () => {
        const restrictedContent = [
            { id: 1, adult: true },
            { id: 2, adult: true },
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

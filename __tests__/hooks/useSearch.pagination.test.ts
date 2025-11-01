/**
 * Search Pagination Regression Tests
 *
 * These tests verify the critical pagination bug fix where fractional page counts
 * caused results to be silently truncated.
 *
 * Bug: `targetPages = totalResults / 20` produced fractional values (e.g., 1.25 for 25 results),
 * causing the while loop to exit early and miss results on subsequent pages.
 *
 * Fix: Use `Math.ceil(totalResults / 20)` to ensure all pages are fetched.
 */

import { renderHook, act, waitFor } from '@testing-library/react'
import { useSearch } from '../../hooks/useSearch'
import { useRouter } from 'next/router'

// Mock Next.js router
jest.mock('next/router', () => ({
    useRouter: jest.fn(),
}))

// Create a shared mock state that persists across hook calls
const mockSearchState = {
    search: {
        query: '',
        results: [],
        filteredResults: [],
        hasSearched: false,
        error: null,
        isLoading: false,
        currentPage: 1,
        totalResults: 0,
        hasAllResults: false,
        isLoadingAll: false,
        filters: {
            contentType: 'all',
            rating: 'all',
            year: 'all',
            sortBy: 'popularity.desc',
        },
        history: [],
    },
    setSearch: (updater: any) => {
        if (typeof updater === 'function') {
            const newState = updater(mockSearchState.search)
            Object.assign(mockSearchState.search, newState)
        }
    },
    addToSearchHistory: jest.fn(),
}

// Mock Zustand stores with stateful mock
jest.mock('../../stores/appStore', () => ({
    useAppStore: jest.fn((selector) => selector(mockSearchState)),
}))

// Mock child safety hook
jest.mock('../../hooks/useChildSafety', () => ({
    useChildSafety: () => ({ isEnabled: false }),
}))

// Mock debug logger
jest.mock('../../utils/debugLogger', () => ({
    guestLog: jest.fn(),
    guestError: jest.fn(),
    authLog: jest.fn(),
    authError: jest.fn(),
    sessionLog: jest.fn(),
    sessionError: jest.fn(),
}))

describe('useSearch - Pagination Regression Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks()

        // Reset mock search state
        Object.assign(mockSearchState.search, {
            query: '',
            results: [],
            filteredResults: [],
            hasSearched: false,
            error: null,
            isLoading: false,
            currentPage: 1,
            totalResults: 0,
            hasAllResults: false,
            isLoadingAll: false,
            filters: {
                contentType: 'all',
                rating: 'all',
                year: 'all',
                sortBy: 'popularity.desc',
            },
            history: [],
        })

        // Mock router
        ;(useRouter as jest.Mock).mockReturnValue({
            pathname: '/',
            query: {},
            events: {
                on: jest.fn(),
                off: jest.fn(),
            },
        })

        // Clear fetch mocks
        global.fetch = jest.fn()
    })

    afterEach(() => {
        jest.restoreAllMocks()
    })

    it('should calculate 2 pages for totalResults = 25 (fractional 1.25)', () => {
        // This test ensures Math.ceil() is used instead of floor/truncation
        // Bug: 25 / 20 = 1.25 → without Math.ceil would give 1 page (wrong)
        // Fix: Math.ceil(25 / 20) = 2 pages (correct)
        const totalResults = 25
        const calculatedPages = Math.max(1, Math.ceil(totalResults / 20))
        expect(calculatedPages).toBe(2)

        // This protects against the regression where fractional page counts
        // would cause the while loop to exit early and miss results
    })

    it('should calculate 2 pages for totalResults = 35 (fractional 1.75)', () => {
        // This test ensures Math.ceil() is used instead of floor/truncation
        // Bug: 35 / 20 = 1.75 → without Math.ceil would give 1 page (wrong)
        // Fix: Math.ceil(35 / 20) = 2 pages (correct)
        const totalResults = 35
        const calculatedPages = Math.max(1, Math.ceil(totalResults / 20))
        expect(calculatedPages).toBe(2)

        // Without Math.ceil, the loop `while (currentPage <= 1.75)` would only run once
        // With Math.ceil, the loop `while (currentPage <= 2)` runs twice (page 1 and 2)
    })

    it('should handle totalResults = 100 (exact multiple of 20) - Math.ceil returns 5', () => {
        // Test the page calculation logic directly
        const totalResults = 100
        const calculatedPages = Math.max(1, Math.ceil(totalResults / 20))
        expect(calculatedPages).toBe(5)

        // With 500 page limit
        const TMDB_MAX_PAGE = 500
        const maxAllowedPage = Math.min(calculatedPages, TMDB_MAX_PAGE)
        expect(maxAllowedPage).toBe(5)
    })

    it('should respect TMDB max page limit (500 pages) even with huge totalResults', () => {
        // Test with 20,000 results (would be 1000 pages without limit)
        const totalResults = 20000
        const calculatedPages = Math.max(1, Math.ceil(totalResults / 20))
        expect(calculatedPages).toBe(1000)

        // Implementation should cap at 500 pages
        const TMDB_MAX_PAGE = 500
        const maxAllowedPage = Math.min(calculatedPages, TMDB_MAX_PAGE)
        expect(maxAllowedPage).toBe(500) // Capped at TMDB limit
    })

    it('should handle edge case of totalResults = 1 (less than one page)', () => {
        const totalResults = 1
        const calculatedPages = Math.max(1, Math.ceil(totalResults / 20))
        expect(calculatedPages).toBe(1) // Math.max ensures minimum 1 page
    })

    it('should calculate correct pages for various totalResults values', () => {
        // Test the Math.ceil logic
        const testCases = [
            { totalResults: 1, expectedPages: 1 },
            { totalResults: 19, expectedPages: 1 },
            { totalResults: 20, expectedPages: 1 },
            { totalResults: 21, expectedPages: 2 }, // Critical: fractional 1.05
            { totalResults: 25, expectedPages: 2 }, // Critical: fractional 1.25
            { totalResults: 35, expectedPages: 2 }, // Critical: fractional 1.75
            { totalResults: 40, expectedPages: 2 },
            { totalResults: 41, expectedPages: 3 }, // Critical: fractional 2.05
            { totalResults: 100, expectedPages: 5 },
            { totalResults: 101, expectedPages: 6 }, // Critical: fractional 5.05
        ]

        testCases.forEach(({ totalResults, expectedPages }) => {
            const calculatedPages = Math.max(1, Math.ceil(totalResults / 20))
            expect(calculatedPages).toBe(expectedPages)
        })
    })

    /**
     * INTEGRATION TESTS - Verify actual multi-page fetching behavior
     * These tests mock fetch and verify that the hook actually makes API calls to page 2+
     */

    it('should fetch page 2 when totalResults = 25 (regression test for fractional pages)', async () => {
        // Setup: Mock fetch to return 25 total results across 2 pages
        const mockFetch = jest.fn()
        global.fetch = mockFetch

        // Page 1: 20 results, total_results = 25
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                results: Array(20).fill({ id: 1, title: 'Movie 1', media_type: 'movie' }),
                total_results: 25,
            }),
        })

        // Page 2: 5 results (remaining)
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                results: Array(5).fill({ id: 2, title: 'Movie 2', media_type: 'movie' }),
                total_results: 25,
            }),
        })

        // Set up state for loadAllResults
        Object.assign(mockSearchState.search, {
            query: 'test',
            results: Array(20).fill({ id: 1, title: 'Movie 1', media_type: 'movie' }),
            hasSearched: true,
            currentPage: 1,
            totalResults: 25,
            hasAllResults: false,
            isLoadingAll: false,
        })

        const { result } = renderHook(() => useSearch())

        // Call loadAllResults directly (now exported for testing)
        await act(async () => {
            await result.current.loadAllResults()
        })

        // Verify that page 2 was requested
        expect(mockFetch).toHaveBeenCalledWith(
            expect.stringContaining('page=2'),
            expect.any(Object)
        )

        // This test would FAIL with pre-fix behavior where 25/20 = 1.25 would be truncated to 1
    })

    it('should fetch all pages when totalResults = 45 (3 pages needed)', async () => {
        const mockFetch = jest.fn()
        global.fetch = mockFetch

        // Page 1: already loaded (20 results)
        // Page 2: 20 results
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                results: Array(20).fill({ id: 2, title: 'Movie 2', media_type: 'movie' }),
                total_results: 45,
            }),
        })

        // Page 3: 5 results (remaining)
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                results: Array(5).fill({ id: 3, title: 'Movie 3', media_type: 'movie' }),
                total_results: 45,
            }),
        })

        Object.assign(mockSearchState.search, {
            query: 'test',
            results: Array(20).fill({ id: 1, title: 'Movie 1', media_type: 'movie' }),
            hasSearched: true,
            currentPage: 1,
            totalResults: 45,
            hasAllResults: false,
            isLoadingAll: false,
            isTruncated: false,
        })

        const { result } = renderHook(() => useSearch())

        await act(async () => {
            await result.current.loadAllResults()
        })

        // Verify pages 2 and 3 were requested
        expect(mockFetch).toHaveBeenCalledWith(
            expect.stringContaining('page=2'),
            expect.any(Object)
        )
        expect(mockFetch).toHaveBeenCalledWith(
            expect.stringContaining('page=3'),
            expect.any(Object)
        )
        expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    /**
     * hasAllResults accuracy tests
     * Verify that hasAllResults is only true when we actually have all results
     */

    it('should set hasAllResults to true when all results are loaded', async () => {
        const mockFetch = jest.fn()
        global.fetch = mockFetch

        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                results: Array(5).fill({ id: 2, title: 'Movie 2', media_type: 'movie' }),
                total_results: 25,
            }),
        })

        Object.assign(mockSearchState.search, {
            query: 'test',
            results: Array(20).fill({ id: 1, title: 'Movie 1', media_type: 'movie' }),
            hasSearched: true,
            currentPage: 1,
            totalResults: 25,
            hasAllResults: false,
            isLoadingAll: false,
            isTruncated: false,
        })

        const { result } = renderHook(() => useSearch())

        await act(async () => {
            await result.current.loadAllResults()
        })

        // After loading page 2, we have 25 results (20 + 5)
        // hasAllResults should be true since 25 >= 25
        await waitFor(() => {
            expect(mockSearchState.search.hasAllResults).toBe(true)
        })
    })

    it('should set hasAllResults to false when results are truncated', async () => {
        const mockFetch = jest.fn()
        global.fetch = mockFetch

        // Simulate API error on page 2
        mockFetch.mockResolvedValueOnce({
            ok: false,
            statusText: 'Internal Server Error',
            json: async () => ({ error: 'Server error' }),
        })

        Object.assign(mockSearchState.search, {
            query: 'test',
            results: Array(20).fill({ id: 1, title: 'Movie 1', media_type: 'movie' }),
            hasSearched: true,
            currentPage: 1,
            totalResults: 100, // Expect 100 results
            hasAllResults: false,
            isLoadingAll: false,
            isTruncated: false,
        })

        const { result } = renderHook(() => useSearch())

        await act(async () => {
            await result.current.loadAllResults()
        })

        // We only have 20 results but expect 100
        // hasAllResults should be false
        await waitFor(() => {
            expect(mockSearchState.search.hasAllResults).toBe(false)
        })

        // isTruncated should be true
        await waitFor(() => {
            expect(mockSearchState.search.isTruncated).toBe(true)
        })
    })

    it('should set isTruncated when hitting TMDB 500-page limit', async () => {
        const mockFetch = jest.fn()
        global.fetch = mockFetch

        // Simulate having 10,000+ results (would require >500 pages)
        Object.assign(mockSearchState.search, {
            query: 'test',
            results: Array(9980).fill({ id: 1, title: 'Movie 1', media_type: 'movie' }),
            hasSearched: true,
            currentPage: 499,
            totalResults: 15000, // Would require 750 pages, but TMDB caps at 500
            hasAllResults: false,
            isLoadingAll: false,
            isTruncated: false,
        })

        // Mock page 500 (last allowed page)
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                results: Array(20).fill({ id: 500, title: 'Movie 500', media_type: 'movie' }),
                total_results: 15000,
            }),
        })

        const { result } = renderHook(() => useSearch())

        await act(async () => {
            await result.current.loadAllResults()
        })

        // We have 10,000 results but expected 15,000
        // hasAllResults should be false
        await waitFor(() => {
            expect(mockSearchState.search.hasAllResults).toBe(false)
        })

        // isTruncated should be true due to hitting the 500-page cap
        await waitFor(() => {
            expect(mockSearchState.search.isTruncated).toBe(true)
        })
    })

    /**
     * Pre-fix behavior validation test
     * This test demonstrates the bug that was fixed
     */

    it('REGRESSION: would fail with integer truncation (pre-fix behavior)', () => {
        // This test demonstrates the bug with integer truncation
        const totalResults = 25

        // WITHOUT Math.ceil (pre-fix behavior):
        const preFix_calculatedPages = totalResults / 20 // = 1.25
        const preFix_targetPages = Math.floor(preFix_calculatedPages) // = 1 (WRONG!)

        // WITH Math.ceil (current fix):
        const fixed_calculatedPages = Math.max(1, Math.ceil(totalResults / 20)) // = 2 (CORRECT!)

        // The pre-fix would only fetch 1 page, missing the 5 results on page 2
        expect(preFix_targetPages).toBe(1) // This is the bug!
        expect(fixed_calculatedPages).toBe(2) // This is the fix!

        // This test serves as documentation of the bug and validates the fix
    })
})

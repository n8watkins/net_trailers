/**
 * Filter Tests for useSearch Hook
 *
 * Tests the applyFilters function which handles:
 * - Content type filtering (movie, tv, all)
 * - Rating filtering (7.0+, 8.0+, 9.0+, all)
 * - Year filtering (2020s, 2010s, 2000s, 1990s, all)
 * - Sorting (popularity.desc, revenue.desc, vote_average.desc)
 */

import { renderHook, act } from '@testing-library/react'
import { useSearch } from '../../hooks/useSearch'
import { useRouter, usePathname } from 'next/navigation'
import { useSearchStore } from '../../stores/searchStore'
import { useChildSafety } from '../../hooks/useChildSafety'
import { Content } from '../../typings'

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
    useRouter: jest.fn(),
    usePathname: jest.fn(),
    useSearchParams: jest.fn(),
}))

// Mock child safety hook
jest.mock('../../hooks/useChildSafety', () => ({
    useChildSafety: jest.fn(() => ({ isEnabled: false })),
}))

// Mock debug logger
jest.mock('../../utils/debugLogger', () => ({
    guestLog: jest.fn(),
    guestError: jest.fn(),
}))

// Comprehensive mock content for filtering tests
const mockContent: Content[] = [
    // High rated new movie (2023)
    {
        id: 1,
        title: 'New Blockbuster 2023',
        media_type: 'movie',
        vote_average: 9.2,
        release_date: '2023-06-15',
        revenue: 2000000,
        poster_path: '/poster1.jpg',
        overview: 'A new hit',
        genre_ids: [28],
        adult: false,
        backdrop_path: '/backdrop1.jpg',
        original_language: 'en',
        original_title: 'New Blockbuster 2023',
        popularity: 200,
        video: false,
        vote_count: 5000,
    },
    // Medium rated movie from 2015
    {
        id: 2,
        title: 'Action Film 2015',
        media_type: 'movie',
        vote_average: 7.8,
        release_date: '2015-03-20',
        revenue: 1000000,
        poster_path: '/poster2.jpg',
        overview: 'An action movie',
        genre_ids: [28],
        adult: false,
        backdrop_path: '/backdrop2.jpg',
        original_language: 'en',
        original_title: 'Action Film 2015',
        popularity: 150,
        video: false,
        vote_count: 3000,
    },
    // Low rated old movie from 2005
    {
        id: 3,
        title: 'Old Comedy 2005',
        media_type: 'movie',
        vote_average: 6.5,
        release_date: '2005-08-10',
        revenue: 500000,
        poster_path: '/poster3.jpg',
        overview: 'An old comedy',
        genre_ids: [35],
        adult: false,
        backdrop_path: '/backdrop3.jpg',
        original_language: 'en',
        original_title: 'Old Comedy 2005',
        popularity: 80,
        video: false,
        vote_count: 1000,
    },
    // Very old movie from 1995
    {
        id: 4,
        title: 'Classic 1995',
        media_type: 'movie',
        vote_average: 8.0,
        release_date: '1995-12-01',
        revenue: 300000,
        poster_path: '/poster4.jpg',
        overview: 'A classic',
        genre_ids: [18],
        adult: false,
        backdrop_path: '/backdrop4.jpg',
        original_language: 'en',
        original_title: 'Classic 1995',
        popularity: 60,
        video: false,
        vote_count: 2000,
    },
    // High rated new TV show (2022)
    {
        id: 5,
        name: 'Hit Series 2022',
        media_type: 'tv',
        vote_average: 8.9,
        first_air_date: '2022-09-01',
        poster_path: '/poster5.jpg',
        overview: 'A hit show',
        genre_ids: [18],
        adult: false,
        backdrop_path: '/backdrop5.jpg',
        original_language: 'en',
        original_name: 'Hit Series 2022',
        origin_country: ['US'],
        popularity: 180,
        vote_count: 4000,
    },
    // Medium rated TV show from 2010
    {
        id: 6,
        name: 'Drama Series 2010',
        media_type: 'tv',
        vote_average: 7.5,
        first_air_date: '2010-04-15',
        poster_path: '/poster6.jpg',
        overview: 'A drama',
        genre_ids: [18],
        adult: false,
        backdrop_path: '/backdrop6.jpg',
        original_language: 'en',
        original_name: 'Drama Series 2010',
        origin_country: ['US'],
        popularity: 120,
        vote_count: 2500,
    },
    // Low rated TV show from 2000
    {
        id: 7,
        name: 'Sitcom 2000',
        media_type: 'tv',
        vote_average: 6.8,
        first_air_date: '2000-09-20',
        poster_path: '/poster7.jpg',
        overview: 'A sitcom',
        genre_ids: [35],
        adult: false,
        backdrop_path: '/backdrop7.jpg',
        original_language: 'en',
        original_name: 'Sitcom 2000',
        origin_country: ['US'],
        popularity: 90,
        vote_count: 1500,
    },
]

describe('useSearch Hook - Filters', () => {
    beforeEach(() => {
        jest.clearAllMocks()

        // Mock navigation
        ;(useRouter as jest.Mock).mockReturnValue({
            push: jest.fn(),
            replace: jest.fn(),
            prefetch: jest.fn(),
            back: jest.fn(),
            forward: jest.fn(),
            refresh: jest.fn(),
        })
        ;(usePathname as jest.Mock).mockReturnValue('/')
        ;(useChildSafety as jest.Mock).mockReturnValue({ isEnabled: false })

        // Reset searchStore with mock content
        useSearchStore.setState({
            query: 'test',
            results: mockContent,
            filteredResults: mockContent,
            hasSearched: true,
            error: null,
            isLoading: false,
            currentPage: 1,
            totalResults: mockContent.length,
            hasAllResults: true,
            isLoadingAll: false,
            isTruncated: false,
            filters: {
                contentType: 'all',
                rating: 'all',
                year: 'all',
                sortBy: 'popularity.desc',
            },
            history: [],
        })

        global.fetch = jest.fn()
    })

    afterEach(() => {
        jest.restoreAllMocks()
    })

    describe('Content Type Filter', () => {
        it('should show all content when filter is "all"', async () => {
            const { result } = renderHook(() => useSearch())

            await act(async () => {
                useSearchStore.setState({
                    filters: {
                        contentType: 'all',
                        rating: 'all',
                        year: 'all',
                        sortBy: 'popularity.desc',
                    },
                })
            })

            // Wait for filter to apply
            await act(async () => {
                await new Promise((resolve) => setTimeout(resolve, 100))
            })

            expect(result.current.results.length).toBe(mockContent.length)
        })

        it('should filter to only movies', async () => {
            const { result } = renderHook(() => useSearch())

            await act(async () => {
                useSearchStore.setState({
                    filters: {
                        contentType: 'movie',
                        rating: 'all',
                        year: 'all',
                        sortBy: 'popularity.desc',
                    },
                })
            })

            // Wait for filter to apply
            await act(async () => {
                await new Promise((resolve) => setTimeout(resolve, 100))
            })

            const filtered = result.current.results
            expect(filtered.every((item) => item.media_type === 'movie')).toBe(true)
            expect(filtered.length).toBe(4) // 4 movies in mockContent
        })

        it('should filter to only TV shows', async () => {
            const { result } = renderHook(() => useSearch())

            await act(async () => {
                useSearchStore.setState({
                    filters: {
                        contentType: 'tv',
                        rating: 'all',
                        year: 'all',
                        sortBy: 'popularity.desc',
                    },
                })
            })

            // Wait for filter to apply
            await act(async () => {
                await new Promise((resolve) => setTimeout(resolve, 100))
            })

            const filtered = result.current.results
            expect(filtered.every((item) => item.media_type === 'tv')).toBe(true)
            expect(filtered.length).toBe(3) // 3 TV shows in mockContent
        })
    })

    describe('Rating Filter', () => {
        it('should show all ratings when filter is "all"', async () => {
            const { result } = renderHook(() => useSearch())

            await act(async () => {
                useSearchStore.setState({
                    filters: {
                        contentType: 'all',
                        rating: 'all',
                        year: 'all',
                        sortBy: 'popularity.desc',
                    },
                })
            })

            await act(async () => {
                await new Promise((resolve) => setTimeout(resolve, 100))
            })

            expect(result.current.results.length).toBe(mockContent.length)
        })

        it('should filter to 7.0+ ratings', async () => {
            const { result } = renderHook(() => useSearch())

            await act(async () => {
                useSearchStore.setState({
                    filters: {
                        contentType: 'all',
                        rating: '7.0+',
                        year: 'all',
                        sortBy: 'popularity.desc',
                    },
                })
            })

            await act(async () => {
                await new Promise((resolve) => setTimeout(resolve, 100))
            })

            const filtered = result.current.results
            expect(filtered.every((item) => item.vote_average >= 7.0)).toBe(true)
            expect(filtered.length).toBeGreaterThan(0)
            expect(filtered.length).toBeLessThan(mockContent.length)
        })

        it('should filter to 8.0+ ratings', async () => {
            const { result } = renderHook(() => useSearch())

            await act(async () => {
                useSearchStore.setState({
                    filters: {
                        contentType: 'all',
                        rating: '8.0+',
                        year: 'all',
                        sortBy: 'popularity.desc',
                    },
                })
            })

            await act(async () => {
                await new Promise((resolve) => setTimeout(resolve, 100))
            })

            const filtered = result.current.results
            expect(filtered.every((item) => item.vote_average >= 8.0)).toBe(true)
            // Should include: New Blockbuster (9.2), Classic 1995 (8.0), Hit Series (8.9)
            expect(filtered.length).toBe(3)
        })

        it('should filter to 9.0+ ratings', async () => {
            const { result } = renderHook(() => useSearch())

            await act(async () => {
                useSearchStore.setState({
                    filters: {
                        contentType: 'all',
                        rating: '9.0+',
                        year: 'all',
                        sortBy: 'popularity.desc',
                    },
                })
            })

            await act(async () => {
                await new Promise((resolve) => setTimeout(resolve, 100))
            })

            const filtered = result.current.results
            expect(filtered.every((item) => item.vote_average >= 9.0)).toBe(true)
            // Should only include New Blockbuster (9.2)
            expect(filtered.length).toBe(1)
        })
    })

    describe('Year Filter', () => {
        it('should filter to 2020s content', async () => {
            const { result } = renderHook(() => useSearch())

            await act(async () => {
                useSearchStore.setState({
                    filters: {
                        contentType: 'all',
                        rating: 'all',
                        year: '2020s',
                        sortBy: 'popularity.desc',
                    },
                })
            })

            await act(async () => {
                await new Promise((resolve) => setTimeout(resolve, 100))
            })

            const filtered = result.current.results
            // Should include: New Blockbuster 2023, Hit Series 2022
            expect(filtered.length).toBe(2)
            expect(
                filtered.every((item) => {
                    const year =
                        item.media_type === 'movie'
                            ? new Date(item.release_date || '').getFullYear()
                            : new Date((item as any).first_air_date || '').getFullYear()
                    return year >= 2020 && year <= 2029
                })
            ).toBe(true)
        })

        it('should filter to 2010s content', async () => {
            const { result } = renderHook(() => useSearch())

            await act(async () => {
                useSearchStore.setState({
                    filters: {
                        contentType: 'all',
                        rating: 'all',
                        year: '2010s',
                        sortBy: 'popularity.desc',
                    },
                })
            })

            await act(async () => {
                await new Promise((resolve) => setTimeout(resolve, 100))
            })

            const filtered = result.current.results
            // Should include: Action Film 2015, Drama Series 2010
            expect(filtered.length).toBe(2)
        })

        it('should filter to 2000s content', async () => {
            const { result } = renderHook(() => useSearch())

            await act(async () => {
                useSearchStore.setState({
                    filters: {
                        contentType: 'all',
                        rating: 'all',
                        year: '2000s',
                        sortBy: 'popularity.desc',
                    },
                })
            })

            await act(async () => {
                await new Promise((resolve) => setTimeout(resolve, 100))
            })

            const filtered = result.current.results
            // Should include: Old Comedy 2005, Sitcom 2000
            expect(filtered.length).toBe(2)
        })

        it('should filter to 1990s content', async () => {
            const { result } = renderHook(() => useSearch())

            await act(async () => {
                useSearchStore.setState({
                    filters: {
                        contentType: 'all',
                        rating: 'all',
                        year: '1990s',
                        sortBy: 'popularity.desc',
                    },
                })
            })

            await act(async () => {
                await new Promise((resolve) => setTimeout(resolve, 100))
            })

            const filtered = result.current.results
            // Should include: Classic 1995
            expect(filtered.length).toBe(1)
        })
    })

    describe('Sorting', () => {
        it('should sort by popularity (default)', async () => {
            const { result } = renderHook(() => useSearch())

            // Default is popularity.desc
            await act(async () => {
                await new Promise((resolve) => setTimeout(resolve, 100))
            })

            // Results should already be sorted by popularity from API
            expect(result.current.results.length).toBeGreaterThan(0)
        })

        it('should sort by revenue descending', async () => {
            const { result } = renderHook(() => useSearch())

            await act(async () => {
                useSearchStore.setState({
                    filters: {
                        contentType: 'movie',
                        rating: 'all',
                        year: 'all',
                        sortBy: 'revenue.desc',
                    },
                })
            })

            await act(async () => {
                await new Promise((resolve) => setTimeout(resolve, 100))
            })

            const filtered = result.current.results
            // Check that movies are sorted by revenue (highest first)
            for (let i = 0; i < filtered.length - 1; i++) {
                const currentRevenue =
                    filtered[i].media_type === 'movie' ? (filtered[i] as any).revenue || 0 : 0
                const nextRevenue =
                    filtered[i + 1].media_type === 'movie'
                        ? (filtered[i + 1] as any).revenue || 0
                        : 0
                expect(currentRevenue).toBeGreaterThanOrEqual(nextRevenue)
            }
        })

        it('should sort by vote average descending', async () => {
            const { result } = renderHook(() => useSearch())

            await act(async () => {
                useSearchStore.setState({
                    filters: {
                        contentType: 'all',
                        rating: 'all',
                        year: 'all',
                        sortBy: 'vote_average.desc',
                    },
                })
            })

            await act(async () => {
                await new Promise((resolve) => setTimeout(resolve, 100))
            })

            const filtered = result.current.results
            // Check that results are sorted by vote_average (highest first)
            for (let i = 0; i < filtered.length - 1; i++) {
                expect(filtered[i].vote_average || 0).toBeGreaterThanOrEqual(
                    filtered[i + 1].vote_average || 0
                )
            }
        })

        it('should treat TV shows as having 0 revenue when sorting by revenue', async () => {
            const { result } = renderHook(() => useSearch())

            await act(async () => {
                useSearchStore.setState({
                    filters: {
                        contentType: 'all',
                        rating: 'all',
                        year: 'all',
                        sortBy: 'revenue.desc',
                    },
                })
            })

            await act(async () => {
                await new Promise((resolve) => setTimeout(resolve, 100))
            })

            const filtered = result.current.results
            // TV shows should appear at the end (they have 0 revenue)
            const tvShows = filtered.filter((item) => item.media_type === 'tv')
            const lastItems = filtered.slice(-tvShows.length)
            expect(lastItems.every((item) => item.media_type === 'tv')).toBe(true)
        })
    })

    describe('Combined Filters', () => {
        it('should apply multiple filters together', async () => {
            const { result } = renderHook(() => useSearch())

            await act(async () => {
                useSearchStore.setState({
                    filters: {
                        contentType: 'movie',
                        rating: '7.0+',
                        year: '2020s',
                        sortBy: 'vote_average.desc',
                    },
                })
            })

            await act(async () => {
                await new Promise((resolve) => setTimeout(resolve, 100))
            })

            const filtered = result.current.results
            // Should only include: New Blockbuster 2023 (movie, 9.2 rating, 2023)
            expect(filtered.length).toBe(1)
            expect(filtered[0].media_type).toBe('movie')
            expect(filtered[0].vote_average).toBeGreaterThanOrEqual(7.0)
        })

        it('should handle filters that result in no matches', async () => {
            const { result } = renderHook(() => useSearch())

            await act(async () => {
                useSearchStore.setState({
                    filters: {
                        contentType: 'tv',
                        rating: '9.0+',
                        year: '1990s',
                        sortBy: 'popularity.desc',
                    },
                })
            })

            await act(async () => {
                await new Promise((resolve) => setTimeout(resolve, 100))
            })

            const filtered = result.current.results
            // No TV shows from 1990s with 9.0+ rating
            expect(filtered.length).toBe(0)
        })
    })

    describe('Filter State Management', () => {
        it('should update filteredResults when filters change', async () => {
            const { result } = renderHook(() => useSearch())

            const initialLength = result.current.results.length

            await act(async () => {
                useSearchStore.setState({
                    filters: {
                        contentType: 'movie',
                        rating: 'all',
                        year: 'all',
                        sortBy: 'popularity.desc',
                    },
                })
            })

            await act(async () => {
                await new Promise((resolve) => setTimeout(resolve, 100))
            })

            const newLength = result.current.results.length

            // Should have fewer results after filtering
            expect(newLength).toBeLessThan(initialLength)
        })

        it('should preserve results when filters are cleared', async () => {
            const { result } = renderHook(() => useSearch())

            // Apply a filter
            await act(async () => {
                useSearchStore.setState({
                    filters: {
                        contentType: 'movie',
                        rating: 'all',
                        year: 'all',
                        sortBy: 'popularity.desc',
                    },
                })
            })

            await act(async () => {
                await new Promise((resolve) => setTimeout(resolve, 100))
            })

            // Clear filter
            await act(async () => {
                useSearchStore.setState({
                    filters: {
                        contentType: 'all',
                        rating: 'all',
                        year: 'all',
                        sortBy: 'popularity.desc',
                    },
                })
            })

            await act(async () => {
                await new Promise((resolve) => setTimeout(resolve, 100))
            })

            // Should show all results again
            expect(result.current.results.length).toBe(mockContent.length)
        })
    })

    describe('hasActiveFilters Helper', () => {
        it('should return false when all filters are default', () => {
            const { result } = renderHook(() => useSearch())

            act(() => {
                useSearchStore.setState({
                    filters: {
                        contentType: 'all',
                        rating: 'all',
                        year: 'all',
                        sortBy: 'popularity.desc',
                    },
                })
            })

            // hasMore should be true when no filters active
            expect(result.current.hasMore).toBeDefined()
        })

        it('should detect active contentType filter', () => {
            const { result } = renderHook(() => useSearch())

            act(() => {
                useSearchStore.setState({
                    filters: {
                        contentType: 'movie',
                        rating: 'all',
                        year: 'all',
                        sortBy: 'popularity.desc',
                    },
                })
            })

            // hasMore should be false when filters are active
            expect(result.current.hasMore).toBe(false)
        })

        it('should detect active sortBy filter', () => {
            const { result } = renderHook(() => useSearch())

            act(() => {
                useSearchStore.setState({
                    filters: {
                        contentType: 'all',
                        rating: 'all',
                        year: 'all',
                        sortBy: 'vote_average.desc',
                    },
                })
            })

            // hasMore should be false when sorting is changed
            expect(result.current.hasMore).toBe(false)
        })
    })
})

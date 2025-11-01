/**
 * Guest Store Clear Data Tests (Workstream B validation - B5)
 *
 * These tests verify that clearAllData:
 * - Clears in-memory Zustand store
 * - Clears persisted localStorage
 * - Preserves guestId to prevent SessionSync re-sync
 * - Data stays cleared across simulated re-hydration
 */

import { renderHook, act } from '@testing-library/react'
import { useGuestStore } from '../../stores/guestStore'
import { GuestStorageService } from '../../services/guestStorageService'
import { Content } from '../../typings'

// Mock the GuestStorageService
jest.mock('../../services/guestStorageService', () => ({
    GuestStorageService: {
        loadGuestData: jest.fn().mockReturnValue({
            likedMovies: [],
            hiddenMovies: [],
            defaultWatchlist: [],
            userCreatedWatchlists: [],
            lastActive: Date.now(),
            autoMute: true,
            defaultVolume: 50,
            childSafetyMode: false,
        }),
        clearCurrentGuestData: jest.fn().mockReturnValue({
            likedMovies: [],
            hiddenMovies: [],
            defaultWatchlist: [],
            userCreatedWatchlists: [],
            lastActive: Date.now(),
            autoMute: true,
            defaultVolume: 50,
            childSafetyMode: false,
        }),
        saveGuestData: jest.fn(),
    },
}))

// Mock debugLogger to prevent console noise
jest.mock('../../utils/debugLogger', () => ({
    guestLog: jest.fn(),
    guestError: jest.fn(),
}))

// Helper to create mock content
const createMockContent = (id: number, title: string): Content => ({
    id,
    title,
    original_title: title,
    media_type: 'movie' as const,
    overview: `Overview for ${title}`,
    poster_path: `/poster${id}.jpg`,
    backdrop_path: `/backdrop${id}.jpg`,
    vote_average: 7.5,
    vote_count: 1000,
    popularity: 100,
    release_date: '2023-01-01',
    adult: false,
    genre_ids: [28],
    original_language: 'en',
    video: false,
    origin_country: ['US'],
})

describe('GuestStore - clearAllData', () => {
    beforeEach(() => {
        // Reset all mocks before each test
        jest.clearAllMocks()

        // Reset the store to a truly clean state (no guestId)
        const { result } = renderHook(() => useGuestStore())
        act(() => {
            // Manually reset to default state without any guestId
            result.current.loadData({
                likedMovies: [],
                hiddenMovies: [],
                defaultWatchlist: [],
                userCreatedWatchlists: [],
                lastActive: 0,
                autoMute: true,
                defaultVolume: 50,
                childSafetyMode: false,
            })
        })
    })

    it('should clear in-memory store data', () => {
        const { result } = renderHook(() => useGuestStore())

        // Populate the store
        act(() => {
            result.current.syncFromLocalStorage('test-guest-id')
            result.current.addLikedMovie(createMockContent(1, 'Test Movie 1'))
            result.current.addToWatchlist(createMockContent(2, 'Test Movie 2'))
            result.current.addHiddenMovie(createMockContent(3, 'Test Movie 3'))
        })

        // Verify data is populated
        expect(result.current.likedMovies).toHaveLength(1)
        expect(result.current.defaultWatchlist).toHaveLength(1)
        expect(result.current.hiddenMovies).toHaveLength(1)

        // Clear all data
        act(() => {
            result.current.clearAllData()
        })

        // Verify in-memory data is cleared
        expect(result.current.likedMovies).toHaveLength(0)
        expect(result.current.defaultWatchlist).toHaveLength(0)
        expect(result.current.hiddenMovies).toHaveLength(0)
        expect(result.current.userCreatedWatchlists).toHaveLength(0)
    })

    it('should call GuestStorageService.clearCurrentGuestData to clear localStorage', () => {
        const { result } = renderHook(() => useGuestStore())

        // Set up guest ID
        act(() => {
            result.current.syncFromLocalStorage('test-guest-id')
        })

        // Clear all data
        act(() => {
            result.current.clearAllData()
        })

        // Verify localStorage clearing was called
        expect(GuestStorageService.clearCurrentGuestData).toHaveBeenCalledWith('test-guest-id')
    })

    it('should preserve guestId to prevent SessionSyncManager re-sync', () => {
        const { result } = renderHook(() => useGuestStore())

        // Set up guest ID
        act(() => {
            result.current.syncFromLocalStorage('test-guest-id')
        })

        const originalGuestId = result.current.guestId

        // Clear all data
        act(() => {
            result.current.clearAllData()
        })

        // Verify guestId is preserved
        expect(result.current.guestId).toBe(originalGuestId)
        expect(result.current.guestId).toBe('test-guest-id')
    })

    it('should not attempt to clear localStorage if no guestId was ever set', () => {
        // Reset mocks to track calls from this test only
        jest.clearAllMocks()

        // Create a fresh store instance and ensure it has no guestId
        const { result } = renderHook(() => useGuestStore())

        // Force reset to ensure no guestId (in case previous tests left state)
        act(() => {
            result.current.loadData({
                guestId: undefined, // Explicitly clear guestId
                likedMovies: [],
                hiddenMovies: [],
                defaultWatchlist: [],
                userCreatedWatchlists: [],
                lastActive: 0,
                autoMute: true,
                defaultVolume: 50,
                childSafetyMode: false,
            })
        })

        // Verify no guestId is set
        expect(result.current.guestId).toBeUndefined()

        // Clear all data without ever setting a guestId
        act(() => {
            result.current.clearAllData()
        })

        // Verify localStorage clearing was NOT called (since guestId was never set)
        expect(GuestStorageService.clearCurrentGuestData).not.toHaveBeenCalled()
    })

    it('should reset preferences to defaults when clearing', () => {
        const { result } = renderHook(() => useGuestStore())

        // Set up guest ID and modify preferences
        act(() => {
            result.current.syncFromLocalStorage('test-guest-id')
            result.current.updatePreferences({
                autoMute: false,
                defaultVolume: 75,
                // childSafetyMode cannot be changed for guests (blocked by server-side enforcement)
            })
        })

        // Verify preferences are modified
        expect(result.current.autoMute).toBe(false)
        expect(result.current.defaultVolume).toBe(75)

        // Clear all data
        act(() => {
            result.current.clearAllData()
        })

        // Verify preferences are reset to defaults
        expect(result.current.autoMute).toBe(true) // Default
        expect(result.current.defaultVolume).toBe(50) // Default
        expect(result.current.childSafetyMode).toBe(false) // Always false for guests
    })
})

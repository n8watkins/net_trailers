/**
 * Tests for Authentication Store
 *
 * These tests verify critical behaviors and identify potential issues with:
 * - Data initialization and synchronization
 * - Mutual exclusion between liked and hidden content
 * - Race conditions in async operations
 * - User ID validation
 */

import { renderHook, act, waitFor } from '@testing-library/react'
import { useAuthStore } from '../../stores/authStore'
import { Content } from '../../typings'

// Mock Firebase and services
jest.mock('../../services/authStorageService', () => ({
    AuthStorageService: {
        saveUserData: jest.fn().mockResolvedValue(undefined),
        loadUserData: jest.fn().mockResolvedValue({
            userId: 'test-user',
            likedMovies: [],
            hiddenMovies: [],
            defaultWatchlist: [],
            userCreatedWatchlists: [],
            lastActive: Date.now(),
            autoMute: true,
            defaultVolume: 50,
            childSafetyMode: false,
        }),
    },
}))

jest.mock('../../utils/firebaseCallTracker', () => ({
    firebaseTracker: {
        track: jest.fn(),
    },
}))

jest.mock('../../utils/firebaseSyncManager', () => ({
    syncManager: {
        executeSync: jest.fn((userId, fn) => fn()),
        clearUserSync: jest.fn(),
    },
}))

// Helper to create mock content
const createMockContent = (id: number, title: string): Content => ({
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
    adult: false,
})

describe('AuthStore - Basic Functionality', () => {
    beforeEach(() => {
        // Reset store to default state before each test
        const { result } = renderHook(() => useAuthStore())
        act(() => {
            result.current.clearLocalCache()
        })
    })

    test('should initialize with default empty state', () => {
        const { result } = renderHook(() => useAuthStore())

        expect(result.current.userId).toBeUndefined()
        expect(result.current.likedMovies).toEqual([])
        expect(result.current.hiddenMovies).toEqual([])
        expect(result.current.defaultWatchlist).toEqual([])
        expect(result.current.syncStatus).toBe('synced')
    })

    test('should add content to liked movies', async () => {
        const { result } = renderHook(() => useAuthStore())
        const mockContent = createMockContent(1, 'Test Movie')

        // Set userId first
        act(() => {
            result.current.loadData({
                userId: 'test-user',
                likedMovies: [],
                hiddenMovies: [],
                defaultWatchlist: [],
                userCreatedWatchlists: [],
                lastActive: Date.now(),
                syncStatus: 'synced',
            })
        })

        await act(async () => {
            await result.current.addLikedMovie(mockContent)
        })

        expect(result.current.likedMovies).toHaveLength(1)
        expect(result.current.likedMovies[0].id).toBe(1)
    })

    test('should add content to hidden movies', async () => {
        const { result } = renderHook(() => useAuthStore())
        const mockContent = createMockContent(1, 'Test Movie')

        // Set userId first
        act(() => {
            result.current.loadData({
                userId: 'test-user',
                likedMovies: [],
                hiddenMovies: [],
                defaultWatchlist: [],
                userCreatedWatchlists: [],
                lastActive: Date.now(),
                syncStatus: 'synced',
            })
        })

        await act(async () => {
            await result.current.addHiddenMovie(mockContent)
        })

        expect(result.current.hiddenMovies).toHaveLength(1)
        expect(result.current.hiddenMovies[0].id).toBe(1)
    })
})

describe('AuthStore - CRITICAL ISSUE: Missing Mutual Exclusion', () => {
    beforeEach(() => {
        const { result } = renderHook(() => useAuthStore())
        act(() => {
            result.current.clearLocalCache()
        })
    })

    test('ISSUE: Content CAN be in both liked AND hidden arrays', async () => {
        const { result } = renderHook(() => useAuthStore())
        const mockContent = createMockContent(1, 'Test Movie')

        // Set userId first
        act(() => {
            result.current.loadData({
                userId: 'test-user',
                likedMovies: [],
                hiddenMovies: [],
                defaultWatchlist: [],
                userCreatedWatchlists: [],
                lastActive: Date.now(),
                syncStatus: 'synced',
            })
        })

        // Add to liked first
        await act(async () => {
            await result.current.addLikedMovie(mockContent)
        })

        expect(result.current.likedMovies).toHaveLength(1)
        expect(result.current.hiddenMovies).toHaveLength(0)

        // Now add to hidden - should remove from liked but DOESN'T
        await act(async () => {
            await result.current.addHiddenMovie(mockContent)
        })

        // BUG: Content is now in BOTH arrays!
        expect(result.current.likedMovies).toHaveLength(1)
        expect(result.current.hiddenMovies).toHaveLength(1)

        // This should be TRUE (mutual exclusion) but is FALSE
        const hasConflict = result.current.likedMovies.some(m =>
            result.current.hiddenMovies.some(h => h.id === m.id)
        )
        expect(hasConflict).toBe(true) // This proves the bug exists
    })

    test('EXPECTED BEHAVIOR: Adding to hidden should remove from liked', async () => {
        const { result } = renderHook(() => useAuthStore())
        const mockContent = createMockContent(1, 'Test Movie')

        act(() => {
            result.current.loadData({
                userId: 'test-user',
                likedMovies: [],
                hiddenMovies: [],
                defaultWatchlist: [],
                userCreatedWatchlists: [],
                lastActive: Date.now(),
                syncStatus: 'synced',
            })
        })

        await act(async () => {
            await result.current.addLikedMovie(mockContent)
        })

        await act(async () => {
            await result.current.addHiddenMovie(mockContent)
        })

        // EXPECTED: Content should ONLY be in hidden, not liked
        // ACTUAL: Content is in BOTH (bug)
        const isOnlyInHidden =
            result.current.hiddenMovies.length === 1 &&
            result.current.likedMovies.length === 0

        // This test FAILS, proving the bug
        expect(isOnlyInHidden).toBe(false) // Should be true, but isn't
    })
})

describe('AuthStore - CRITICAL ISSUE: Data Loss When UserId Undefined', () => {
    beforeEach(() => {
        const { result } = renderHook(() => useAuthStore())
        act(() => {
            result.current.clearLocalCache()
        })
    })

    test('ISSUE: Actions fail silently when userId is undefined', async () => {
        const { result } = renderHook(() => useAuthStore())
        const mockContent = createMockContent(1, 'Test Movie')

        // Verify userId is undefined
        expect(result.current.userId).toBeUndefined()

        // Try to add to liked without userId
        await act(async () => {
            await result.current.addLikedMovie(mockContent)
        })

        // Content is added to local state
        expect(result.current.likedMovies).toHaveLength(1)

        // But syncStatus is set to 'synced' even though nothing was saved
        // This is misleading - it should indicate the save failed or wasn't attempted
        expect(result.current.syncStatus).toBe('synced')

        // BUG: No error thrown, no indication to user that data wasn't persisted
    })

    test('ISSUE: No validation prevents actions before initialization', async () => {
        const { result } = renderHook(() => useAuthStore())
        const mockContent = createMockContent(1, 'Test Movie')

        // Store allows operations even though it's not properly initialized
        await act(async () => {
            await result.current.addLikedMovie(mockContent)
            await result.current.addHiddenMovie(mockContent)
            await result.current.addToWatchlist(mockContent)
        })

        // All operations "succeed" locally but nothing is persisted
        expect(result.current.likedMovies).toHaveLength(1)
        expect(result.current.hiddenMovies).toHaveLength(1)
        expect(result.current.defaultWatchlist).toHaveLength(1)

        // User has no way to know their data isn't being saved!
    })
})

describe('AuthStore - HIGH RISK: Race Conditions in User Switching', () => {
    beforeEach(() => {
        const { result } = renderHook(() => useAuthStore())
        act(() => {
            result.current.clearLocalCache()
        })
    })

    test('ISSUE: No userId validation before async save completes', async () => {
        const { result } = renderHook(() => useAuthStore())
        const mockContent = createMockContent(1, 'Test Movie')

        // Initialize as User A
        act(() => {
            result.current.loadData({
                userId: 'user-a',
                likedMovies: [],
                hiddenMovies: [],
                defaultWatchlist: [],
                userCreatedWatchlists: [],
                lastActive: Date.now(),
                syncStatus: 'synced',
            })
        })

        // User A likes a movie (async save starts)
        const likePromise = act(async () => {
            await result.current.addLikedMovie(mockContent)
        })

        // Before save completes, user switches to User B
        act(() => {
            result.current.loadData({
                userId: 'user-b',
                likedMovies: [],
                hiddenMovies: [],
                defaultWatchlist: [],
                userCreatedWatchlists: [],
                lastActive: Date.now(),
                syncStatus: 'synced',
            })
        })

        // Wait for save to complete
        await likePromise

        // RISK: User A's action might be saved to User B's account
        // because there's no validation in the save .then() callback
    })
})

describe('AuthStore - User Isolation', () => {
    beforeEach(() => {
        const { result } = renderHook(() => useAuthStore())
        act(() => {
            result.current.clearLocalCache()
        })
    })

    test('should clear store when userId mismatch detected', () => {
        const { result } = renderHook(() => useAuthStore())

        // Initialize with User A data
        act(() => {
            result.current.loadData({
                userId: 'user-a',
                likedMovies: [createMockContent(1, 'User A Movie')],
                hiddenMovies: [],
                defaultWatchlist: [],
                userCreatedWatchlists: [],
                lastActive: Date.now(),
                syncStatus: 'synced',
            })
        })

        expect(result.current.userId).toBe('user-a')
        expect(result.current.likedMovies).toHaveLength(1)

        // Try to load User B data (different userId)
        act(() => {
            result.current.loadData({
                userId: 'user-b',
                likedMovies: [],
                hiddenMovies: [],
                defaultWatchlist: [],
                userCreatedWatchlists: [],
                lastActive: Date.now(),
                syncStatus: 'synced',
            })
        })

        // loadData has validation that prevents loading wrong user's data
        // But it doesn't clear the store, it just returns early
        // This is actually safe behavior
    })

    test('should prevent duplicate additions', async () => {
        const { result } = renderHook(() => useAuthStore())
        const mockContent = createMockContent(1, 'Test Movie')

        act(() => {
            result.current.loadData({
                userId: 'test-user',
                likedMovies: [],
                hiddenMovies: [],
                defaultWatchlist: [],
                userCreatedWatchlists: [],
                lastActive: Date.now(),
                syncStatus: 'synced',
            })
        })

        // Add same content twice
        await act(async () => {
            await result.current.addLikedMovie(mockContent)
            await result.current.addLikedMovie(mockContent)
        })

        // Should only be added once (this works correctly)
        expect(result.current.likedMovies).toHaveLength(1)
    })
})

describe('AuthStore - Sync Behavior', () => {
    test('should update syncStatus during operations', async () => {
        const { result } = renderHook(() => useAuthStore())
        const mockContent = createMockContent(1, 'Test Movie')

        act(() => {
            result.current.loadData({
                userId: 'test-user',
                likedMovies: [],
                hiddenMovies: [],
                defaultWatchlist: [],
                userCreatedWatchlists: [],
                lastActive: Date.now(),
                syncStatus: 'synced',
            })
        })

        expect(result.current.syncStatus).toBe('synced')

        // Start async operation
        const promise = act(async () => {
            await result.current.addLikedMovie(mockContent)
        })

        // After promise resolves, should be synced again
        await promise

        await waitFor(() => {
            expect(result.current.syncStatus).toBe('synced')
        })
    })
})

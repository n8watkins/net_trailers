/**
 * Watch History Data Isolation Tests
 *
 * Verifies that watch history operations maintain strict isolation between:
 * - Authenticated users (Firestore-backed)
 * - Guest users (localStorage-backed)
 *
 * Test scenarios:
 * 1. Auth add/remove/clear only touches Firestore, never guest localStorage
 * 2. Guest add/remove/clear only touches localStorage, never Firestore
 * 3. Session switching properly loads correct data source
 * 4. Multiple guests maintain separate localStorage keys
 */

import { renderHook, act, waitFor } from '@testing-library/react'
import { useWatchHistory } from '../../hooks/useWatchHistory'
import { useWatchHistoryStore } from '../../stores/watchHistoryStore'
import { useSessionStore } from '../../stores/sessionStore'
import { Content } from '../../typings'

// Mock Firebase Auth
jest.mock('../../firebase', () => ({
    auth: {
        onAuthStateChanged: jest.fn(() => jest.fn()),
    },
    db: {},
}))

// Mock Firestore operations
const mockAddWatchEntryToFirestore = jest.fn()
const mockGetWatchHistory = jest.fn()
const mockSaveWatchHistory = jest.fn()

jest.mock('../../utils/firestore/watchHistory', () => ({
    addWatchEntryToFirestore: (...args: unknown[]) => mockAddWatchEntryToFirestore(...args),
    getWatchHistory: (...args: unknown[]) => mockGetWatchHistory(...args),
    saveWatchHistory: (...args: unknown[]) => mockSaveWatchHistory(...args),
}))

// Mock localStorage
const localStorageMock = (() => {
    let store: Record<string, string> = {}
    return {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => {
            store[key] = value
        },
        removeItem: (key: string) => {
            delete store[key]
        },
        clear: () => {
            store = {}
        },
        getAllKeys: () => Object.keys(store),
    }
})()

Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
})

// Helper to create mock content
const createMockContent = (id: number, title: string): Content => ({
    id,
    title,
    original_title: title,
    media_type: 'movie',
    poster_path: '/test.jpg',
    backdrop_path: '/test-bg.jpg',
    overview: 'Test overview',
    release_date: '2024-01-01',
    vote_average: 7.5,
    vote_count: 100,
    popularity: 50,
    adult: false,
    genre_ids: [28],
    original_language: 'en',
    video: false,
})

describe('useWatchHistory - Data Isolation', () => {
    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks()
        localStorageMock.clear()

        // Reset store state
        useWatchHistoryStore.setState({
            history: [],
            currentSessionId: null,
            lastSyncedAt: null,
            syncError: null,
            isLoading: false,
        })

        // Default mock implementations
        mockGetWatchHistory.mockResolvedValue([])
        mockAddWatchEntryToFirestore.mockResolvedValue(undefined)
        mockSaveWatchHistory.mockResolvedValue(undefined)
    })

    describe('Authenticated User Operations', () => {
        const authUserId = 'auth-user-123'
        const guestId = 'guest_1234567890_abc123'

        beforeEach(() => {
            // Setup session store for authenticated user
            useSessionStore.setState({
                sessionType: 'authenticated',
                activeSessionId: authUserId,
                getUserId: () => authUserId,
            })

            // Seed guest localStorage before auth tests
            const guestKey = `nettrailer-watch-history_guest_${guestId}`
            const guestHistory = [
                {
                    content: createMockContent(999, 'Guest Movie'),
                    watchedAt: Date.now() - 10000,
                    progress: 50,
                },
            ]
            localStorageMock.setItem(guestKey, JSON.stringify(guestHistory))
        })

        it('should add watch history to Firestore only, not touch guest localStorage', async () => {
            const { result } = renderHook(() => useWatchHistory())
            const content = createMockContent(1, 'Auth Movie')

            await act(async () => {
                await result.current.addWatchEntry(1, 'movie', content, 75, 120)
            })

            await waitFor(() => {
                // Should call Firestore addWatchEntry
                expect(mockAddWatchEntryToFirestore).toHaveBeenCalledWith(
                    authUserId,
                    expect.objectContaining({
                        contentId: 1,
                        mediaType: 'movie',
                        content,
                        progress: 75,
                        duration: 120,
                    })
                )
            })

            // Guest localStorage should remain untouched
            const guestKey = `nettrailer-watch-history_guest_${guestId}`
            const guestData = localStorageMock.getItem(guestKey)
            expect(guestData).toBeTruthy()
            const parsed = JSON.parse(guestData!)
            expect(parsed).toHaveLength(1)
            expect(parsed[0].content.id).toBe(999)
        })

        it('should remove watch history from Firestore only, not touch guest localStorage', async () => {
            // Setup: Firestore has content
            const existingContent = createMockContent(1, 'Auth Movie')
            const entryId = `1_movie`

            // Seed the store with the entry
            useWatchHistoryStore.setState({
                history: [
                    {
                        id: entryId,
                        contentId: 1,
                        mediaType: 'movie',
                        content: existingContent,
                        watchedAt: Date.now(),
                        progress: 50,
                    },
                ],
                currentSessionId: authUserId,
            })

            const { result } = renderHook(() => useWatchHistory())

            // Wait for initial state
            await waitFor(() => {
                expect(result.current.history).toHaveLength(1)
            })

            // Remove content by entry ID
            await act(async () => {
                await result.current.removeEntry(entryId)
            })

            await waitFor(() => {
                // History should be empty
                expect(result.current.history).toHaveLength(0)
            })

            // Guest localStorage should remain untouched
            const guestKey = `nettrailer-watch-history_guest_${guestId}`
            const guestData = localStorageMock.getItem(guestKey)
            expect(guestData).toBeTruthy()
            const parsed = JSON.parse(guestData!)
            expect(parsed).toHaveLength(1)
            expect(parsed[0].content.id).toBe(999)
        })

        it('should clear watch history from Firestore only, not touch guest localStorage', async () => {
            // Setup: Seed the store with content
            useWatchHistoryStore.setState({
                history: [
                    {
                        id: '1_movie',
                        contentId: 1,
                        mediaType: 'movie',
                        content: createMockContent(1, 'Auth Movie 1'),
                        watchedAt: Date.now(),
                        progress: 50,
                    },
                    {
                        id: '2_movie',
                        contentId: 2,
                        mediaType: 'movie',
                        content: createMockContent(2, 'Auth Movie 2'),
                        watchedAt: Date.now(),
                        progress: 75,
                    },
                ],
                currentSessionId: authUserId,
            })

            const { result } = renderHook(() => useWatchHistory())

            // Wait for initial load
            await waitFor(() => {
                expect(result.current.history).toHaveLength(2)
            })

            // Clear history
            await act(async () => {
                await result.current.clearHistory()
            })

            await waitFor(() => {
                expect(result.current.history).toHaveLength(0)
            })

            // Guest localStorage should remain untouched
            const guestKey = `nettrailer-watch-history_guest_${guestId}`
            const guestData = localStorageMock.getItem(guestKey)
            expect(guestData).toBeTruthy()
            const parsed = JSON.parse(guestData!)
            expect(parsed).toHaveLength(1)
            expect(parsed[0].content.id).toBe(999)
        })

        it('should never create or modify guest localStorage keys during auth operations', async () => {
            const { result } = renderHook(() => useWatchHistory())

            // Get initial localStorage keys
            const initialKeys = localStorageMock.getAllKeys()

            // Perform multiple operations
            await act(async () => {
                await result.current.addWatchEntry(1, 'movie', createMockContent(1, 'Movie 1'), 50)
                await result.current.addWatchEntry(2, 'movie', createMockContent(2, 'Movie 2'), 75)
            })

            // localStorage keys should be unchanged (guest key should still be there)
            const finalKeys = localStorageMock.getAllKeys()
            expect(finalKeys).toEqual(initialKeys)

            // All operations should only touch Firestore
            expect(mockAddWatchEntryToFirestore).toHaveBeenCalledTimes(2)
            mockAddWatchEntryToFirestore.mock.calls.forEach((call) => {
                expect(call[0]).toBe(authUserId)
            })
        })
    })

    describe('Guest User Operations', () => {
        const guestId = 'guest_1234567890_abc123'
        const authUserId = 'auth-user-456'
        const guestKey = `nettrailer-watch-history_guest_${guestId}`

        beforeEach(() => {
            // Setup session store for guest user
            useSessionStore.setState({
                sessionType: 'guest',
                activeSessionId: guestId,
                getUserId: () => null,
            })

            // Setup: Mock Firestore to have auth user data (shouldn't be called)
            mockGetWatchHistory.mockResolvedValue([
                {
                    content: createMockContent(777, 'Auth User Movie'),
                    watchedAt: Date.now(),
                    progress: 50,
                },
            ])
        })

        it('should add watch history to guest localStorage only, not call Firestore', async () => {
            const { result } = renderHook(() => useWatchHistory())
            const content = createMockContent(1, 'Guest Movie')

            await act(async () => {
                await result.current.addWatchEntry(1, 'movie', content, 60)
            })

            // Should NOT call Firestore
            expect(mockAddWatchEntryToFirestore).not.toHaveBeenCalled()
            expect(mockGetWatchHistory).not.toHaveBeenCalled()

            // Should save to guest localStorage
            const guestData = localStorageMock.getItem(guestKey)
            expect(guestData).toBeTruthy()
            const parsed = JSON.parse(guestData!)
            expect(parsed).toHaveLength(1)
            expect(parsed[0].contentId).toBe(1)
            expect(parsed[0].progress).toBe(60)
        })

        it('should remove watch history from guest localStorage only, not call Firestore', async () => {
            // Setup: Guest localStorage has content
            const initialHistory = [
                {
                    id: '1_movie',
                    contentId: 1,
                    mediaType: 'movie',
                    content: createMockContent(1, 'Guest Movie 1'),
                    watchedAt: Date.now(),
                    progress: 50,
                },
                {
                    id: '2_movie',
                    contentId: 2,
                    mediaType: 'movie',
                    content: createMockContent(2, 'Guest Movie 2'),
                    watchedAt: Date.now(),
                    progress: 75,
                },
            ]
            localStorageMock.setItem(guestKey, JSON.stringify(initialHistory))

            const { result } = renderHook(() => useWatchHistory())

            // Wait for load
            await waitFor(() => {
                expect(result.current.history).toHaveLength(2)
            })

            // Remove one item
            await act(async () => {
                await result.current.removeEntry('1_movie')
            })

            // Should NOT call Firestore
            expect(mockAddWatchEntryToFirestore).not.toHaveBeenCalled()

            // Should update guest localStorage
            const guestData = localStorageMock.getItem(guestKey)
            const parsed = JSON.parse(guestData!)
            expect(parsed).toHaveLength(1)
            expect(parsed[0].contentId).toBe(2)
        })

        it('should clear watch history from guest localStorage only, not call Firestore', async () => {
            // Setup: Guest localStorage has content
            const initialHistory = [
                {
                    id: '1_movie',
                    contentId: 1,
                    mediaType: 'movie',
                    content: createMockContent(1, 'Movie 1'),
                    watchedAt: Date.now(),
                    progress: 50,
                },
                {
                    id: '2_movie',
                    contentId: 2,
                    mediaType: 'movie',
                    content: createMockContent(2, 'Movie 2'),
                    watchedAt: Date.now(),
                    progress: 75,
                },
            ]
            localStorageMock.setItem(guestKey, JSON.stringify(initialHistory))

            const { result } = renderHook(() => useWatchHistory())

            // Wait for load
            await waitFor(() => {
                expect(result.current.history).toHaveLength(2)
            })

            // Clear history
            await act(async () => {
                await result.current.clearHistory()
            })

            // Should NOT call Firestore
            expect(mockAddWatchEntryToFirestore).not.toHaveBeenCalled()

            // Guest localStorage key should be removed
            expect(localStorageMock.getItem(guestKey)).toBeNull()
            expect(result.current.history).toHaveLength(0)
        })

        it('should never call Firestore methods during guest operations', async () => {
            const { result } = renderHook(() => useWatchHistory())

            // Perform multiple operations
            await act(async () => {
                await result.current.addWatchEntry(1, 'movie', createMockContent(1, 'Movie 1'), 50)
                await result.current.addWatchEntry(2, 'movie', createMockContent(2, 'Movie 2'), 75)
            })

            // Firestore should NEVER be called
            expect(mockAddWatchEntryToFirestore).not.toHaveBeenCalled()
            expect(mockGetWatchHistory).not.toHaveBeenCalled()
        })
    })

    describe('Multiple Guests Isolation', () => {
        const guest1Id = 'guest_1111111111_aaa111'
        const guest2Id = 'guest_2222222222_bbb222'

        it('should maintain separate localStorage keys for different guests', async () => {
            // Setup guest 1
            useSessionStore.setState({
                sessionType: 'guest',
                activeSessionId: guest1Id,
                getUserId: () => null,
            })

            // Guest 1 adds history
            const { result: result1 } = renderHook(() => useWatchHistory())
            await act(async () => {
                await result1.current.addWatchEntry(
                    1,
                    'movie',
                    createMockContent(1, 'Guest 1 Movie'),
                    50
                )
            })

            // Setup guest 2
            useSessionStore.setState({
                sessionType: 'guest',
                activeSessionId: guest2Id,
                getUserId: () => null,
            })

            // Guest 2 adds history
            const { result: result2 } = renderHook(() => useWatchHistory())
            await act(async () => {
                await result2.current.addWatchEntry(
                    2,
                    'movie',
                    createMockContent(2, 'Guest 2 Movie'),
                    75
                )
            })

            // Each guest should have their own localStorage key
            const guest1Key = `nettrailer-watch-history_guest_${guest1Id}`
            const guest2Key = `nettrailer-watch-history_guest_${guest2Id}`

            const guest1Data = JSON.parse(localStorageMock.getItem(guest1Key)!)
            const guest2Data = JSON.parse(localStorageMock.getItem(guest2Key)!)

            expect(guest1Data).toHaveLength(1)
            expect(guest1Data[0].contentId).toBe(1)

            expect(guest2Data).toHaveLength(1)
            expect(guest2Data[0].contentId).toBe(2)
        })

        it('should not affect other guests when clearing one guest history', async () => {
            // Setup: Both guests have history
            const guest1Key = `nettrailer-watch-history_guest_${guest1Id}`
            const guest2Key = `nettrailer-watch-history_guest_${guest2Id}`

            localStorageMock.setItem(
                guest1Key,
                JSON.stringify([
                    {
                        id: '1_movie',
                        contentId: 1,
                        mediaType: 'movie',
                        content: createMockContent(1, 'Guest 1 Movie'),
                        watchedAt: Date.now(),
                    },
                ])
            )
            localStorageMock.setItem(
                guest2Key,
                JSON.stringify([
                    {
                        id: '2_movie',
                        contentId: 2,
                        mediaType: 'movie',
                        content: createMockContent(2, 'Guest 2 Movie'),
                        watchedAt: Date.now(),
                    },
                ])
            )

            // Setup guest 1 session
            useSessionStore.setState({
                sessionType: 'guest',
                activeSessionId: guest1Id,
                getUserId: () => null,
            })

            // Clear guest 1's history
            const { result } = renderHook(() => useWatchHistory())
            await waitFor(() => {
                expect(result.current.history).toHaveLength(1)
            })

            await act(async () => {
                await result.current.clearHistory()
            })

            // Guest 1's key should be removed
            expect(localStorageMock.getItem(guest1Key)).toBeNull()

            // Guest 2's data should be untouched
            const guest2Data = JSON.parse(localStorageMock.getItem(guest2Key)!)
            expect(guest2Data).toHaveLength(1)
            expect(guest2Data[0].contentId).toBe(2)
        })
    })

    describe('Session Switching', () => {
        const authUserId = 'auth-user-789'
        const guestId = 'guest_3333333333_ccc333'

        beforeEach(() => {
            // Setup both data sources
            const guestKey = `nettrailer-watch-history_guest_${guestId}`
            localStorageMock.setItem(
                guestKey,
                JSON.stringify([
                    {
                        id: '999_movie',
                        contentId: 999,
                        mediaType: 'movie',
                        content: createMockContent(999, 'Guest Movie'),
                        watchedAt: Date.now(),
                        progress: 50,
                    },
                ])
            )

            mockGetWatchHistory.mockResolvedValue([
                {
                    id: '888_movie',
                    contentId: 888,
                    mediaType: 'movie',
                    content: createMockContent(888, 'Auth Movie'),
                    watchedAt: Date.now(),
                    progress: 75,
                },
            ])
        })

        it('should load from localStorage when session is guest', async () => {
            // Setup guest session
            useSessionStore.setState({
                sessionType: 'guest',
                activeSessionId: guestId,
                getUserId: () => null,
            })

            const { result } = renderHook(() => useWatchHistory())

            // Wait for guest data
            await waitFor(() => {
                expect(result.current.history).toHaveLength(1)
                expect(result.current.history[0].contentId).toBe(999)
            })

            // Should NOT call Firestore
            expect(mockGetWatchHistory).not.toHaveBeenCalled()
        })

        it('should load from Firestore when session is authenticated', async () => {
            // Setup auth session
            useSessionStore.setState({
                sessionType: 'authenticated',
                activeSessionId: authUserId,
                getUserId: () => authUserId,
            })

            const { result } = renderHook(() => useWatchHistory())

            // Should eventually have auth data (after Firestore load)
            await waitFor(
                () => {
                    expect(result.current.history.length).toBeGreaterThan(0)
                },
                { timeout: 3000 }
            )
        })
    })

    describe('Error Handling & Edge Cases', () => {
        const authUserId = 'auth-user-error'

        it('should handle Firestore errors gracefully without affecting localStorage', async () => {
            const guestId = 'guest_error_test'
            const guestKey = `nettrailer-watch-history_guest_${guestId}`

            // Setup guest data
            localStorageMock.setItem(
                guestKey,
                JSON.stringify([
                    {
                        id: '1_movie',
                        contentId: 1,
                        mediaType: 'movie',
                        content: createMockContent(1, 'Safe Guest Data'),
                        watchedAt: Date.now(),
                    },
                ])
            )

            // Setup auth session
            useSessionStore.setState({
                sessionType: 'authenticated',
                activeSessionId: authUserId,
                getUserId: () => authUserId,
            })

            // Mock Firestore to throw error
            mockAddWatchEntryToFirestore.mockRejectedValue(new Error('Firestore write failed'))

            const { result } = renderHook(() => useWatchHistory())

            // Attempt to add (will fail Firestore but succeed locally)
            await act(async () => {
                await result.current.addWatchEntry(
                    2,
                    'movie',
                    createMockContent(2, 'Auth Movie'),
                    50
                )
            })

            // Guest localStorage should remain untouched
            const guestData = JSON.parse(localStorageMock.getItem(guestKey)!)
            expect(guestData).toHaveLength(1)
            expect(guestData[0].contentId).toBe(1)
        })

        it('should handle corrupted localStorage gracefully', async () => {
            const guestId = 'guest_corrupted'
            const guestKey = `nettrailer-watch-history_guest_${guestId}`

            // Setup guest session
            useSessionStore.setState({
                sessionType: 'guest',
                activeSessionId: guestId,
                getUserId: () => null,
            })

            // Setup corrupted data
            localStorageMock.setItem(guestKey, 'invalid json{{{')

            // Guest should handle corruption (fall back to empty array)
            const { result: guestResult } = renderHook(() => useWatchHistory())
            await waitFor(() => {
                expect(guestResult.current.history).toEqual([])
            })
        })
    })
})

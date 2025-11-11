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
import { Content } from '../../typings'

// Mock Firestore operations
const mockSaveWatchHistory = jest.fn()
const mockGetWatchHistory = jest.fn()

jest.mock('../../utils/firestore/watchHistory', () => ({
    saveWatchHistory: (...args: unknown[]) => mockSaveWatchHistory(...args),
    getWatchHistory: (...args: unknown[]) => mockGetWatchHistory(...args),
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
        })

        // Default mock implementations
        mockGetWatchHistory.mockResolvedValue([])
        mockSaveWatchHistory.mockResolvedValue(undefined)
    })

    describe('Authenticated User Operations', () => {
        const authUserId = 'auth-user-123'
        const guestId = 'guest_1234567890_abc123'

        beforeEach(() => {
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
            const { result } = renderHook(() => useWatchHistory(authUserId, false))
            const content = createMockContent(1, 'Auth Movie')

            await act(async () => {
                await result.current.addToHistory(content, 75, 120)
            })

            await waitFor(() => {
                // Should call Firestore save
                expect(mockSaveWatchHistory).toHaveBeenCalledWith(authUserId, [
                    {
                        content,
                        watchedAt: expect.any(Number),
                        progress: 75,
                        duration: 120,
                    },
                ])
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
            mockGetWatchHistory.mockResolvedValue([
                {
                    content: existingContent,
                    watchedAt: Date.now(),
                    progress: 50,
                },
            ])

            const { result } = renderHook(() => useWatchHistory(authUserId, false))

            // Wait for initial load
            await waitFor(() => {
                expect(result.current.history).toHaveLength(1)
            })

            // Remove content
            await act(async () => {
                await result.current.removeFromHistory(1)
            })

            await waitFor(() => {
                // Should call Firestore save with empty array
                expect(mockSaveWatchHistory).toHaveBeenCalledWith(authUserId, [])
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
            // Setup: Firestore has content
            mockGetWatchHistory.mockResolvedValue([
                {
                    content: createMockContent(1, 'Auth Movie 1'),
                    watchedAt: Date.now(),
                    progress: 50,
                },
                {
                    content: createMockContent(2, 'Auth Movie 2'),
                    watchedAt: Date.now(),
                    progress: 75,
                },
            ])

            const { result } = renderHook(() => useWatchHistory(authUserId, false))

            // Wait for initial load
            await waitFor(() => {
                expect(result.current.history).toHaveLength(2)
            })

            // Clear history
            await act(async () => {
                await result.current.clearHistory()
            })

            await waitFor(() => {
                // Should call Firestore save with empty array
                expect(mockSaveWatchHistory).toHaveBeenCalledWith(authUserId, [])
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
            const { result } = renderHook(() => useWatchHistory(authUserId, false))

            // Get initial localStorage keys
            const initialKeys = localStorageMock.getAllKeys()

            // Perform multiple operations
            await act(async () => {
                await result.current.addToHistory(createMockContent(1, 'Movie 1'), 50)
                await result.current.addToHistory(createMockContent(2, 'Movie 2'), 75)
                await result.current.removeFromHistory(1)
                await result.current.updateProgress(2, 90, 120)
            })

            // localStorage keys should be unchanged
            const finalKeys = localStorageMock.getAllKeys()
            expect(finalKeys).toEqual(initialKeys)

            // All operations should only touch Firestore
            expect(mockSaveWatchHistory).toHaveBeenCalledTimes(4)
            mockSaveWatchHistory.mock.calls.forEach((call) => {
                expect(call[0]).toBe(authUserId)
            })
        })
    })

    describe('Guest User Operations', () => {
        const guestId = 'guest_1234567890_abc123'
        const authUserId = 'auth-user-456'
        const guestKey = `nettrailer-watch-history_guest_${guestId}`

        beforeEach(() => {
            // Setup: Mock Firestore to have auth user data
            mockGetWatchHistory.mockResolvedValue([
                {
                    content: createMockContent(777, 'Auth User Movie'),
                    watchedAt: Date.now(),
                    progress: 50,
                },
            ])
        })

        it('should add watch history to guest localStorage only, not call Firestore', async () => {
            const { result } = renderHook(() => useWatchHistory(guestId, true))
            const content = createMockContent(1, 'Guest Movie')

            await act(async () => {
                result.current.addToHistory(content, 60)
            })

            // Should NOT call Firestore
            expect(mockSaveWatchHistory).not.toHaveBeenCalled()
            expect(mockGetWatchHistory).not.toHaveBeenCalled()

            // Should save to guest localStorage
            const guestData = localStorageMock.getItem(guestKey)
            expect(guestData).toBeTruthy()
            const parsed = JSON.parse(guestData!)
            expect(parsed).toHaveLength(1)
            expect(parsed[0].content.id).toBe(1)
            expect(parsed[0].progress).toBe(60)
        })

        it('should remove watch history from guest localStorage only, not call Firestore', async () => {
            // Setup: Guest localStorage has content
            const initialHistory = [
                {
                    content: createMockContent(1, 'Guest Movie 1'),
                    watchedAt: Date.now(),
                    progress: 50,
                },
                {
                    content: createMockContent(2, 'Guest Movie 2'),
                    watchedAt: Date.now(),
                    progress: 75,
                },
            ]
            localStorageMock.setItem(guestKey, JSON.stringify(initialHistory))

            const { result } = renderHook(() => useWatchHistory(guestId, true))

            // Wait for load
            await waitFor(() => {
                expect(result.current.history).toHaveLength(2)
            })

            // Remove one item
            await act(async () => {
                result.current.removeFromHistory(1)
            })

            // Should NOT call Firestore
            expect(mockSaveWatchHistory).not.toHaveBeenCalled()

            // Should update guest localStorage
            const guestData = localStorageMock.getItem(guestKey)
            const parsed = JSON.parse(guestData!)
            expect(parsed).toHaveLength(1)
            expect(parsed[0].content.id).toBe(2)
        })

        it('should clear watch history from guest localStorage only, not call Firestore', async () => {
            // Setup: Guest localStorage has content
            const initialHistory = [
                { content: createMockContent(1, 'Movie 1'), watchedAt: Date.now(), progress: 50 },
                { content: createMockContent(2, 'Movie 2'), watchedAt: Date.now(), progress: 75 },
            ]
            localStorageMock.setItem(guestKey, JSON.stringify(initialHistory))

            const { result } = renderHook(() => useWatchHistory(guestId, true))

            // Wait for load
            await waitFor(() => {
                expect(result.current.history).toHaveLength(2)
            })

            // Clear history
            await act(async () => {
                result.current.clearHistory()
            })

            // Should NOT call Firestore
            expect(mockSaveWatchHistory).not.toHaveBeenCalled()

            // Guest localStorage key should be removed
            expect(localStorageMock.getItem(guestKey)).toBeNull()
            expect(result.current.history).toHaveLength(0)
        })

        it('should never call Firestore methods during guest operations', async () => {
            const { result } = renderHook(() => useWatchHistory(guestId, true))

            // Perform multiple operations
            await act(async () => {
                result.current.addToHistory(createMockContent(1, 'Movie 1'), 50)
                result.current.addToHistory(createMockContent(2, 'Movie 2'), 75)
                result.current.removeFromHistory(1)
                result.current.updateProgress(2, 90, 120)
                result.current.clearHistory()
            })

            // Firestore should NEVER be called
            expect(mockSaveWatchHistory).not.toHaveBeenCalled()
            expect(mockGetWatchHistory).not.toHaveBeenCalled()
        })
    })

    describe('Multiple Guests Isolation', () => {
        const guest1Id = 'guest_1111111111_aaa111'
        const guest2Id = 'guest_2222222222_bbb222'

        it('should maintain separate localStorage keys for different guests', async () => {
            // Guest 1 adds history
            const { result: result1 } = renderHook(() => useWatchHistory(guest1Id, true))
            await act(async () => {
                result1.current.addToHistory(createMockContent(1, 'Guest 1 Movie'), 50)
            })

            // Guest 2 adds history
            const { result: result2 } = renderHook(() => useWatchHistory(guest2Id, true))
            await act(async () => {
                result2.current.addToHistory(createMockContent(2, 'Guest 2 Movie'), 75)
            })

            // Each guest should have their own localStorage key
            const guest1Key = `nettrailer-watch-history_guest_${guest1Id}`
            const guest2Key = `nettrailer-watch-history_guest_${guest2Id}`

            const guest1Data = JSON.parse(localStorageMock.getItem(guest1Key)!)
            const guest2Data = JSON.parse(localStorageMock.getItem(guest2Key)!)

            expect(guest1Data).toHaveLength(1)
            expect(guest1Data[0].content.id).toBe(1)

            expect(guest2Data).toHaveLength(1)
            expect(guest2Data[0].content.id).toBe(2)
        })

        it('should not affect other guests when clearing one guest history', async () => {
            // Setup: Both guests have history
            const guest1Key = `nettrailer-watch-history_guest_${guest1Id}`
            const guest2Key = `nettrailer-watch-history_guest_${guest2Id}`

            localStorageMock.setItem(
                guest1Key,
                JSON.stringify([
                    { content: createMockContent(1, 'Guest 1 Movie'), watchedAt: Date.now() },
                ])
            )
            localStorageMock.setItem(
                guest2Key,
                JSON.stringify([
                    { content: createMockContent(2, 'Guest 2 Movie'), watchedAt: Date.now() },
                ])
            )

            // Clear guest 1's history
            const { result } = renderHook(() => useWatchHistory(guest1Id, true))
            await act(async () => {
                result.current.clearHistory()
            })

            // Guest 1's key should be removed
            expect(localStorageMock.getItem(guest1Key)).toBeNull()

            // Guest 2's data should be untouched
            const guest2Data = JSON.parse(localStorageMock.getItem(guest2Key)!)
            expect(guest2Data).toHaveLength(1)
            expect(guest2Data[0].content.id).toBe(2)
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
                        content: createMockContent(999, 'Guest Movie'),
                        watchedAt: Date.now(),
                        progress: 50,
                    },
                ])
            )

            mockGetWatchHistory.mockResolvedValue([
                {
                    content: createMockContent(888, 'Auth Movie'),
                    watchedAt: Date.now(),
                    progress: 75,
                },
            ])
        })

        it('should load from Firestore when switching from guest to auth', async () => {
            // Start as guest
            const { result, rerender } = renderHook(
                ({ userId, isGuest }) => useWatchHistory(userId, isGuest),
                {
                    initialProps: { userId: guestId, isGuest: true },
                }
            )

            // Wait for guest data
            await waitFor(() => {
                expect(result.current.history).toHaveLength(1)
                expect(result.current.history[0].content.id).toBe(999)
            })

            // Switch to auth
            rerender({ userId: authUserId, isGuest: false })

            // Should load from Firestore
            await waitFor(() => {
                expect(mockGetWatchHistory).toHaveBeenCalledWith(authUserId)
                expect(result.current.history).toHaveLength(1)
                expect(result.current.history[0].content.id).toBe(888)
            })
        })

        it('should load from localStorage when switching from auth to guest', async () => {
            // Start as auth
            const { result, rerender } = renderHook(
                ({ userId, isGuest }) => useWatchHistory(userId, isGuest),
                {
                    initialProps: { userId: authUserId, isGuest: false },
                }
            )

            // Wait for auth data
            await waitFor(() => {
                expect(result.current.history).toHaveLength(1)
                expect(result.current.history[0].content.id).toBe(888)
            })

            // Reset mock to verify no new calls
            mockGetWatchHistory.mockClear()

            // Switch to guest
            rerender({ userId: guestId, isGuest: true })

            // Should load from localStorage, NOT call Firestore
            await waitFor(() => {
                expect(result.current.history).toHaveLength(1)
                expect(result.current.history[0].content.id).toBe(999)
            })

            expect(mockGetWatchHistory).not.toHaveBeenCalled()
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
                JSON.stringify([{ content: createMockContent(1, 'Safe Guest Data') }])
            )

            // Mock Firestore to throw error
            mockSaveWatchHistory.mockRejectedValue(new Error('Firestore write failed'))

            const { result } = renderHook(() => useWatchHistory(authUserId, false))

            // Attempt to add (will fail)
            await act(async () => {
                await result.current.addToHistory(createMockContent(2, 'Auth Movie'), 50)
            })

            // Guest localStorage should remain untouched
            const guestData = JSON.parse(localStorageMock.getItem(guestKey)!)
            expect(guestData).toHaveLength(1)
            expect(guestData[0].content.id).toBe(1)
        })

        it('should handle corrupted localStorage gracefully without affecting Firestore', async () => {
            const guestId = 'guest_corrupted'
            const guestKey = `nettrailer-watch-history_guest_${guestId}`

            // Setup corrupted data
            localStorageMock.setItem(guestKey, 'invalid json{{{')

            // Mock Firestore with valid data
            mockGetWatchHistory.mockResolvedValue([
                { content: createMockContent(888, 'Safe Auth Data') },
            ])

            // Guest should handle corruption (fall back to empty array)
            const { result: guestResult } = renderHook(() => useWatchHistory(guestId, true))
            expect(guestResult.current.history).toEqual([])

            // Auth should work normally with Firestore
            const { result: authResult } = renderHook(() => useWatchHistory(authUserId, false))
            await waitFor(() => {
                expect(authResult.current.history).toHaveLength(1)
                expect(authResult.current.history[0].content.id).toBe(888)
            })
        })
    })
})

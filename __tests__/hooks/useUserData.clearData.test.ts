/**
 * useUserData Clear Account Data Isolation Tests
 *
 * Verifies that clearAccountData maintains strict isolation between:
 * - Authenticated users (Firestore + in-memory)
 * - Guest users (localStorage + in-memory)
 *
 * Test scenarios:
 * 1. Auth clearAccountData clears Firestore (user doc + watch history) but not guest localStorage
 * 2. Guest clearAccountData clears localStorage but not Firestore
 * 3. Multiple guests can be cleared independently
 * 4. Session state is properly maintained after clearing
 */

import { renderHook, act, waitFor } from '@testing-library/react'
import { useWatchHistoryStore } from '../../stores/watchHistoryStore'
import { useNotificationStore } from '../../stores/notificationStore'
import * as useSessionDataModule from '../../hooks/useSessionData'

// Mock Firebase
const mockSetDoc = jest.fn()
const mockDoc = jest.fn()
const mockDeleteAllNotifications = jest.fn()

jest.mock('../../firebase', () => ({
    auth: {
        currentUser: {
            uid: 'test-auth-user-123',
        },
    },
    db: {},
}))

jest.mock('firebase/firestore', () => ({
    doc: (...args: unknown[]) => mockDoc(...args),
    setDoc: (...args: unknown[]) => mockSetDoc(...args),
}))

jest.mock('../../stores/notificationStore', () => ({
    useNotificationStore: {
        getState: jest.fn(() => ({
            notifications: [
                { id: '1', type: 'info', message: 'Test notification' },
                { id: '2', type: 'success', message: 'Another notification' },
            ],
            deleteAllNotifications: mockDeleteAllNotifications,
            clearNotifications: jest.fn(),
        })),
        setState: jest.fn(),
    },
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
        _getStore: () => store,
    }
})()

Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
})

// Import after mocks are set up
import useUserData from '../../hooks/useUserData'

describe('useUserData - clearAccountData Isolation', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        localStorageMock.clear()

        // Reset stores
        useWatchHistoryStore.setState({
            history: [],
            currentSessionId: null,
            lastSyncedAt: null,
            syncError: null,
        })

        // Default mock implementations
        mockSetDoc.mockResolvedValue(undefined)
        mockDeleteAllNotifications.mockResolvedValue(undefined)
    })

    describe('Authenticated User - Clear All Data', () => {
        const authUserId = 'test-auth-user-123'
        const guestId = 'guest_1234567890_abc123'

        beforeEach(() => {
            // Seed guest localStorage BEFORE auth clear tests
            const guestDataKey = `nettrailer_guest_data_v2_${guestId}`
            const guestWatchHistoryKey = `nettrailer-watch-history_guest_${guestId}`

            localStorageMock.setItem(
                guestDataKey,
                JSON.stringify({
                    guestId,
                    defaultWatchlist: [{ id: 1, title: 'Guest Movie' }],
                    likedMovies: [{ id: 2, title: 'Guest Liked' }],
                    hiddenMovies: [],
                    userCreatedWatchlists: [],
                })
            )

            localStorageMock.setItem(
                guestWatchHistoryKey,
                JSON.stringify([
                    {
                        content: { id: 3, title: 'Guest Watched' },
                        watchedAt: Date.now(),
                    },
                ])
            )

            // Setup watch history store with auth session
            useWatchHistoryStore.setState({
                history: [
                    {
                        content: { id: 100, title: 'Auth Watched Movie' } as any,
                        watchedAt: Date.now(),
                        progress: 75,
                    },
                ],
                currentSessionId: authUserId,
                lastSyncedAt: Date.now(),
                syncError: null,
            })
        })

        it('should clear Firestore user document and watch history', async () => {
            const { result } = renderHook(() => useUserData())

            // Ensure we're in auth mode
            expect(result.current.isAuthenticated).toBe(true)
            expect(result.current.isGuest).toBe(false)

            await act(async () => {
                await result.current.clearAccountData()
            })

            await waitFor(() => {
                // Should call setDoc twice: once for user doc, once for watch history
                expect(mockSetDoc).toHaveBeenCalledTimes(2)

                // First call: clear main user document
                expect(mockSetDoc).toHaveBeenNthCalledWith(
                    1,
                    expect.anything(), // doc reference
                    {
                        defaultWatchlist: [],
                        likedMovies: [],
                        hiddenMovies: [],
                        userCreatedWatchlists: [],
                        lastActive: expect.any(Number),
                    },
                    { merge: true }
                )

                // Second call: clear watch history
                expect(mockSetDoc).toHaveBeenNthCalledWith(
                    2,
                    expect.anything(), // watch history doc reference
                    {
                        history: [],
                        updatedAt: expect.any(Number),
                    },
                    { merge: true }
                )
            })
        })

        it('should clear notifications via deleteAllNotifications', async () => {
            const { result } = renderHook(() => useUserData())

            await act(async () => {
                await result.current.clearAccountData()
            })

            await waitFor(() => {
                expect(mockDeleteAllNotifications).toHaveBeenCalledWith(authUserId)
            })
        })

        it('should clear in-memory watch history and restore session state', async () => {
            const { result } = renderHook(() => useUserData())

            // Verify initial state
            expect(useWatchHistoryStore.getState().history).toHaveLength(1)
            expect(useWatchHistoryStore.getState().currentSessionId).toBe(authUserId)

            await act(async () => {
                await result.current.clearAccountData()
            })

            await waitFor(() => {
                const storeState = useWatchHistoryStore.getState()

                // History should be cleared
                expect(storeState.history).toHaveLength(0)

                // Session should be restored (not null)
                expect(storeState.currentSessionId).toBe(authUserId)
                expect(storeState.lastSyncedAt).toBeTruthy()
                expect(storeState.syncError).toBeNull()
            })
        })

        it('should NOT touch guest localStorage during auth clear', async () => {
            const { result } = renderHook(() => useUserData())

            // Get initial guest localStorage keys
            const guestDataKey = `nettrailer_guest_data_v2_${guestId}`
            const guestWatchHistoryKey = `nettrailer-watch-history_guest_${guestId}`

            const guestDataBefore = localStorageMock.getItem(guestDataKey)
            const guestWatchHistoryBefore = localStorageMock.getItem(guestWatchHistoryKey)

            // Clear auth data
            await act(async () => {
                await result.current.clearAccountData()
            })

            await waitFor(() => {
                // Guest localStorage should be UNCHANGED
                const guestDataAfter = localStorageMock.getItem(guestDataKey)
                const guestWatchHistoryAfter = localStorageMock.getItem(guestWatchHistoryKey)

                expect(guestDataAfter).toBe(guestDataBefore)
                expect(guestWatchHistoryAfter).toBe(guestWatchHistoryBefore)

                // Verify guest data is intact
                const parsedGuestData = JSON.parse(guestDataAfter!)
                expect(parsedGuestData.defaultWatchlist).toHaveLength(1)
                expect(parsedGuestData.likedMovies).toHaveLength(1)

                const parsedGuestHistory = JSON.parse(guestWatchHistoryAfter!)
                expect(parsedGuestHistory).toHaveLength(1)
            })
        })

        it('should log all clearing operations', async () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation()

            const { result } = renderHook(() => useUserData())

            await act(async () => {
                await result.current.clearAccountData()
            })

            await waitFor(() => {
                const logs = consoleSpy.mock.calls.map((call) => call[0])

                expect(logs).toContain(
                    expect.stringContaining('[useUserData] 🗑️ Starting clearAccountData')
                )
                expect(logs).toContain(
                    expect.stringContaining(
                        '[useUserData] ✅ Cleared collections and ratings from Firestore'
                    )
                )
                expect(logs).toContain(
                    expect.stringContaining('[useUserData] ✅ Cleared watch history from Firestore')
                )
                expect(logs).toContain(
                    expect.stringContaining('[useUserData] 🗑️ Clearing notifications...')
                )
                expect(logs).toContain(
                    expect.stringContaining('[useUserData] ✅ clearAccountData completed')
                )
            })

            consoleSpy.mockRestore()
        })
    })

    describe('Guest User - Clear All Data', () => {
        const guestId = 'guest_5555555555_xyz789'
        const authUserId = 'auth-user-different'

        beforeEach(() => {
            // Mock to simulate guest mode
            jest.spyOn(useSessionDataModule, 'useSessionData').mockReturnValue({
                sessionType: 'guest',
                activeSessionId: guestId,
                isGuest: true,
                isAuthenticated: false,
                clearAllData: jest.fn(),
                // ... other required fields
            } as ReturnType<typeof useSessionDataModule.useSessionData>)

            // Seed guest localStorage
            const guestDataKey = `nettrailer_guest_data_v2_${guestId}`
            const guestWatchHistoryKey = `nettrailer-watch-history_guest_${guestId}`

            localStorageMock.setItem(
                guestDataKey,
                JSON.stringify({
                    guestId,
                    defaultWatchlist: [{ id: 10, title: 'Guest Watchlist Movie' }],
                    likedMovies: [{ id: 11, title: 'Guest Liked Movie' }],
                    hiddenMovies: [{ id: 12, title: 'Guest Hidden Movie' }],
                    userCreatedWatchlists: [],
                })
            )

            localStorageMock.setItem(
                guestWatchHistoryKey,
                JSON.stringify([
                    {
                        content: { id: 13, title: 'Guest Watch History' },
                        watchedAt: Date.now(),
                    },
                ])
            )

            // Setup watch history store with guest session
            useWatchHistoryStore.setState({
                history: [
                    {
                        content: { id: 13, title: 'Guest Watch History' } as any,
                        watchedAt: Date.now(),
                        progress: 50,
                    },
                ],
                currentSessionId: guestId,
                lastSyncedAt: Date.now(),
                syncError: null,
            })
        })

        afterEach(() => {
            jest.restoreAllMocks()
        })

        it('should clear guest localStorage keys', async () => {
            const { result } = renderHook(() => useUserData())

            // Should be in guest mode
            expect(result.current.isGuest).toBe(true)

            const guestDataKey = `nettrailer_guest_data_v2_${guestId}`
            const guestWatchHistoryKey = `nettrailer-watch-history_guest_${guestId}`

            // Verify data exists before clearing
            expect(localStorageMock.getItem(guestDataKey)).toBeTruthy()
            expect(localStorageMock.getItem(guestWatchHistoryKey)).toBeTruthy()

            await act(async () => {
                await result.current.clearAccountData()
            })

            // Guest data should be reset to defaults (empty arrays)
            const clearedData = JSON.parse(localStorageMock.getItem(guestDataKey)!)
            expect(clearedData.defaultWatchlist).toEqual([])
            expect(clearedData.likedMovies).toEqual([])
            expect(clearedData.hiddenMovies).toEqual([])

            // Watch history key should be removed
            expect(localStorageMock.getItem(guestWatchHistoryKey)).toBeNull()
        })

        it('should NOT call Firestore methods during guest clear', async () => {
            const { result } = renderHook(() => useUserData())

            await act(async () => {
                await result.current.clearAccountData()
            })

            // Firestore should NEVER be called for guest operations
            expect(mockSetDoc).not.toHaveBeenCalled()
            expect(mockDoc).not.toHaveBeenCalled()
        })

        it('should clear in-memory stores and restore guest session', async () => {
            const { result } = renderHook(() => useUserData())

            // Verify initial state
            expect(useWatchHistoryStore.getState().history).toHaveLength(1)

            await act(async () => {
                await result.current.clearAccountData()
            })

            await waitFor(() => {
                const storeState = useWatchHistoryStore.getState()

                // History should be cleared
                expect(storeState.history).toHaveLength(0)

                // Guest session should be restored
                expect(storeState.currentSessionId).toBe(guestId)
                expect(storeState.lastSyncedAt).toBeTruthy()
                expect(storeState.syncError).toBeNull()
            })
        })
    })

    describe('Multiple Guests Isolation', () => {
        const guest1Id = 'guest_1111111111_aaa111'
        const guest2Id = 'guest_2222222222_bbb222'

        beforeEach(() => {
            // Setup two guests with data
            const guest1DataKey = `nettrailer_guest_data_v2_${guest1Id}`
            const guest1HistoryKey = `nettrailer-watch-history_guest_${guest1Id}`
            const guest2DataKey = `nettrailer_guest_data_v2_${guest2Id}`
            const guest2HistoryKey = `nettrailer-watch-history_guest_${guest2Id}`

            localStorageMock.setItem(
                guest1DataKey,
                JSON.stringify({
                    guestId: guest1Id,
                    defaultWatchlist: [{ id: 100, title: 'Guest 1 Movie' }],
                    likedMovies: [],
                    hiddenMovies: [],
                    userCreatedWatchlists: [],
                })
            )

            localStorageMock.setItem(
                guest1HistoryKey,
                JSON.stringify([{ content: { id: 101, title: 'Guest 1 Watched' } }])
            )

            localStorageMock.setItem(
                guest2DataKey,
                JSON.stringify({
                    guestId: guest2Id,
                    defaultWatchlist: [{ id: 200, title: 'Guest 2 Movie' }],
                    likedMovies: [{ id: 201, title: 'Guest 2 Liked' }],
                    hiddenMovies: [],
                    userCreatedWatchlists: [],
                })
            )

            localStorageMock.setItem(
                guest2HistoryKey,
                JSON.stringify([{ content: { id: 202, title: 'Guest 2 Watched' } }])
            )
        })

        it('should clear only the active guest data, not other guests', async () => {
            // Mock guest 1 session
            jest.spyOn(useSessionDataModule, 'useSessionData').mockReturnValue({
                sessionType: 'guest',
                activeSessionId: guest1Id,
                clearAllData: jest.fn(),
            } as ReturnType<typeof useSessionDataModule.useSessionData>)

            const { result } = renderHook(() => useUserData())

            await act(async () => {
                await result.current.clearAccountData()
            })

            // Guest 1 should be cleared
            const guest1DataKey = `nettrailer_guest_data_v2_${guest1Id}`
            const guest1HistoryKey = `nettrailer-watch-history_guest_${guest1Id}`
            const guest1Data = JSON.parse(localStorageMock.getItem(guest1DataKey)!)
            expect(guest1Data.defaultWatchlist).toEqual([])
            expect(localStorageMock.getItem(guest1HistoryKey)).toBeNull()

            // Guest 2 should be UNTOUCHED
            const guest2DataKey = `nettrailer_guest_data_v2_${guest2Id}`
            const guest2HistoryKey = `nettrailer-watch-history_guest_${guest2Id}`
            const guest2Data = JSON.parse(localStorageMock.getItem(guest2DataKey)!)
            expect(guest2Data.defaultWatchlist).toHaveLength(1)
            expect(guest2Data.likedMovies).toHaveLength(1)

            const guest2History = JSON.parse(localStorageMock.getItem(guest2HistoryKey)!)
            expect(guest2History).toHaveLength(1)
        })
    })

    describe('Error Handling', () => {
        const authUserId = 'test-auth-user-123'

        it('should handle Firestore errors without corrupting localStorage', async () => {
            // Setup guest data
            const guestId = 'guest_error_test'
            const guestDataKey = `nettrailer_guest_data_v2_${guestId}`
            localStorageMock.setItem(
                guestDataKey,
                JSON.stringify({
                    guestId,
                    defaultWatchlist: [{ id: 1, title: 'Safe Guest Data' }],
                })
            )

            // Mock Firestore to throw error
            mockSetDoc.mockRejectedValueOnce(new Error('Firestore write failed'))

            const { result } = renderHook(() => useUserData())

            // Attempt to clear (will throw)
            await expect(async () => {
                await act(async () => {
                    await result.current.clearAccountData()
                })
            }).rejects.toThrow()

            // Guest localStorage should remain untouched
            const guestData = JSON.parse(localStorageMock.getItem(guestDataKey)!)
            expect(guestData.defaultWatchlist).toHaveLength(1)
        })
    })
})

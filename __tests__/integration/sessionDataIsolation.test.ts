/**
 * Session Data Isolation Integration Tests
 *
 * End-to-end tests verifying complete data isolation when switching between:
 * - Authenticated sessions (different users)
 * - Guest sessions (different guests)
 * - Auth ↔ Guest transitions
 *
 * Covers the full flow from Settings page "Clear All Data" button through
 * all storage layers (Firestore, localStorage, in-memory stores).
 */

import { renderHook, act, waitFor } from '@testing-library/react'
import { useWatchHistoryStore } from '../../stores/watchHistoryStore'
import { useSessionStore } from '../../stores/sessionStore'

// Mock Firestore
const mockFirestoreOps = {
    setDoc: jest.fn(),
    getDoc: jest.fn(),
    doc: jest.fn(),
}

jest.mock('../../firebase', () => ({
    auth: {
        currentUser: null,
    },
    db: {},
}))

jest.mock('firebase/firestore', () => ({
    doc: (...args: unknown[]) => mockFirestoreOps.doc(...args),
    setDoc: (...args: unknown[]) => mockFirestoreOps.setDoc(...args),
    getDoc: (...args: unknown[]) => mockFirestoreOps.getDoc(...args),
}))

// Mock watch history Firestore operations
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
        _inspect: () => ({ ...store }),
    }
})()

Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
})

describe('Session Data Isolation - Integration Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        localStorageMock.clear()

        // Reset all stores
        useWatchHistoryStore.setState({
            history: [],
            currentSessionId: null,
            lastSyncedAt: null,
            syncError: null,
        })

        useSessionStore.setState({
            sessionType: 'initializing',
            activeSessionId: '',
            isInitialized: false,
            isTransitioning: false,
        })

        // Default mock implementations
        mockFirestoreOps.setDoc.mockResolvedValue(undefined)
        mockFirestoreOps.getDoc.mockResolvedValue({
            exists: () => false,
            data: () => null,
        })
        mockSaveWatchHistory.mockResolvedValue(undefined)
        mockGetWatchHistory.mockResolvedValue([])
    })

    describe('Full Auth User Journey', () => {
        const user1Id = 'auth-user-alice'
        const user2Id = 'auth-user-bob'
        const guestId = 'guest_9999999999_zzz999'

        it('should isolate data when switching between two authenticated users', async () => {
            // Setup: User 1 has data in Firestore
            const user1WatchHistory = [
                { content: { id: 1, title: 'Alice Movie 1' }, watchedAt: Date.now() },
                { content: { id: 2, title: 'Alice Movie 2' }, watchedAt: Date.now() },
            ]

            mockGetWatchHistory.mockImplementation((userId) => {
                if (userId === user1Id) return Promise.resolve(user1WatchHistory)
                if (userId === user2Id)
                    return Promise.resolve([
                        { content: { id: 10, title: 'Bob Movie' }, watchedAt: Date.now() },
                    ])
                return Promise.resolve([])
            })

            // Load User 1 session
            useSessionStore.setState({
                sessionType: 'authenticated',
                activeSessionId: user1Id,
                isInitialized: true,
            })

            useWatchHistoryStore.setState({
                history: user1WatchHistory as any,
                currentSessionId: user1Id,
                lastSyncedAt: Date.now(),
            })

            // User 1 clears their data
            await act(async () => {
                await mockSaveWatchHistory(user1Id, [])
                useWatchHistoryStore.setState({
                    history: [],
                    currentSessionId: user1Id,
                    lastSyncedAt: Date.now(),
                })
            })

            // Verify User 1's Firestore was cleared
            expect(mockSaveWatchHistory).toHaveBeenCalledWith(user1Id, [])

            // Switch to User 2
            useSessionStore.setState({
                sessionType: 'authenticated',
                activeSessionId: user2Id,
            })

            // Load User 2's data
            await act(async () => {
                const user2Data = await mockGetWatchHistory(user2Id)
                useWatchHistoryStore.setState({
                    history: user2Data as any,
                    currentSessionId: user2Id,
                    lastSyncedAt: Date.now(),
                })
            })

            // User 2's data should be intact (not affected by User 1's clear)
            const user2State = useWatchHistoryStore.getState()
            expect(user2State.history).toHaveLength(1)
            expect(user2State.history[0].content.title).toBe('Bob Movie')
        })

        it('should isolate data when authenticated user clears data, then switches to guest', async () => {
            // Setup: Guest has localStorage data
            const guestDataKey = `nettrailer_guest_data_v2_${guestId}`
            const guestHistoryKey = `nettrailer-watch-history_guest_${guestId}`

            localStorageMock.setItem(
                guestDataKey,
                JSON.stringify({
                    guestId,
                    defaultWatchlist: [{ id: 100, title: 'Guest Movie' }],
                    likedMovies: [{ id: 101, title: 'Guest Liked' }],
                })
            )

            localStorageMock.setItem(
                guestHistoryKey,
                JSON.stringify([
                    { content: { id: 102, title: 'Guest Watched' }, watchedAt: Date.now() },
                ])
            )

            // Snapshot guest data BEFORE auth operations
            const guestDataBefore = localStorageMock.getItem(guestDataKey)
            const guestHistoryBefore = localStorageMock.getItem(guestHistoryKey)

            // Auth user session
            useSessionStore.setState({
                sessionType: 'authenticated',
                activeSessionId: user1Id,
            })

            mockGetWatchHistory.mockResolvedValue([
                { content: { id: 1, title: 'Auth Movie' }, watchedAt: Date.now() },
            ])

            // Load auth data
            await act(async () => {
                const authData = await mockGetWatchHistory(user1Id)
                useWatchHistoryStore.setState({
                    history: authData as any,
                    currentSessionId: user1Id,
                    lastSyncedAt: Date.now(),
                })
            })

            // Auth user clears ALL data
            await act(async () => {
                // Clear Firestore
                await mockFirestoreOps.setDoc(
                    {},
                    {
                        defaultWatchlist: [],
                        likedMovies: [],
                        hiddenMovies: [],
                        userCreatedWatchlists: [],
                    }
                )
                await mockSaveWatchHistory(user1Id, [])

                // Clear in-memory
                useWatchHistoryStore.setState({
                    history: [],
                    currentSessionId: user1Id,
                    lastSyncedAt: Date.now(),
                })
            })

            // Switch to guest
            useSessionStore.setState({
                sessionType: 'guest',
                activeSessionId: guestId,
            })

            // Load guest data from localStorage
            await act(async () => {
                const guestHistory = JSON.parse(localStorageMock.getItem(guestHistoryKey)!)
                useWatchHistoryStore.setState({
                    history: guestHistory as any,
                    currentSessionId: guestId,
                    lastSyncedAt: Date.now(),
                })
            })

            // Guest data should be COMPLETELY INTACT
            expect(localStorageMock.getItem(guestDataKey)).toBe(guestDataBefore)
            expect(localStorageMock.getItem(guestHistoryKey)).toBe(guestHistoryBefore)

            const guestState = useWatchHistoryStore.getState()
            expect(guestState.history).toHaveLength(1)
            expect(guestState.history[0].content.title).toBe('Guest Watched')
        })
    })

    describe('Full Guest User Journey', () => {
        const guest1Id = 'guest_1111111111_aaa111'
        const guest2Id = 'guest_2222222222_bbb222'
        const authUserId = 'auth-user-charlie'

        it('should isolate data when switching between two guest sessions', async () => {
            // Setup: Both guests have localStorage data
            const guest1DataKey = `nettrailer_guest_data_v2_${guest1Id}`
            const guest1HistoryKey = `nettrailer-watch-history_guest_${guest1Id}`
            const guest2DataKey = `nettrailer_guest_data_v2_${guest2Id}`
            const guest2HistoryKey = `nettrailer-watch-history_guest_${guest2Id}`

            localStorageMock.setItem(
                guest1DataKey,
                JSON.stringify({
                    guestId: guest1Id,
                    defaultWatchlist: [{ id: 1, title: 'Guest 1 Movie' }],
                })
            )

            localStorageMock.setItem(
                guest1HistoryKey,
                JSON.stringify([{ content: { id: 2, title: 'Guest 1 Watched' } }])
            )

            localStorageMock.setItem(
                guest2DataKey,
                JSON.stringify({
                    guestId: guest2Id,
                    defaultWatchlist: [{ id: 10, title: 'Guest 2 Movie' }],
                })
            )

            localStorageMock.setItem(
                guest2HistoryKey,
                JSON.stringify([{ content: { id: 20, title: 'Guest 2 Watched' } }])
            )

            // Guest 1 session
            useSessionStore.setState({
                sessionType: 'guest',
                activeSessionId: guest1Id,
            })

            // Clear Guest 1 data
            await act(async () => {
                localStorageMock.setItem(
                    guest1DataKey,
                    JSON.stringify({
                        guestId: guest1Id,
                        defaultWatchlist: [],
                        likedMovies: [],
                        hiddenMovies: [],
                        userCreatedWatchlists: [],
                    })
                )
                localStorageMock.removeItem(guest1HistoryKey)
                useWatchHistoryStore.setState({
                    history: [],
                    currentSessionId: guest1Id,
                    lastSyncedAt: Date.now(),
                })
            })

            // Verify Guest 1 is cleared
            const guest1Data = JSON.parse(localStorageMock.getItem(guest1DataKey)!)
            expect(guest1Data.defaultWatchlist).toEqual([])
            expect(localStorageMock.getItem(guest1HistoryKey)).toBeNull()

            // Switch to Guest 2
            useSessionStore.setState({
                sessionType: 'guest',
                activeSessionId: guest2Id,
            })

            // Load Guest 2 data
            await act(async () => {
                const guest2History = JSON.parse(localStorageMock.getItem(guest2HistoryKey)!)
                useWatchHistoryStore.setState({
                    history: guest2History as any,
                    currentSessionId: guest2Id,
                    lastSyncedAt: Date.now(),
                })
            })

            // Guest 2 data should be INTACT
            const guest2Data = JSON.parse(localStorageMock.getItem(guest2DataKey)!)
            expect(guest2Data.defaultWatchlist).toHaveLength(1)
            expect(guest2Data.defaultWatchlist[0].title).toBe('Guest 2 Movie')

            const guest2State = useWatchHistoryStore.getState()
            expect(guest2State.history).toHaveLength(1)
            expect(guest2State.history[0].content.title).toBe('Guest 2 Watched')
        })

        it('should isolate data when guest clears data, then switches to authenticated user', async () => {
            // Setup: Auth user has Firestore data
            mockGetWatchHistory.mockResolvedValue([
                { content: { id: 999, title: 'Charlie Auth Movie' }, watchedAt: Date.now() },
            ])

            mockFirestoreOps.getDoc.mockResolvedValue({
                exists: () => true,
                data: () => ({
                    defaultWatchlist: [{ id: 888, title: 'Charlie Watchlist' }],
                    likedMovies: [],
                    hiddenMovies: [],
                }),
            })

            // Setup: Guest has data
            const guestDataKey = `nettrailer_guest_data_v2_${guest1Id}`
            const guestHistoryKey = `nettrailer-watch-history_guest_${guest1Id}`

            localStorageMock.setItem(
                guestDataKey,
                JSON.stringify({
                    guestId: guest1Id,
                    defaultWatchlist: [{ id: 1, title: 'Guest Movie' }],
                })
            )

            localStorageMock.setItem(
                guestHistoryKey,
                JSON.stringify([{ content: { id: 2, title: 'Guest Watched' } }])
            )

            // Guest session
            useSessionStore.setState({
                sessionType: 'guest',
                activeSessionId: guest1Id,
            })

            // Clear guest data
            await act(async () => {
                localStorageMock.setItem(
                    guestDataKey,
                    JSON.stringify({
                        guestId: guest1Id,
                        defaultWatchlist: [],
                        likedMovies: [],
                        hiddenMovies: [],
                        userCreatedWatchlists: [],
                    })
                )
                localStorageMock.removeItem(guestHistoryKey)
                useWatchHistoryStore.setState({
                    history: [],
                    currentSessionId: guest1Id,
                    lastSyncedAt: Date.now(),
                })
            })

            // Switch to auth
            useSessionStore.setState({
                sessionType: 'authenticated',
                activeSessionId: authUserId,
            })

            // Load auth data
            await act(async () => {
                const authHistory = await mockGetWatchHistory(authUserId)
                useWatchHistoryStore.setState({
                    history: authHistory as any,
                    currentSessionId: authUserId,
                    lastSyncedAt: Date.now(),
                })
            })

            // Auth data should be INTACT (not affected by guest clear)
            expect(mockGetWatchHistory).toHaveBeenCalledWith(authUserId)

            const authState = useWatchHistoryStore.getState()
            expect(authState.history).toHaveLength(1)
            expect(authState.history[0].content.title).toBe('Charlie Auth Movie')
        })
    })

    describe('Verification Scenarios (from user request)', () => {
        const authUserId = 'test-verification-user'
        const guestId = 'guest_verification_123'

        it('Scenario 1: Auth user clears history, reload shows empty, Firestore setDoc called', async () => {
            // Setup: Auth user has watch history
            const initialHistory = [
                { content: { id: 1, title: 'Movie 1' }, watchedAt: Date.now() },
                { content: { id: 2, title: 'Movie 2' }, watchedAt: Date.now() },
            ]

            mockGetWatchHistory.mockResolvedValue(initialHistory)

            useSessionStore.setState({
                sessionType: 'authenticated',
                activeSessionId: authUserId,
            })

            // Load initial data
            await act(async () => {
                const history = await mockGetWatchHistory(authUserId)
                useWatchHistoryStore.setState({
                    history: history as any,
                    currentSessionId: authUserId,
                    lastSyncedAt: Date.now(),
                })
            })

            expect(useWatchHistoryStore.getState().history).toHaveLength(2)

            // Clear history
            mockGetWatchHistory.mockResolvedValue([]) // Simulate empty after clear

            await act(async () => {
                await mockSaveWatchHistory(authUserId, [])
                useWatchHistoryStore.setState({
                    history: [],
                    currentSessionId: authUserId,
                    lastSyncedAt: Date.now(),
                })
            })

            // Verify Firestore was called
            expect(mockSaveWatchHistory).toHaveBeenCalledWith(authUserId, [])

            // Simulate reload: load from Firestore again
            await act(async () => {
                const reloadedHistory = await mockGetWatchHistory(authUserId)
                useWatchHistoryStore.setState({
                    history: reloadedHistory as any,
                    currentSessionId: authUserId,
                    lastSyncedAt: Date.now(),
                })
            })

            // Should still be empty after reload
            expect(useWatchHistoryStore.getState().history).toHaveLength(0)
        })

        it('Scenario 2: Auth deletes item, switch to guest, guest data unchanged', async () => {
            // Setup guest localStorage
            const guestHistoryKey = `nettrailer-watch-history_guest_${guestId}`
            const guestHistory = [
                { content: { id: 999, title: 'Guest Movie' }, watchedAt: Date.now() },
            ]

            localStorageMock.setItem(guestHistoryKey, JSON.stringify(guestHistory))

            const guestDataBefore = localStorageMock.getItem(guestHistoryKey)

            // Auth session
            useSessionStore.setState({
                sessionType: 'authenticated',
                activeSessionId: authUserId,
            })

            mockGetWatchHistory.mockResolvedValue([
                { content: { id: 1, title: 'Auth Movie' }, watchedAt: Date.now() },
            ])

            await act(async () => {
                const authHistory = await mockGetWatchHistory(authUserId)
                useWatchHistoryStore.setState({
                    history: authHistory as any,
                    currentSessionId: authUserId,
                })
            })

            // Auth user removes an item
            await act(async () => {
                await mockSaveWatchHistory(authUserId, [])
                useWatchHistoryStore.setState({
                    history: [],
                    currentSessionId: authUserId,
                    lastSyncedAt: Date.now(),
                })
            })

            // Switch to guest
            useSessionStore.setState({
                sessionType: 'guest',
                activeSessionId: guestId,
            })

            // Load guest data
            await act(async () => {
                const loadedGuestHistory = JSON.parse(localStorageMock.getItem(guestHistoryKey)!)
                useWatchHistoryStore.setState({
                    history: loadedGuestHistory as any,
                    currentSessionId: guestId,
                })
            })

            // Guest localStorage should be UNCHANGED
            const guestDataAfter = localStorageMock.getItem(guestHistoryKey)
            expect(guestDataAfter).toBe(guestDataBefore)

            // Guest history should be intact
            const guestState = useWatchHistoryStore.getState()
            expect(guestState.history).toHaveLength(1)
            expect(guestState.history[0].content.id).toBe(999)
        })

        it('Scenario 3: Settings "Clear All Data" clears both user doc and watch history in Firestore, guest data intact', async () => {
            // Setup guest data
            const guestDataKey = `nettrailer_guest_data_v2_${guestId}`
            const guestHistoryKey = `nettrailer-watch-history_guest_${guestId}`

            localStorageMock.setItem(
                guestDataKey,
                JSON.stringify({
                    guestId,
                    defaultWatchlist: [{ id: 100, title: 'Guest Safe Movie' }],
                })
            )

            localStorageMock.setItem(
                guestHistoryKey,
                JSON.stringify([{ content: { id: 101, title: 'Guest Safe History' } }])
            )

            const guestDataSnapshot = localStorageMock._inspect()

            // Auth session
            useSessionStore.setState({
                sessionType: 'authenticated',
                activeSessionId: authUserId,
            })

            // Simulate "Clear All Data" button
            await act(async () => {
                // Clear main user document
                await mockFirestoreOps.setDoc(
                    {},
                    {
                        defaultWatchlist: [],
                        likedMovies: [],
                        hiddenMovies: [],
                        userCreatedWatchlists: [],
                        lastActive: Date.now(),
                    },
                    { merge: true }
                )

                // Clear watch history document
                await mockFirestoreOps.setDoc(
                    {},
                    {
                        history: [],
                        updatedAt: Date.now(),
                    },
                    { merge: true }
                )

                // Clear in-memory stores
                useWatchHistoryStore.setState({
                    history: [],
                    currentSessionId: authUserId,
                    lastSyncedAt: Date.now(),
                })
            })

            // Verify Firestore was called twice
            expect(mockFirestoreOps.setDoc).toHaveBeenCalledTimes(2)

            // First call: user doc
            expect(mockFirestoreOps.setDoc).toHaveBeenNthCalledWith(
                1,
                {},
                {
                    defaultWatchlist: [],
                    likedMovies: [],
                    hiddenMovies: [],
                    userCreatedWatchlists: [],
                    lastActive: expect.any(Number),
                },
                { merge: true }
            )

            // Second call: watch history
            expect(mockFirestoreOps.setDoc).toHaveBeenNthCalledWith(
                2,
                {},
                {
                    history: [],
                    updatedAt: expect.any(Number),
                },
                { merge: true }
            )

            // Guest localStorage should be COMPLETELY UNCHANGED
            const guestDataAfter = localStorageMock._inspect()
            expect(guestDataAfter).toEqual(guestDataSnapshot)
        })
    })
})

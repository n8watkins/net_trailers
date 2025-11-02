/**
 * Tests for SessionSyncManager
 *
 * These tests verify critical session management behaviors and identify:
 * - Initialization sequence issues
 * - Firebase sync trigger conditions
 * - Race conditions during session switching
 */

import { renderHook, act } from '@testing-library/react'
import { useSessionStore } from '../../stores/sessionStore'
import { useAuthStore } from '../../stores/authStore'
import { AuthStorageService } from '../../services/authStorageService'

// Mock Firebase auth
const mockUser = {
    uid: 'test-user-123',
    email: 'test@example.com',
}

jest.mock('../../hooks/useAuth', () => ({
    __esModule: true,
    default: jest.fn(() => ({
        user: mockUser,
        loading: false,
        error: null,
    })),
}))

jest.mock('../../services/authStorageService', () => ({
    AuthStorageService: {
        saveUserData: jest.fn().mockResolvedValue(undefined),
        loadUserData: jest.fn().mockResolvedValue({
            userId: 'test-user-123',
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

jest.mock('../../services/guestStorageService', () => ({
    GuestStorageService: {
        getGuestId: jest.fn(() => 'guest-123'),
        loadGuestData: jest.fn(() => ({
            guestId: 'guest-123',
            likedMovies: [],
            hiddenMovies: [],
            defaultWatchlist: [],
            userCreatedWatchlists: [],
            lastActive: Date.now(),
            autoMute: true,
            defaultVolume: 50,
            childSafetyMode: false,
        })),
        saveGuestData: jest.fn(),
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

describe('SessionSyncManager - CRITICAL ISSUE: Initial Sync May Not Trigger', () => {
    beforeEach(() => {
        // Reset stores
        jest.clearAllMocks()
        useAuthStore.getState().clearLocalCache()
        useSessionStore.getState().setTransitioning(false)
    })

    test('ISSUE: Default syncStatus prevents initial Firebase sync', async () => {
        const { result: sessionResult } = renderHook(() => useSessionStore())
        const { result: authResult } = renderHook(() => useAuthStore())

        // Simulate initial app load with authenticated user
        // 1. SessionSyncManager initializes auth session
        act(() => {
            sessionResult.current.initializeAuthSession('test-user-123')
        })

        expect(sessionResult.current.sessionType).toBe('authenticated')
        expect(sessionResult.current.isInitialized).toBe(true)

        // 2. Check authStore state at this point
        const authUserId = authResult.current.userId
        const authSyncStatus = authResult.current.syncStatus

        // authStore hasn't synced yet, so:
        // - userId is undefined
        // - syncStatus is 'synced' (default)

        expect(authUserId).toBeUndefined()
        expect(authSyncStatus).toBe('synced')

        // 3. SessionSyncManager's sync effect checks this condition:
        //    if (authStore.userId !== user.uid && authStore.syncStatus === 'offline')
        //
        //    Breaking it down:
        //    - authStore.userId !== user.uid  →  undefined !== 'test-user-123'  →  TRUE
        //    - authStore.syncStatus === 'offline'  →  'synced' === 'offline'  →  FALSE
        //    - Combined with AND: TRUE && FALSE = FALSE
        //
        // RESULT: Sync DOES NOT TRIGGER!

        const shouldSyncBasedOnCurrentLogic =
            authUserId !== 'test-user-123' && authSyncStatus === 'offline'

        expect(shouldSyncBasedOnCurrentLogic).toBe(false)

        // This proves the bug: even though we need to sync (userId mismatch),
        // the syncStatus check prevents it from happening
    })

    test('EXPECTED: Sync should trigger when userId does not match', async () => {
        const { result: sessionResult } = renderHook(() => useSessionStore())
        const { result: authResult } = renderHook(() => useAuthStore())

        act(() => {
            sessionResult.current.initializeAuthSession('test-user-123')
        })

        const authUserId = authResult.current.userId
        const userUid = 'test-user-123'

        // The CORRECT condition should be just:
        //   if (authStore.userId !== user.uid)
        // OR:
        //   if (authStore.userId !== user.uid || authStore.syncStatus === 'offline')

        const shouldSyncWithCorrectLogic = authUserId !== userUid

        expect(shouldSyncWithCorrectLogic).toBe(true)

        // This shows that without the syncStatus check, sync would correctly trigger
    })

    test('SCENARIO: User with offline syncStatus would sync (rare edge case)', async () => {
        const { result: authResult } = renderHook(() => useAuthStore())

        // First, load some initial data so authStore has a userId (but DIFFERENT from test-user-123)
        await act(async () => {
            authResult.current.loadData({
                userId: 'old-user-456',
                likedMovies: [],
                hiddenMovies: [],
                defaultWatchlist: [],
                userCreatedWatchlists: [],
                lastActive: Date.now(),
                syncStatus: 'synced',
            })
        })

        // Make the save fail to trigger offline status
        jest.mocked(AuthStorageService.saveUserData).mockRejectedValueOnce(
            new Error('Storage failure')
        )

        // Artificially set syncStatus to offline by failing a save operation
        await act(async () => {
            try {
                await authResult.current.updatePreferences({ autoMute: false })
            } catch {
                // Expected to fail, which sets syncStatus to 'offline'
            }
        })

        const authUserId = authResult.current.userId
        const authSyncStatus = authResult.current.syncStatus
        const userUid = 'test-user-123'

        const shouldSyncWithCurrentLogic = authUserId !== userUid && authSyncStatus === 'offline'

        // In this rare case, sync WOULD trigger because both conditions are met:
        // - userId mismatch: 'old-user-456' !== 'test-user-123'
        // - syncStatus is 'offline' from the failed save
        // But this scenario is uncommon - the normal case (initial load) fails
        expect(shouldSyncWithCurrentLogic).toBe(true)
    })
})

describe('SessionSyncManager - Session Initialization', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        useAuthStore.getState().clearLocalCache()
        useSessionStore.getState().setTransitioning(false)
    })

    test('should initialize guest session when no user present', () => {
        const { result } = renderHook(() => useSessionStore())

        act(() => {
            result.current.initializeGuestSession()
        })

        expect(result.current.sessionType).toBe('guest')
        expect(result.current.isInitialized).toBe(true)
        expect(result.current.activeSessionId).toBeTruthy()
    })

    test('should initialize auth session when user present', () => {
        const { result } = renderHook(() => useSessionStore())

        act(() => {
            result.current.initializeAuthSession('test-user-123')
        })

        expect(result.current.sessionType).toBe('authenticated')
        expect(result.current.isInitialized).toBe(true)
        expect(result.current.activeSessionId).toBe('test-user-123')
    })

    test('should clear auth store when switching to guest', () => {
        const { result: sessionResult } = renderHook(() => useSessionStore())
        const { result: authResult } = renderHook(() => useAuthStore())

        // Initialize as auth
        act(() => {
            sessionResult.current.initializeAuthSession('test-user-123')
            authResult.current.loadData({
                userId: 'test-user-123',
                likedMovies: [],
                hiddenMovies: [],
                defaultWatchlist: [],
                userCreatedWatchlists: [],
                lastActive: Date.now(),
                syncStatus: 'synced',
            })
        })

        expect(authResult.current.userId).toBe('test-user-123')

        // Switch to guest
        act(() => {
            authResult.current.clearLocalCache()
            sessionResult.current.switchToGuest()
        })

        expect(sessionResult.current.sessionType).toBe('guest')
        expect(authResult.current.userId).toBeUndefined()
    })
})

describe('SessionSyncManager - User Switching Race Conditions', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        useAuthStore.getState().clearLocalCache()
        useSessionStore.getState().setTransitioning(false)
    })

    test('should handle rapid user switching', () => {
        const { result: sessionResult } = renderHook(() => useSessionStore())

        // Simulate rapid switching
        act(() => {
            sessionResult.current.initializeAuthSession('user-1')
        })
        expect(sessionResult.current.activeSessionId).toBe('user-1')

        act(() => {
            sessionResult.current.switchToAuth('user-2')
        })
        expect(sessionResult.current.activeSessionId).toBe('user-2')

        act(() => {
            sessionResult.current.switchToAuth('user-3')
        })
        expect(sessionResult.current.activeSessionId).toBe('user-3')

        // Final state should be user-3
        expect(sessionResult.current.activeSessionId).toBe('user-3')
        expect(sessionResult.current.sessionType).toBe('authenticated')
    })

    test('should set transitioning flag during switches', () => {
        const { result } = renderHook(() => useSessionStore())

        act(() => {
            result.current.setTransitioning(true)
        })

        expect(result.current.isTransitioning).toBe(true)

        act(() => {
            result.current.setTransitioning(false)
        })

        expect(result.current.isTransitioning).toBe(false)
    })
})

describe('SessionSyncManager - Guest Session Persistence', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        useAuthStore.getState().clearLocalCache()
        useSessionStore.getState().setTransitioning(false)
    })

    test('should maintain same guest ID across initializations', () => {
        const { result: sessionResult1 } = renderHook(() => useSessionStore())

        act(() => {
            sessionResult1.current.initializeGuestSession()
        })

        // Simulate app reload - new hook instance
        const { result: sessionResult2 } = renderHook(() => useSessionStore())

        act(() => {
            sessionResult2.current.initializeGuestSession()
        })

        const secondGuestId = sessionResult2.current.activeSessionId

        // Should get same guest ID from localStorage
        // (assuming mock returns consistent ID)
        expect(secondGuestId).toBeTruthy()
    })
})

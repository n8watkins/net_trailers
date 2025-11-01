/**
 * UserData Preferences Hydration Tests (Workstream A validation - A5)
 *
 * These tests verify that preferences hydrate correctly:
 * - Wait for session initialization before loading preferences
 * - Update preferences when store values change
 * - Don't get stuck on default values
 */

import { renderHook, act, waitFor } from '@testing-library/react'
import useUserData from '../../hooks/useUserData'
import { useSessionStore } from '../../stores/sessionStore'
import { useGuestStore } from '../../stores/guestStore'
import { useAuthStore } from '../../stores/authStore'

// Mock stores
jest.mock('../../stores/sessionStore')
jest.mock('../../stores/guestStore')
jest.mock('../../stores/authStore')

// Mock services
jest.mock('../../services/guestStorageService', () => ({
    GuestStorageService: {
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
    },
}))

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

jest.mock('../../utils/debugLogger', () => ({
    guestLog: jest.fn(),
    guestError: jest.fn(),
    authLog: jest.fn(),
    authError: jest.fn(),
    sessionLog: jest.fn(),
    sessionError: jest.fn(),
}))

describe('useUserData - Preference Hydration', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('should expose default preferences during initialization', () => {
        // Mock initializing state
        ;(useSessionStore as unknown as jest.Mock).mockReturnValue({
            sessionType: 'initializing',
            activeSessionId: '',
            isInitializing: true,
        })

        // Mock minimal guest store (used as default for initializing)
        ;(useGuestStore as unknown as jest.Mock).mockReturnValue({
            guestId: undefined,
            likedMovies: [],
            hiddenMovies: [],
            defaultWatchlist: [],
            userCreatedWatchlists: [],
            lastActive: 0,
            autoMute: true,
            defaultVolume: 50,
            childSafetyMode: false,
            addLikedMovie: jest.fn(),
            removeLikedMovie: jest.fn(),
            addHiddenMovie: jest.fn(),
            removeHiddenMovie: jest.fn(),
            addToWatchlist: jest.fn(),
            removeFromWatchlist: jest.fn(),
            isLiked: jest.fn(),
            isHidden: jest.fn(),
            isInWatchlist: jest.fn(),
            createList: jest.fn(),
            updateList: jest.fn(),
            deleteList: jest.fn(),
            addToList: jest.fn(),
            removeFromList: jest.fn(),
            updatePreferences: jest.fn(),
            clearAllData: jest.fn(),
            loadData: jest.fn(),
            syncFromLocalStorage: jest.fn(),
        })

        // Mock minimal auth store
        ;(useAuthStore as unknown as jest.Mock).mockReturnValue({
            userId: undefined,
            likedMovies: [],
            hiddenMovies: [],
            defaultWatchlist: [],
            userCreatedWatchlists: [],
            lastActive: 0,
            autoMute: true,
            defaultVolume: 50,
            childSafetyMode: false,
            addLikedMovie: jest.fn(),
            removeLikedMovie: jest.fn(),
            addHiddenMovie: jest.fn(),
            removeHiddenMovie: jest.fn(),
            addToWatchlist: jest.fn(),
            removeFromWatchlist: jest.fn(),
            isLiked: jest.fn(),
            isHidden: jest.fn(),
            isInWatchlist: jest.fn(),
            createList: jest.fn(),
            updateList: jest.fn(),
            deleteList: jest.fn(),
            addToList: jest.fn(),
            removeFromList: jest.fn(),
            updatePreferences: jest.fn(),
            clearLocalCache: jest.fn(),
            syncFromFirestore: jest.fn(),
        })

        const { result } = renderHook(() => useUserData())

        // Should have default preferences during initialization
        expect(result.current.isInitializing).toBe(true)
        expect(result.current.autoMute).toBe(true)
        expect(result.current.defaultVolume).toBe(50)
        expect(result.current.childSafetyMode).toBe(false)
    })

    it('should expose real preferences from guest store after hydration', async () => {
        // Mock guest session with custom preferences
        ;(useSessionStore as unknown as jest.Mock).mockReturnValue({
            sessionType: 'guest',
            activeSessionId: 'guest-123',
            isInitializing: false,
        })

        // Mock auth store (not used for guest, but needs to be defined)
        ;(useAuthStore as unknown as jest.Mock).mockReturnValue({
            userId: undefined,
            likedMovies: [],
            hiddenMovies: [],
            defaultWatchlist: [],
            userCreatedWatchlists: [],
            lastActive: 0,
            autoMute: true,
            defaultVolume: 50,
            childSafetyMode: false,
            addLikedMovie: jest.fn(),
            removeLikedMovie: jest.fn(),
            addHiddenMovie: jest.fn(),
            removeHiddenMovie: jest.fn(),
            addToWatchlist: jest.fn(),
            removeFromWatchlist: jest.fn(),
            isLiked: jest.fn(),
            isHidden: jest.fn(),
            isInWatchlist: jest.fn(),
            createList: jest.fn(),
            updateList: jest.fn(),
            deleteList: jest.fn(),
            addToList: jest.fn(),
            removeFromList: jest.fn(),
            updatePreferences: jest.fn(),
            clearLocalCache: jest.fn(),
            syncFromFirestore: jest.fn(),
        })
        ;(useGuestStore as unknown as jest.Mock).mockReturnValue({
            guestId: 'guest-123',
            likedMovies: [],
            hiddenMovies: [],
            defaultWatchlist: [],
            userCreatedWatchlists: [],
            lastActive: Date.now(),
            autoMute: false, // Custom value
            defaultVolume: 75, // Custom value
            childSafetyMode: false, // Always false for guests
            addLikedMovie: jest.fn(),
            removeLikedMovie: jest.fn(),
            addHiddenMovie: jest.fn(),
            removeHiddenMovie: jest.fn(),
            addToWatchlist: jest.fn(),
            removeFromWatchlist: jest.fn(),
            isLiked: jest.fn(),
            isHidden: jest.fn(),
            isInWatchlist: jest.fn(),
            createList: jest.fn(),
            updateList: jest.fn(),
            deleteList: jest.fn(),
            addToList: jest.fn(),
            removeFromList: jest.fn(),
            updatePreferences: jest.fn(),
            clearAllData: jest.fn(),
            loadData: jest.fn(),
            syncFromLocalStorage: jest.fn(),
        })

        const { result } = renderHook(() => useUserData())

        // Should expose real preferences from guest store
        expect(result.current.isInitializing).toBe(false)
        expect(result.current.isGuest).toBe(true)
        expect(result.current.autoMute).toBe(false) // Custom value
        expect(result.current.defaultVolume).toBe(75) // Custom value
        expect(result.current.childSafetyMode).toBe(false) // Always false for guests
    })

    it('should expose real preferences from auth store after hydration', async () => {
        // Mock authenticated session with custom preferences
        ;(useSessionStore as unknown as jest.Mock).mockReturnValue({
            sessionType: 'authenticated',
            activeSessionId: 'user-123',
            isInitializing: false,
        })
        ;(useAuthStore as unknown as jest.Mock).mockReturnValue({
            userId: 'user-123',
            likedMovies: [],
            hiddenMovies: [],
            defaultWatchlist: [],
            userCreatedWatchlists: [],
            lastActive: Date.now(),
            autoMute: false, // Custom value
            defaultVolume: 80, // Custom value
            childSafetyMode: true, // Custom value (allowed for auth users)
            addLikedMovie: jest.fn(),
            removeLikedMovie: jest.fn(),
            addHiddenMovie: jest.fn(),
            removeHiddenMovie: jest.fn(),
            addToWatchlist: jest.fn(),
            removeFromWatchlist: jest.fn(),
            isLiked: jest.fn(),
            isHidden: jest.fn(),
            isInWatchlist: jest.fn(),
            createList: jest.fn(),
            updateList: jest.fn(),
            deleteList: jest.fn(),
            addToList: jest.fn(),
            removeFromList: jest.fn(),
            updatePreferences: jest.fn(),
            clearLocalCache: jest.fn(),
            syncFromFirestore: jest.fn(),
        })

        const { result } = renderHook(() => useUserData())

        // Should expose real preferences from auth store
        expect(result.current.isInitializing).toBe(false)
        expect(result.current.isAuthenticated).toBe(true)
        expect(result.current.autoMute).toBe(false) // Custom value
        expect(result.current.defaultVolume).toBe(80) // Custom value
        expect(result.current.childSafetyMode).toBe(true) // Custom value (allowed for auth)
    })

    it('should not get stuck on default preferences after initialization', async () => {
        // Start with initializing state
        const sessionStoreMock = {
            sessionType: 'initializing' as const,
            activeSessionId: '',
            isInitializing: true,
        }
        ;(useSessionStore as unknown as jest.Mock).mockReturnValue(sessionStoreMock)

        const { result, rerender } = renderHook(() => useUserData())

        // Should have defaults during initialization
        expect(result.current.isInitializing).toBe(true)
        expect(result.current.autoMute).toBe(true)
        expect(result.current.defaultVolume).toBe(50)

        // Now simulate hydration completing with guest data
        sessionStoreMock.sessionType = 'guest'
        sessionStoreMock.activeSessionId = 'guest-123'
        sessionStoreMock.isInitializing = false
        ;(useGuestStore as unknown as jest.Mock).mockReturnValue({
            guestId: 'guest-123',
            likedMovies: [],
            hiddenMovies: [],
            defaultWatchlist: [],
            userCreatedWatchlists: [],
            lastActive: Date.now(),
            autoMute: false, // Different from default!
            defaultVolume: 90, // Different from default!
            childSafetyMode: false,
            addLikedMovie: jest.fn(),
            removeLikedMovie: jest.fn(),
            addHiddenMovie: jest.fn(),
            removeHiddenMovie: jest.fn(),
            addToWatchlist: jest.fn(),
            removeFromWatchlist: jest.fn(),
            isLiked: jest.fn(),
            isHidden: jest.fn(),
            isInWatchlist: jest.fn(),
            createList: jest.fn(),
            updateList: jest.fn(),
            deleteList: jest.fn(),
            addToList: jest.fn(),
            removeFromList: jest.fn(),
            updatePreferences: jest.fn(),
            clearAllData: jest.fn(),
            loadData: jest.fn(),
            syncFromLocalStorage: jest.fn(),
        })

        rerender()

        // CRITICAL: Should now show real preferences, not stuck on defaults
        await waitFor(() => {
            expect(result.current.isInitializing).toBe(false)
            expect(result.current.autoMute).toBe(false) // Should update to real value
            expect(result.current.defaultVolume).toBe(90) // Should update to real value
        })
    })
})

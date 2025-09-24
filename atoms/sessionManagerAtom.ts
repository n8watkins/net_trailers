import { atom, selector } from 'recoil'

// Session type enumeration
export type SessionType = 'guest' | 'authenticated' | 'initializing'

// Current session type state
export const sessionTypeState = atom<SessionType>({
    key: 'sessionTypeState_v1',
    default: 'initializing',
})

// Session initialization status
export const isSessionInitializedState = atom<boolean>({
    key: 'isSessionInitializedState_v1',
    default: false,
})

// Current active session ID (guest ID or user ID)
export const activeSessionIdState = atom<string>({
    key: 'activeSessionIdState_v1',
    default: '',
})

// Migration availability state (true if guest data exists when user authenticates)
export const migrationAvailableState = atom<boolean>({
    key: 'migrationAvailableState_v1',
    default: false,
})

// Session transition state (used to track when switching between sessions)
export const isTransitioningSessionState = atom<boolean>({
    key: 'isTransitioningSessionState_v1',
    default: false,
})

// Selector to determine if any session is active
export const hasActiveSessionSelector = selector({
    key: 'hasActiveSessionSelector_v1',
    get: ({ get }) => {
        const sessionType = get(sessionTypeState)
        const sessionId = get(activeSessionIdState)
        const isInitialized = get(isSessionInitializedState)

        return isInitialized && sessionType !== 'initializing' && sessionId !== ''
    },
})

// Selector to get current session info
export const currentSessionInfoSelector = selector({
    key: 'currentSessionInfoSelector_v1',
    get: ({ get }) => {
        const sessionType = get(sessionTypeState)
        const sessionId = get(activeSessionIdState)
        const isInitialized = get(isSessionInitializedState)
        const isTransitioning = get(isTransitioningSessionState)

        return {
            type: sessionType,
            id: sessionId,
            isInitialized,
            isTransitioning,
            isActive: isInitialized && sessionType !== 'initializing' && sessionId !== '',
        }
    },
})

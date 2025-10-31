/**
 * Compatibility shim for Recoil to Zustand migration
 * This provides a drop-in replacement for Recoil functionality using Zustand stores
 *
 * This file is aliased as 'recoil' in tsconfig.json, so imports from 'recoil'
 * actually use this file instead of the real Recoil library.
 */

import { useAppStore, MAX_TOASTS } from '../stores/appStore'
import { useSessionStore } from '../stores/sessionStore'
import { useSessionData } from '../hooks/useSessionData'
import type { ReactNode, ReactElement } from 'react'

// Atom placeholders for type checking
export const modalState = Symbol('modalState')
export const movieState = Symbol('movieState')
export const autoPlayWithSoundState = Symbol('autoPlayWithSoundState')
export const loadingState = Symbol('loadingState')
export const listModalState = Symbol('listModalState')
export const searchState = Symbol('searchState')
export const toastsState = Symbol('toastsState')
export const searchHistoryState = Symbol('searchHistoryState')
export const recentSearchesState = Symbol('recentSearchesState')
export const userSessionState = Symbol('userSessionState')
export const sessionTypeState = Symbol('sessionTypeState')
export const activeSessionIdState = Symbol('activeSessionIdState')
export const showDemoMessageState = Symbol('showDemoMessageState')
export const contentLoadedSuccessfullyState = Symbol('contentLoadedSuccessfullyState')

export const useRecoilState = (atom: any): [any, any] => {
    // Always call all hooks at the top level
    const appStore = useAppStore()
    const sessionStore = useSessionStore()
    const sessionData = useSessionData()

    const {
        modal,
        openModal,
        closeModal,
        listModal,
        openListModal,
        closeListModal,
        isLoading,
        setLoading,
        search,
        setSearch,
        toasts,
        showToast: _showToast,
        dismissToast: _dismissToast,
        addToSearchHistory,
        clearSearchHistory,
        setAutoPlayWithSound,
        showDemoMessage,
        setShowDemoMessage,
        contentLoadedSuccessfully,
        setContentLoadedSuccessfully,
    } = appStore

    const { sessionType, activeSessionId } = sessionStore

    // Modal state
    if (atom === modalState) {
        return [
            modal,
            (value: any) => {
                if (typeof value === 'boolean') {
                    if (value) {
                        openModal(modal.content?.content || ({} as any))
                    } else {
                        closeModal()
                    }
                } else if (typeof value === 'object' && value !== null) {
                    if (value.isOpen && value.content) {
                        openModal(
                            value.content.content,
                            value.content.autoPlay,
                            value.content.autoPlayWithSound
                        )
                    } else {
                        closeModal()
                    }
                }
            },
        ]
    }

    // Movie state (content in modal)
    if (atom === movieState) {
        return [
            modal.content?.content || null,
            (content: any) => {
                if (content) {
                    openModal(
                        content,
                        modal.content?.autoPlay || false,
                        modal.content?.autoPlayWithSound || false
                    )
                } else {
                    closeModal()
                }
            },
        ]
    }

    // AutoPlay with sound state
    if (atom === autoPlayWithSoundState) {
        return [modal.content?.autoPlayWithSound || false, setAutoPlayWithSound]
    }

    // Loading state
    if (atom === loadingState) {
        return [isLoading, (value: boolean) => setLoading(value)]
    }

    // List modal state
    if (atom === listModalState) {
        return [
            listModal,
            (value: any) => {
                if (typeof value === 'boolean') {
                    if (value) {
                        openListModal(listModal.content || undefined)
                    } else {
                        closeListModal()
                    }
                } else if (typeof value === 'object' && value !== null) {
                    if (value.isOpen) {
                        openListModal(value.content || undefined, value.mode)
                    } else {
                        closeListModal()
                    }
                }
            },
        ]
    }

    // Search state
    if (atom === searchState) {
        return [
            search,
            (value: any) => {
                if (typeof value === 'function') {
                    setSearch(value)
                } else {
                    setSearch(() => value)
                }
            },
        ]
    }

    // Toasts state
    if (atom === toastsState) {
        return [
            toasts,
            (value: any) => {
                // Handle functional updates from useToast
                if (typeof value === 'function') {
                    const newToasts = value(toasts)
                    // Apply max limit and update the appStore toasts array
                    useAppStore.setState({ toasts: newToasts.slice(-MAX_TOASTS) })
                } else if (Array.isArray(value)) {
                    // Direct array replacement with limit
                    useAppStore.setState({ toasts: value.slice(-MAX_TOASTS) })
                }
            },
        ]
    }

    // Search history state
    if (atom === searchHistoryState) {
        return [
            search.history,
            (value: any) => {
                if (Array.isArray(value) && value.length === 0) {
                    clearSearchHistory()
                } else if (Array.isArray(value)) {
                    // Add new items to history
                    value.forEach((item) => {
                        if (!search.history.includes(item)) {
                            addToSearchHistory(item)
                        }
                    })
                }
            },
        ]
    }

    // Recent searches state
    if (atom === recentSearchesState) {
        return [
            search.recentSearches,
            () => {
                console.warn(
                    'Direct recent searches setting not supported - use addToSearchHistory'
                )
            },
        ]
    }

    // User session state (deprecated - use sessionStore)
    if (atom === userSessionState) {
        return [
            {
                isGuest: sessionType === 'guest',
                guestId: sessionType === 'guest' ? activeSessionId : undefined,
                userId: sessionType === 'authenticated' ? activeSessionId : undefined,
                preferences: {
                    defaultWatchlist: sessionData.defaultWatchlist,
                    likedMovies: sessionData.likedMovies,
                    hiddenMovies: sessionData.hiddenMovies,
                    userCreatedWatchlists: sessionData.userCreatedWatchlists,
                    lastActive: sessionData.lastActive,
                    autoMute: sessionData.autoMute,
                    defaultVolume: sessionData.defaultVolume,
                    childSafetyMode: sessionData.childSafetyMode,
                },
                isActive: sessionData.isInitialized,
                lastSyncedAt: Date.now(),
                createdAt: Date.now(),
            },
            () => {
                console.warn('Direct user session setting not supported - use sessionStore actions')
            },
        ]
    }

    // Session type state
    if (atom === sessionTypeState) {
        return [
            sessionType,
            () => {
                console.warn('Session type is read-only in compatibility layer')
            },
        ]
    }

    // Active session ID state
    if (atom === activeSessionIdState) {
        return [
            activeSessionId,
            () => {
                console.warn('Active session ID is read-only in compatibility layer')
            },
        ]
    }

    // Show demo message state
    if (atom === showDemoMessageState) {
        return [showDemoMessage, (value: boolean) => setShowDemoMessage(value)]
    }

    // Content loaded successfully state
    if (atom === contentLoadedSuccessfullyState) {
        return [contentLoadedSuccessfully, (value: boolean) => setContentLoadedSuccessfully(value)]
    }

    // Unmapped atom
    throw new Error(`Unmapped atom in compatibility shim: ${atom?.toString()}`)
}

export const useRecoilValue = (atom: any): any => {
    const [value] = useRecoilState(atom)
    return value
}

export const useSetRecoilState = (atom: any): any => {
    const [, setValue] = useRecoilState(atom)
    return setValue
}

// Recoil callback compatibility
export const useRecoilCallback = (callback: any) => {
    return callback
}

// Atom effects compatibility for localStorage
export const useRecoilStateLoadable = (atom: any) => {
    const [value, setValue] = useRecoilState(atom)
    return {
        state: 'hasValue',
        contents: value,
        getValue: () => value,
        toPromise: () => Promise.resolve(value),
        valueMaybe: () => value,
        valueOrThrow: () => value,
        errorMaybe: () => undefined,
        errorOrThrow: () => {
            throw new Error('No error')
        },
        is: (other: any) => other === 'hasValue',
    }
}

// Cache for created symbols to ensure consistency
const symbolCache = new Map<string, symbol>()

// Stub for atom() - returns a unique symbol
export function atom<T>(config: { key: string; default: T; effects?: any[] }): symbol {
    // For known atoms, return their symbol from this file
    const keyMap: Record<string, symbol> = {
        modalState_v2: modalState,
        modalState: modalState,
        movieState_v2: movieState,
        movieState: movieState,
        autoPlayWithSoundState_v2: autoPlayWithSoundState,
        autoPlayWithSoundState: autoPlayWithSoundState,
        loadingState_v2: loadingState,
        loadingState: loadingState,
        listModalState_v1: listModalState,
        listModalState: listModalState,
        searchState_v4: searchState,
        searchState: searchState,
        toastsState_v2: toastsState,
        toastsState: toastsState,
        searchHistoryState_v2: searchHistoryState,
        searchHistoryState: searchHistoryState,
        recentSearchesState_v2: recentSearchesState,
        recentSearchesState: recentSearchesState,
        userSessionState_v2: userSessionState,
        userSessionState: userSessionState,
        sessionTypeState_v1: sessionTypeState,
        sessionTypeState: sessionTypeState,
        activeSessionIdState_v1: activeSessionIdState,
        activeSessionIdState: activeSessionIdState,
        showDemoMessageState_v2: showDemoMessageState,
        showDemoMessageState: showDemoMessageState,
        contentLoadedSuccessfullyState_v2: contentLoadedSuccessfullyState,
        contentLoadedSuccessfullyState: contentLoadedSuccessfullyState,
    }

    // Return mapped symbol if it exists
    if (keyMap[config.key]) {
        return keyMap[config.key]
    }

    // For unmapped atoms, create and cache a unique symbol
    if (!symbolCache.has(config.key)) {
        symbolCache.set(config.key, Symbol(config.key))
    }
    return symbolCache.get(config.key)!
}

// Stub for selector() - not actively used
export function selector<T>(config: { key: string; get: any }): symbol {
    return Symbol(config.key)
}

// SetterOrUpdater type (used in sessionManagerService.ts)
export type SetterOrUpdater<T> = (valOrUpdater: ((currVal: T) => T) | T) => void

// RecoilRoot stub - just renders children since we're using Zustand
export function RecoilRoot({ children }: { children: ReactNode }): ReactElement {
    return children as ReactElement
}

// Default export for compatibility
export default {
    atom,
    selector,
    useRecoilState,
    useRecoilValue,
    useSetRecoilState,
    useRecoilCallback,
    RecoilRoot,
}

/**
 * Compatibility shim for Recoil to Zustand migration
 * This provides a temporary bridge to get the app working while migration continues
 */

import { useAppStore } from '../stores/appStore'
import { useSessionStore } from '../stores/sessionStore'
import { useSessionData } from '../hooks/useSessionData'
import { useEffect, useRef } from 'react'

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

export const useRecoilState = (atom: any) => {
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
        showToast,
        dismissToast,
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
                    value ? openModal(modal.content?.content || ({} as any)) : closeModal()
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
                    value ? openListModal(listModal.content || undefined) : closeListModal()
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
                // Handle toast array updates
                if (Array.isArray(value)) {
                    // Clear existing and add new toasts
                    // This is a simplified approach - in reality we'd need better logic
                    console.warn(
                        'Direct toast array setting not fully supported in compatibility layer'
                    )
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

export const useRecoilValue = (atom: any) => {
    const [value] = useRecoilState(atom)
    return value
}

export const useSetRecoilState = (atom: any) => {
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

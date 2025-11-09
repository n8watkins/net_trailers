import { useState, useEffect } from 'react'
import { useAppStore, AppStore } from '../stores/appStore'

/**
 * Default state values that match server-side rendering
 * These values must be the same as the initial state in appStore.ts
 */
const defaultState: AppStore = {
    // Modal state
    modal: {
        isOpen: false,
        content: null,
    },

    // List modal state
    listModal: {
        isOpen: false,
        content: null,
        mode: undefined,
    },

    // Custom row modal state
    customRowModal: {
        isOpen: false,
        editingRowId: null,
        mode: 'create',
    },

    // Auth modal state
    authModal: {
        isOpen: false,
        mode: 'signin',
    },

    // Row editor modal state
    rowEditorModal: {
        isOpen: false,
        pageType: 'home',
    },

    // Collection creator modal state
    collectionCreatorModal: {
        isOpen: false,
        name: '',
        content: [],
        mediaType: 'all',
    },

    // Toast notifications
    toasts: [],

    // Global loading state
    isLoading: false,
    loadingMessage: undefined,

    // Auth mode
    authMode: 'login',
    showDemoMessage: true,
    contentLoadedSuccessfully: false,

    // Actions - return no-op functions during SSR
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    openModal: () => {},
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    closeModal: () => {},
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    setAutoPlay: () => {},
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    setAutoPlayWithSound: () => {},
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    openListModal: () => {},
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    closeListModal: () => {},
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    setListModalMode: () => {},
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    openCustomRowModal: () => {},
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    closeCustomRowModal: () => {},
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    showToast: () => {},
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    dismissToast: () => {},
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    setLoading: () => {},
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    setAuthMode: () => {},
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    setShowDemoMessage: () => {},
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    setContentLoadedSuccessfully: () => {},
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    openAuthModal: () => {},
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    closeAuthModal: () => {},
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    setAuthModalMode: () => {},
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    openRowEditorModal: () => {},
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    closeRowEditorModal: () => {},
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    openCollectionCreatorModal: () => {},
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    closeCollectionCreatorModal: () => {},
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    setCollectionCreatorName: () => {},
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    addToCollectionCreator: () => {},
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    removeFromCollectionCreator: () => {},
}

/**
 * Hydration-safe wrapper for useAppStore
 * Returns default values during SSR and actual store values after hydration
 */
export function useAppStoreHydrated<T = AppStore>(selector?: (state: AppStore) => T): T {
    const [isHydrated, setIsHydrated] = useState(false)

    // Always call the store hook to satisfy React's rules
    // We pass a selector that returns the whole state if no selector is provided
    const storeValue = useAppStore((state) => {
        if (selector) {
            return selector(state)
        }
        return state as unknown as T
    })

    useEffect(() => {
        setIsHydrated(true)
    }, [])

    // During SSR and initial hydration, return default values
    if (!isHydrated) {
        if (selector) {
            return selector(defaultState)
        }
        return defaultState as T
    }

    // After hydration, return the actual store value
    return storeValue
}

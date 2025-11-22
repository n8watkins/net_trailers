/**
 * DEPRECATED: This file is being phased out.
 *
 * appStore has been split into focused stores for better performance:
 * - modalStore - All modal state and actions
 * - toastStore - Toast notifications
 * - loadingStore - Global loading state
 * - uiStore - Misc UI state (auth mode, demo message, etc.)
 *
 * MIGRATION GUIDE:
 * ================
 *
 * OLD (causes unnecessary re-renders):
 * ```tsx
 * import { useAppStore } from '@/stores/appStore'
 * const { showToast } = useAppStore() // ❌ Re-renders when modal opens
 * ```
 *
 * NEW (only re-renders when toast state changes):
 * ```tsx
 * import { useToastStore } from '@/stores/toastStore'
 * const { showToast } = useToastStore() // ✅ Only subscribes to toast state
 * ```
 *
 * BACKWARDS COMPATIBILITY:
 * This file re-exports everything from the new stores, so existing code
 * will continue to work. However, you should migrate to the new stores
 * for better performance.
 */

// Re-export types
export type {
    ModalContent,
    ModalState,
    ListModalState,
    CollectionModalState,
    AuthModalState,
    RowEditorModalState,
    CollectionCreatorModalState,
} from './modalStore'

export type { ToastType, ToastMessage } from './toastStore'

export { MAX_TOASTS, TOAST_DURATION, TOAST_EXIT_DURATION } from './toastStore'

// Create combined store for backwards compatibility
import { useModalStore } from './modalStore'
import { useToastStore } from './toastStore'
import { useLoadingStore } from './loadingStore'
import { useUIStore } from './uiStore'

import { create } from 'zustand'
import type { ModalStore } from './modalStore'
import type { ToastStore } from './toastStore'
import type { LoadingStore } from './loadingStore'
import type { UIStore } from './uiStore'

// Combined store state
export interface AppState {
    // Modal state
    modal: ModalStore['modal']
    listModal: ModalStore['listModal']
    collectionModal: ModalStore['collectionModal']
    authModal: ModalStore['authModal']
    rowEditorModal: ModalStore['rowEditorModal']
    collectionCreatorModal: ModalStore['collectionCreatorModal']

    // Toast state
    toasts: ToastStore['toasts']

    // Loading state
    isLoading: LoadingStore['isLoading']
    loadingMessage: LoadingStore['loadingMessage']

    // UI state
    authMode: UIStore['authMode']
    showDemoMessage: UIStore['showDemoMessage']
    contentLoadedSuccessfully: UIStore['contentLoadedSuccessfully']
}

// Combined store actions
export interface AppActions {
    // Modal actions
    openModal: ModalStore['openModal']
    closeModal: ModalStore['closeModal']
    setAutoPlay: ModalStore['setAutoPlay']
    setAutoPlayWithSound: ModalStore['setAutoPlayWithSound']
    openListModal: ModalStore['openListModal']
    closeListModal: ModalStore['closeListModal']
    setListModalMode: ModalStore['setListModalMode']
    openCollectionModal: ModalStore['openCollectionModal']
    closeCollectionModal: ModalStore['closeCollectionModal']
    openAuthModal: ModalStore['openAuthModal']
    closeAuthModal: ModalStore['closeAuthModal']
    setAuthModalMode: ModalStore['setAuthModalMode']
    openRowEditorModal: ModalStore['openRowEditorModal']
    closeRowEditorModal: ModalStore['closeRowEditorModal']
    openCollectionCreatorModal: ModalStore['openCollectionCreatorModal']
    closeCollectionCreatorModal: ModalStore['closeCollectionCreatorModal']
    setCollectionCreatorName: ModalStore['setCollectionCreatorName']
    addToCollectionCreator: ModalStore['addToCollectionCreator']
    removeFromCollectionCreator: ModalStore['removeFromCollectionCreator']

    // Toast actions
    showToast: ToastStore['showToast']
    dismissToast: ToastStore['dismissToast']

    // Loading actions
    setLoading: LoadingStore['setLoading']

    // UI actions
    setAuthMode: UIStore['setAuthMode']
    setShowDemoMessage: UIStore['setShowDemoMessage']
    setContentLoadedSuccessfully: UIStore['setContentLoadedSuccessfully']
}

export type AppStore = AppState & AppActions

/**
 * @deprecated Use individual stores instead: useModalStore, useToastStore, useLoadingStore, useUIStore
 *
 * This combined store is provided for backwards compatibility but subscribes to
 * all sub-stores, causing unnecessary re-renders. Migrate to the individual stores
 * for better performance.
 *
 * MIGRATION EXAMPLE:
 * ```tsx
 * // OLD (re-renders on ANY state change):
 * const { showToast } = useAppStore()
 *
 * // NEW (only re-renders on toast changes):
 * const { showToast } = useToastStore()
 * ```
 */
export const useAppStore = create<AppStore>((set, get) => {
    // Subscribe to all sub-stores and merge their state
    useModalStore.subscribe((modalState) => {
        set({
            modal: modalState.modal,
            listModal: modalState.listModal,
            collectionModal: modalState.collectionModal,
            authModal: modalState.authModal,
            rowEditorModal: modalState.rowEditorModal,
            collectionCreatorModal: modalState.collectionCreatorModal,
        })
    })

    useToastStore.subscribe((toastState) => {
        set({ toasts: toastState.toasts })
    })

    useLoadingStore.subscribe((loadingState) => {
        set({
            isLoading: loadingState.isLoading,
            loadingMessage: loadingState.loadingMessage,
        })
    })

    useUIStore.subscribe((uiState) => {
        set({
            authMode: uiState.authMode,
            showDemoMessage: uiState.showDemoMessage,
            contentLoadedSuccessfully: uiState.contentLoadedSuccessfully,
        })
    })

    // Get initial state from all stores
    const modalState = useModalStore.getState()
    const toastState = useToastStore.getState()
    const loadingState = useLoadingStore.getState()
    const uiState = useUIStore.getState()

    return {
        // Initial state from all stores
        modal: modalState.modal,
        listModal: modalState.listModal,
        collectionModal: modalState.collectionModal,
        authModal: modalState.authModal,
        rowEditorModal: modalState.rowEditorModal,
        collectionCreatorModal: modalState.collectionCreatorModal,
        toasts: toastState.toasts,
        isLoading: loadingState.isLoading,
        loadingMessage: loadingState.loadingMessage,
        authMode: uiState.authMode,
        showDemoMessage: uiState.showDemoMessage,
        contentLoadedSuccessfully: uiState.contentLoadedSuccessfully,

        // Forward all actions to the appropriate sub-stores
        openModal: modalState.openModal,
        closeModal: modalState.closeModal,
        setAutoPlay: modalState.setAutoPlay,
        setAutoPlayWithSound: modalState.setAutoPlayWithSound,
        openListModal: modalState.openListModal,
        closeListModal: modalState.closeListModal,
        setListModalMode: modalState.setListModalMode,
        openCollectionModal: modalState.openCollectionModal,
        closeCollectionModal: modalState.closeCollectionModal,
        openAuthModal: modalState.openAuthModal,
        closeAuthModal: modalState.closeAuthModal,
        setAuthModalMode: modalState.setAuthModalMode,
        openRowEditorModal: modalState.openRowEditorModal,
        closeRowEditorModal: modalState.closeRowEditorModal,
        openCollectionCreatorModal: modalState.openCollectionCreatorModal,
        closeCollectionCreatorModal: modalState.closeCollectionCreatorModal,
        setCollectionCreatorName: modalState.setCollectionCreatorName,
        addToCollectionCreator: modalState.addToCollectionCreator,
        removeFromCollectionCreator: modalState.removeFromCollectionCreator,
        showToast: toastState.showToast,
        dismissToast: toastState.dismissToast,
        setLoading: loadingState.setLoading,
        setAuthMode: uiState.setAuthMode,
        setShowDemoMessage: uiState.setShowDemoMessage,
        setContentLoadedSuccessfully: uiState.setContentLoadedSuccessfully,
    }
})

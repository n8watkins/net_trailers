import { create } from 'zustand'
import { Content, getTitle } from '../typings'
import { startTransition } from 'react'
import { uiLog } from '../utils/debugLogger'

// Modal types
export interface ModalContent {
    content: Content
    autoPlay: boolean
    autoPlayWithSound: boolean
}

export interface ModalState {
    isOpen: boolean
    content: ModalContent | null
}

// List modal state
export interface ListModalState {
    isOpen: boolean
    content: Content | null
    mode?: 'manage' | 'create' | 'add'
}

// Custom row modal state
export interface CustomRowModalState {
    isOpen: boolean
    editingRowId: string | null
    mode: 'create' | 'edit'
}

// Auth modal state
export interface AuthModalState {
    isOpen: boolean
    mode: 'signin' | 'signup'
}

// Row editor modal state
export interface RowEditorModalState {
    isOpen: boolean
    pageType: 'home' | 'movies' | 'tv'
}

// Collection creator modal state
export interface CollectionCreatorModalState {
    isOpen: boolean
    name: string
    content: Content[]
    mediaType: 'movie' | 'tv' | 'all'
}

// Collection mode selection modal state
export interface CollectionModeSelectionModalState {
    isOpen: boolean
}

// Collection builder modal state
export interface CollectionBuilderModalState {
    isOpen: boolean
}

// Modal store state interface
export interface ModalStoreState {
    // Content modal (main video player modal)
    modal: ModalState

    // List management modal
    listModal: ListModalState

    // Custom row creation/editing modal
    customRowModal: CustomRowModalState

    // Authentication modal
    authModal: AuthModalState

    // Row editor modal (for home/movies/tv pages)
    rowEditorModal: RowEditorModalState

    // Collection creator modal
    collectionCreatorModal: CollectionCreatorModalState

    // Collection mode selection modal
    collectionModeSelectionModal: CollectionModeSelectionModalState

    // Collection builder modal
    collectionBuilderModal: CollectionBuilderModalState
}

// Modal store actions interface
export interface ModalStoreActions {
    // Content modal actions
    openModal: (content: Content, autoPlay?: boolean, autoPlayWithSound?: boolean) => void
    closeModal: () => void
    setAutoPlay: (autoPlay: boolean) => void
    setAutoPlayWithSound: (autoPlayWithSound: boolean) => void

    // List modal actions
    openListModal: (content?: Content, mode?: 'manage' | 'create' | 'add') => void
    closeListModal: () => void
    setListModalMode: (mode: 'manage' | 'create' | 'add') => void

    // Custom row modal actions
    openCustomRowModal: (mode: 'create' | 'edit', editingRowId?: string) => void
    closeCustomRowModal: () => void

    // Auth modal actions
    openAuthModal: (mode?: 'signin' | 'signup') => void
    closeAuthModal: () => void
    setAuthModalMode: (mode: 'signin' | 'signup') => void

    // Row editor modal actions
    openRowEditorModal: (pageType: 'home' | 'movies' | 'tv') => void
    closeRowEditorModal: () => void

    // Collection creator modal actions
    openCollectionCreatorModal: (
        name: string,
        content: Content[],
        mediaType: 'movie' | 'tv' | 'all'
    ) => void
    closeCollectionCreatorModal: () => void
    setCollectionCreatorName: (name: string) => void
    addToCollectionCreator: (content: Content) => void
    removeFromCollectionCreator: (contentId: number) => void

    // Collection mode selection modal actions
    openCollectionModeSelectionModal: () => void
    closeCollectionModeSelectionModal: () => void

    // Collection builder modal actions
    openCollectionBuilderModal: () => void
    closeCollectionBuilderModal: () => void
}

export type ModalStore = ModalStoreState & ModalStoreActions

export const useModalStore = create<ModalStore>((set, get) => ({
    // Initial state
    modal: {
        isOpen: false,
        content: null,
    },

    listModal: {
        isOpen: false,
        content: null,
        mode: undefined,
    },

    customRowModal: {
        isOpen: false,
        editingRowId: null,
        mode: 'create',
    },

    authModal: {
        isOpen: false,
        mode: 'signin',
    },

    rowEditorModal: {
        isOpen: false,
        pageType: 'home',
    },

    collectionCreatorModal: {
        isOpen: false,
        name: '',
        content: [],
        mediaType: 'all',
    },

    collectionModeSelectionModal: {
        isOpen: false,
    },

    collectionBuilderModal: {
        isOpen: false,
    },

    // Content Modal Actions
    /**
     * Open the content modal with video player
     *
     * @param content - The movie or TV show to display
     * @param autoPlay - Whether to start playing the trailer automatically (default: false)
     * @param autoPlayWithSound - Whether to play with sound initially (default: false)
     *
     * @example
     * ```tsx
     * const { openModal } = useModalStore()
     *
     * // Open modal with autoplay muted (More Info button)
     * openModal(movie, true, false)
     *
     * // Open modal with autoplay and sound (Play button)
     * openModal(movie, true, true)
     * ```
     */
    openModal: (content: Content, autoPlay = false, autoPlayWithSound = false) => {
        startTransition(() => {
            set({
                modal: {
                    isOpen: true,
                    content: {
                        content,
                        autoPlay,
                        autoPlayWithSound,
                    },
                },
            })
            uiLog('🎬 [ModalStore] Modal opened:', getTitle(content))
        })
    },

    /**
     * Close the content modal
     */
    closeModal: () => {
        startTransition(() => {
            set({
                modal: {
                    isOpen: false,
                    content: null,
                },
            })
            uiLog('❌ [ModalStore] Modal closed')
        })
    },

    setAutoPlay: (autoPlay: boolean) => {
        const state = get()
        if (state.modal.content) {
            set({
                modal: {
                    ...state.modal,
                    content: {
                        ...state.modal.content,
                        autoPlay,
                    },
                },
            })
        }
    },

    setAutoPlayWithSound: (autoPlayWithSound: boolean) => {
        const state = get()
        if (state.modal.content) {
            set({
                modal: {
                    ...state.modal,
                    content: {
                        ...state.modal.content,
                        autoPlayWithSound,
                    },
                },
            })
        }
    },

    // List Modal Actions
    openListModal: (content?: Content, mode?: 'manage' | 'create' | 'add') => {
        startTransition(() => {
            set({
                listModal: {
                    isOpen: true,
                    content: content || null,
                    mode: mode || 'add',
                },
            })
            uiLog('📋 [ModalStore] List modal opened:', {
                contentTitle: content ? getTitle(content) : 'No content',
                mode: mode || 'add',
            })
        })
    },

    closeListModal: () => {
        startTransition(() => {
            set({
                listModal: {
                    isOpen: false,
                    content: null,
                    mode: undefined,
                },
            })
            uiLog('❌ [ModalStore] List modal closed')
        })
    },

    setListModalMode: (mode: 'manage' | 'create' | 'add') => {
        set((state) => ({
            listModal: {
                ...state.listModal,
                mode,
            },
        }))
    },

    // Custom Row Modal Actions
    openCustomRowModal: (mode: 'create' | 'edit' = 'create', editingRowId?: string) => {
        startTransition(() => {
            set({
                customRowModal: {
                    isOpen: true,
                    mode,
                    editingRowId: editingRowId || null,
                },
            })
            uiLog('📊 [ModalStore] Custom row modal opened:', {
                mode,
                editingRowId: editingRowId || 'none',
            })
        })
    },

    closeCustomRowModal: () => {
        startTransition(() => {
            set({
                customRowModal: {
                    isOpen: false,
                    mode: 'create',
                    editingRowId: null,
                },
            })
            uiLog('❌ [ModalStore] Custom row modal closed')
        })
    },

    // Auth Modal Actions
    openAuthModal: (mode: 'signin' | 'signup' = 'signin') => {
        startTransition(() => {
            set({
                authModal: {
                    isOpen: true,
                    mode,
                },
            })
            uiLog('✅ [ModalStore] Auth modal opened:', mode)
        })
    },

    closeAuthModal: () => {
        startTransition(() => {
            set({
                authModal: {
                    isOpen: false,
                    mode: 'signin',
                },
            })
            uiLog('❌ [ModalStore] Auth modal closed')
        })
    },

    setAuthModalMode: (mode: 'signin' | 'signup') => {
        set((state) => ({
            authModal: {
                ...state.authModal,
                mode,
            },
        }))
    },

    // Row Editor Modal Actions
    openRowEditorModal: (pageType: 'home' | 'movies' | 'tv') => {
        startTransition(() => {
            set({
                rowEditorModal: {
                    isOpen: true,
                    pageType,
                },
            })
            uiLog('📊 [ModalStore] Row editor modal opened:', pageType)
        })
    },

    closeRowEditorModal: () => {
        startTransition(() => {
            set({
                rowEditorModal: {
                    isOpen: false,
                    pageType: 'home',
                },
            })
            uiLog('❌ [ModalStore] Row editor modal closed')
        })
    },

    // Collection Creator Modal Actions
    openCollectionCreatorModal: (
        name: string,
        content: Content[],
        mediaType: 'movie' | 'tv' | 'all'
    ) => {
        startTransition(() => {
            set({
                collectionCreatorModal: {
                    isOpen: true,
                    name,
                    content,
                    mediaType,
                },
            })
            uiLog('📋 [ModalStore] Collection creator modal opened:', {
                name,
                contentCount: content.length,
            })
        })
    },

    closeCollectionCreatorModal: () => {
        startTransition(() => {
            set({
                collectionCreatorModal: {
                    isOpen: false,
                    name: '',
                    content: [],
                    mediaType: 'all',
                },
            })
            uiLog('❌ [ModalStore] Collection creator modal closed')
        })
    },

    setCollectionCreatorName: (name: string) => {
        set((state) => ({
            collectionCreatorModal: {
                ...state.collectionCreatorModal,
                name,
            },
        }))
    },

    addToCollectionCreator: (content: Content) => {
        set((state) => ({
            collectionCreatorModal: {
                ...state.collectionCreatorModal,
                content: [...state.collectionCreatorModal.content, content],
            },
        }))
    },

    removeFromCollectionCreator: (contentId: number) => {
        set((state) => ({
            collectionCreatorModal: {
                ...state.collectionCreatorModal,
                content: state.collectionCreatorModal.content.filter(
                    (item) => item.id !== contentId
                ),
            },
        }))
    },

    // Collection Mode Selection Modal Actions
    openCollectionModeSelectionModal: () => {
        startTransition(() => {
            set({
                collectionModeSelectionModal: {
                    isOpen: true,
                },
            })
            uiLog('🎯 [ModalStore] Collection mode selection modal opened')
        })
    },

    closeCollectionModeSelectionModal: () => {
        startTransition(() => {
            set({
                collectionModeSelectionModal: {
                    isOpen: false,
                },
            })
            uiLog('❌ [ModalStore] Collection mode selection modal closed')
        })
    },

    // Collection Builder Modal Actions
    openCollectionBuilderModal: () => {
        startTransition(() => {
            set({
                collectionBuilderModal: {
                    isOpen: true,
                },
            })
            uiLog('🎯 [ModalStore] Collection builder modal opened')
        })
    },

    closeCollectionBuilderModal: () => {
        startTransition(() => {
            set({
                collectionBuilderModal: {
                    isOpen: false,
                },
            })
            uiLog('❌ [ModalStore] Collection builder modal closed')
        })
    },
}))

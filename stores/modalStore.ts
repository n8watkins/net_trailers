import { create } from 'zustand'
import { Content, getTitle, TrendingPerson } from '../typings'
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

// Collection modal state
export interface CollectionModalState {
    isOpen: boolean
    editingRowId: string | null
    mode: 'create' | 'edit'
}

// Auth modal state
export interface AuthModalState {
    isOpen: boolean
    mode: 'signin' | 'signup'
}

// Home row editor modal state
export interface HomeRowEditorModalState {
    isOpen: boolean
    pageType: 'home' | 'movies' | 'tv'
}

// Collection creator modal state
export interface CollectionCreatorModalState {
    isOpen: boolean
    name: string
    content: Content[]
    mediaType: 'movie' | 'tv' | 'all'
    emoji?: string
    color?: string
}

// Collection mode selection modal state
export interface CollectionModeSelectionModalState {
    isOpen: boolean
}

// Collection builder modal state
export interface CollectionBuilderModalState {
    isOpen: boolean
}

// Actor content modal state
export interface ActorContentModalState {
    isOpen: boolean
    actor: TrendingPerson | null
}

// Modal store state interface
export interface ModalStoreState {
    // Content modal (main video player modal)
    modal: ModalState

    // List management modal
    listModal: ListModalState

    // Collection creation/editing modal
    collectionModal: CollectionModalState

    // Authentication modal
    authModal: AuthModalState

    // Home row editor modal (for home/movies/tv pages)
    homeRowEditorModal: HomeRowEditorModalState

    // Collection creator modal
    collectionCreatorModal: CollectionCreatorModalState

    // Collection mode selection modal
    collectionModeSelectionModal: CollectionModeSelectionModalState

    // Collection builder modal
    collectionBuilderModal: CollectionBuilderModalState

    // Actor content modal
    actorContentModal: ActorContentModalState
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

    // Collection modal actions
    openCollectionModal: (mode: 'create' | 'edit', editingRowId?: string) => void
    closeCollectionModal: () => void

    // Auth modal actions
    openAuthModal: (mode?: 'signin' | 'signup') => void
    closeAuthModal: () => void
    setAuthModalMode: (mode: 'signin' | 'signup') => void

    // Home row editor modal actions
    openHomeRowEditorModal: (pageType: 'home' | 'movies' | 'tv') => void
    closeHomeRowEditorModal: () => void

    // Collection creator modal actions
    openCollectionCreatorModal: (
        name: string,
        content: Content[],
        mediaType: 'movie' | 'tv' | 'all',
        emoji?: string,
        color?: string
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

    // Actor content modal actions
    openActorContentModal: (actor: TrendingPerson) => void
    closeActorContentModal: () => void
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

    collectionModal: {
        isOpen: false,
        editingRowId: null,
        mode: 'create',
    },

    authModal: {
        isOpen: false,
        mode: 'signin',
    },

    homeRowEditorModal: {
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

    actorContentModal: {
        isOpen: false,
        actor: null,
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

    // Collection Modal Actions
    openCollectionModal: (mode: 'create' | 'edit' = 'create', editingRowId?: string) => {
        startTransition(() => {
            set({
                collectionModal: {
                    isOpen: true,
                    mode,
                    editingRowId: editingRowId || null,
                },
            })
            uiLog('📊 [ModalStore] Collection modal opened:', {
                mode,
                editingRowId: editingRowId || 'none',
            })
        })
    },

    closeCollectionModal: () => {
        startTransition(() => {
            set({
                collectionModal: {
                    isOpen: false,
                    mode: 'create',
                    editingRowId: null,
                },
            })
            uiLog('❌ [ModalStore] Collection modal closed')
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

    // Home Row Editor Modal Actions
    openHomeRowEditorModal: (pageType: 'home' | 'movies' | 'tv') => {
        startTransition(() => {
            set({
                homeRowEditorModal: {
                    isOpen: true,
                    pageType,
                },
            })
            uiLog('📊 [ModalStore] Home row editor modal opened:', pageType)
        })
    },

    closeHomeRowEditorModal: () => {
        startTransition(() => {
            set({
                homeRowEditorModal: {
                    isOpen: false,
                    pageType: 'home',
                },
            })
            uiLog('❌ [ModalStore] Home row editor modal closed')
        })
    },

    // Collection Creator Modal Actions
    openCollectionCreatorModal: (
        name: string,
        content: Content[],
        mediaType: 'movie' | 'tv' | 'all',
        emoji?: string,
        color?: string
    ) => {
        startTransition(() => {
            set({
                collectionCreatorModal: {
                    isOpen: true,
                    name,
                    content,
                    mediaType,
                    emoji,
                    color,
                },
            })
            uiLog('📋 [ModalStore] Collection creator modal opened:', {
                name,
                contentCount: content.length,
                emoji,
                color,
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

    // Actor Content Modal Actions
    openActorContentModal: (actor: TrendingPerson) => {
        startTransition(() => {
            set({
                actorContentModal: {
                    isOpen: true,
                    actor,
                },
            })
            uiLog('🎭 [ModalStore] Actor content modal opened:', actor.name)
        })
    },

    closeActorContentModal: () => {
        startTransition(() => {
            set({
                actorContentModal: {
                    isOpen: false,
                    actor: null,
                },
            })
            uiLog('❌ [ModalStore] Actor content modal closed')
        })
    },
}))

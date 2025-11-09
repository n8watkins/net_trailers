import { create } from 'zustand'
import { Content, getTitle } from '../typings'
import { startTransition } from 'react'

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

// Watchlist creator modal state
export interface WatchlistCreatorModalState {
    isOpen: boolean
    name: string
    content: Content[]
    mediaType: 'movie' | 'tv' | 'all'
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

    // Watchlist creator modal
    watchlistCreatorModal: WatchlistCreatorModalState
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

    // Watchlist creator modal actions
    openWatchlistCreatorModal: (
        name: string,
        content: Content[],
        mediaType: 'movie' | 'tv' | 'all'
    ) => void
    closeWatchlistCreatorModal: () => void
    setWatchlistCreatorName: (name: string) => void
    addToWatchlistCreator: (content: Content) => void
    removeFromWatchlistCreator: (contentId: number) => void
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

    watchlistCreatorModal: {
        isOpen: false,
        name: '',
        content: [],
        mediaType: 'all',
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
            if (process.env.NODE_ENV === 'development') {
                console.log('🎬 [ModalStore] Modal opened:', getTitle(content))
            }
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
            if (process.env.NODE_ENV === 'development') {
                console.log('❌ [ModalStore] Modal closed')
            }
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
            if (process.env.NODE_ENV === 'development') {
                console.log('📋 [ModalStore] List modal opened:', {
                    contentTitle: content ? getTitle(content) : 'No content',
                    mode: mode || 'add',
                })
            }
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
            if (process.env.NODE_ENV === 'development') {
                console.log('❌ [ModalStore] List modal closed')
            }
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
            if (process.env.NODE_ENV === 'development') {
                console.log('📊 [ModalStore] Custom row modal opened:', {
                    mode,
                    editingRowId: editingRowId || 'none',
                })
            }
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
            if (process.env.NODE_ENV === 'development') {
                console.log('❌ [ModalStore] Custom row modal closed')
            }
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
            if (process.env.NODE_ENV === 'development') {
                console.log('✅ [ModalStore] Auth modal opened:', mode)
            }
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
            if (process.env.NODE_ENV === 'development') {
                console.log('❌ [ModalStore] Auth modal closed')
            }
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
            if (process.env.NODE_ENV === 'development') {
                console.log('📊 [ModalStore] Row editor modal opened:', pageType)
            }
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
            if (process.env.NODE_ENV === 'development') {
                console.log('❌ [ModalStore] Row editor modal closed')
            }
        })
    },

    // Watchlist Creator Modal Actions
    openWatchlistCreatorModal: (
        name: string,
        content: Content[],
        mediaType: 'movie' | 'tv' | 'all'
    ) => {
        startTransition(() => {
            set({
                watchlistCreatorModal: {
                    isOpen: true,
                    name,
                    content,
                    mediaType,
                },
            })
            if (process.env.NODE_ENV === 'development') {
                console.log('📋 [ModalStore] Watchlist creator modal opened:', {
                    name,
                    contentCount: content.length,
                })
            }
        })
    },

    closeWatchlistCreatorModal: () => {
        startTransition(() => {
            set({
                watchlistCreatorModal: {
                    isOpen: false,
                    name: '',
                    content: [],
                    mediaType: 'all',
                },
            })
            if (process.env.NODE_ENV === 'development') {
                console.log('❌ [ModalStore] Watchlist creator modal closed')
            }
        })
    },

    setWatchlistCreatorName: (name: string) => {
        set((state) => ({
            watchlistCreatorModal: {
                ...state.watchlistCreatorModal,
                name,
            },
        }))
    },

    addToWatchlistCreator: (content: Content) => {
        set((state) => ({
            watchlistCreatorModal: {
                ...state.watchlistCreatorModal,
                content: [...state.watchlistCreatorModal.content, content],
            },
        }))
    },

    removeFromWatchlistCreator: (contentId: number) => {
        set((state) => ({
            watchlistCreatorModal: {
                ...state.watchlistCreatorModal,
                content: state.watchlistCreatorModal.content.filter(
                    (item) => item.id !== contentId
                ),
            },
        }))
    },
}))

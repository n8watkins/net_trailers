/**
 * useModal - Direct Zustand hook for modal state
 */

import { useAppStore } from '../stores/appStore'
import { Content } from '../typings'

export function useModal() {
    const { modal, openModal, closeModal, setAutoPlay, setAutoPlayWithSound } = useAppStore()

    // Derived state for backward compatibility
    const isOpen = modal.isOpen
    const content = modal.content?.content || null
    const autoPlay = modal.content?.autoPlay || false
    const autoPlayWithSound = modal.content?.autoPlayWithSound || false

    // Helper function to set content (replaces setMovieState)
    const setContent = (newContent: Content | null) => {
        if (newContent) {
            openModal(newContent, autoPlay, autoPlayWithSound)
        } else {
            closeModal()
        }
    }

    // Helper function to toggle modal (replaces setModalState)
    const setModalState = (open: boolean) => {
        if (open && content) {
            openModal(content, autoPlay, autoPlayWithSound)
        } else if (!open) {
            closeModal()
        }
    }

    return {
        // State
        isOpen,
        content,
        autoPlay,
        autoPlayWithSound,
        modalData: modal, // Full modal data if needed

        // Actions
        openModal,
        closeModal,
        setAutoPlay,
        setAutoPlayWithSound,
        setContent,
        setModalState,

        // Convenience methods
        openWithSound: (content: Content) => openModal(content, true, true),
        openMuted: (content: Content) => openModal(content, true, false),
    }
}

// Export type for components that need it
export type UseModalReturn = ReturnType<typeof useModal>

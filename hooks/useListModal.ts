/**
 * useListModal - Direct Zustand hook for list modal management
 * Handles the modal for adding content to lists and managing lists
 */

import { useAppStore } from '../stores/appStore'
import { Content } from '../typings'

export function useListModal() {
    const { listModal, openListModal, closeListModal, setListModalMode } = useAppStore()

    // Convenience methods
    const openForContent = (content: Content) => {
        openListModal(content, 'add')
    }

    const openForManage = () => {
        openListModal(undefined, 'manage')
    }

    const openForCreate = () => {
        openListModal(undefined, 'create')
    }

    // Helper to check modal state
    const isOpenWithContent = (content?: Content) => {
        if (!content) return listModal.isOpen && !!listModal.content
        return (
            listModal.isOpen &&
            listModal.content?.id === content.id &&
            listModal.content?.media_type === content.media_type
        )
    }

    const isMode = (mode: 'manage' | 'create' | 'add') => {
        return listModal.mode === mode
    }

    return {
        // State
        isOpen: listModal.isOpen,
        content: listModal.content,
        mode: listModal.mode,
        listModalData: listModal, // Full data if needed

        // Core actions
        open: openListModal,
        close: closeListModal,
        setMode: setListModalMode,

        // Convenience methods
        openForContent,
        openForManage,
        openForCreate,

        // State checks
        isOpenWithContent,
        isMode,
        isAddMode: listModal.mode === 'add',
        isManageMode: listModal.mode === 'manage',
        isCreateMode: listModal.mode === 'create',
        hasContent: !!listModal.content,
    }
}

// Export type for components that need it
export type UseListModalReturn = ReturnType<typeof useListModal>

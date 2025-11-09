'use client'

import { AuthProvider } from '../hooks/useAuth'
import ToastManager from '../components/common/ToastManager'
import Modal from '../components/modals/Modal'
import ListSelectionModal from '../components/modals/ListSelectionModal'
import CustomRowModal from '../components/modals/CustomRowModal'
import { RowEditorModal } from '../components/modals/RowEditorModal'
import CollectionCreatorModal from '../components/modals/CollectionCreatorModal'
import { SessionSyncManager } from '../components/utility/SessionSyncManager'
import { useAppStore } from '../stores/appStore'

/**
 * Providers component wraps the entire app with necessary context providers
 * and mounts global UI components that should always be present.
 *
 * This replaces the old Pages Router _app.tsx pattern.
 *
 * Note: AuthModal is managed by appStore and mounted in Header.tsx
 */
export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider>
            {/* Session initialization - CRITICAL for app to work */}
            <SessionSyncManager />
            {children}
            {/* Global UI components that should always be mounted */}
            <ToastManager />
            <Modal />
            <ListSelectionModal />
            <CustomRowModal />
            <RowEditorModalWrapper />
            <CollectionCreatorModal />
        </AuthProvider>
    )
}

/**
 * Wrapper component to connect RowEditorModal to Zustand store
 */
function RowEditorModalWrapper() {
    const { rowEditorModal, closeRowEditorModal } = useAppStore()

    return (
        <RowEditorModal
            isOpen={rowEditorModal.isOpen}
            onClose={closeRowEditorModal}
            pageType={rowEditorModal.pageType}
        />
    )
}

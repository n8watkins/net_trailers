'use client'

import { AuthProvider } from '../hooks/useAuth'
import ToastManager from '../components/common/ToastManager'
import Modal from '../components/modals/Modal'
import ListSelectionModal from '../components/modals/ListSelectionModal'
import CollectionModal from '../components/modals/CollectionModal'
import { HomeRowEditorModal } from '../components/modals/HomeRowEditorModal'
import CollectionCreatorModal from '../components/modals/CollectionCreatorModal'
import CollectionBuilderModal from '../components/modals/CollectionBuilderModal'
import { SessionSyncManager } from '../components/utility/SessionSyncManager'
import { useAppStore } from '../stores/appStore'
import DebugControls from '../components/debug/DebugControls'
import WebVitalsHUD from '../components/debug/WebVitalsHUD'
import FirebaseCallTracker from '../components/debug/FirebaseCallTracker'
import VercelAnalyticsWrapper from '../components/utility/VercelAnalyticsWrapper'

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
            <CollectionModal />
            <HomeRowEditorModalWrapper />
            <CollectionCreatorModal />
            <CollectionBuilderModal />
            {/* Debug components (only visible in development) */}
            <DebugControls />
            <WebVitalsHUD />
            <FirebaseCallTracker />
            {/* Analytics */}
            <VercelAnalyticsWrapper />
        </AuthProvider>
    )
}

/**
 * Wrapper component to connect HomeRowEditorModal to Zustand store
 */
function HomeRowEditorModalWrapper() {
    const { homeRowEditorModal, closeHomeRowEditorModal } = useAppStore()

    return (
        <HomeRowEditorModal
            isOpen={homeRowEditorModal.isOpen}
            onClose={closeHomeRowEditorModal}
            pageType={homeRowEditorModal.pageType}
        />
    )
}

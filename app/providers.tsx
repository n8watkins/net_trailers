'use client'

import dynamic from 'next/dynamic'
import { AuthProvider } from '../hooks/useAuth'
import ToastManager from '../components/common/ToastManager'
import { SessionSyncManager } from '../components/utility/SessionSyncManager'
import { useAppStore } from '../stores/appStore'
import { useModalStore } from '../stores/modalStore'
import StartupHealthCheck from '../components/utility/StartupHealthCheck'

// The global modals load on first open, not with every page: they are large
// (the title modal brings the video player) and closed on first paint.
const Modal = dynamic(() => import('../components/modals/Modal'), { ssr: false })
const ListSelectionModal = dynamic(() => import('../components/modals/ListSelectionModal'), {
    ssr: false,
})
const CollectionModal = dynamic(() => import('../components/modals/CollectionModal'), {
    ssr: false,
})
const HomeRowEditorModal = dynamic(
    () => import('../components/modals/HomeRowEditorModal').then((m) => m.HomeRowEditorModal),
    { ssr: false }
)
const CollectionCreatorModal = dynamic(
    () => import('../components/modals/CollectionCreatorModal'),
    { ssr: false }
)
const CollectionBuilderModal = dynamic(
    () => import('../components/modals/CollectionBuilderModal'),
    { ssr: false }
)
// Development-only tools stay out of the production bundle
const DevTools =
    process.env.NODE_ENV === 'development'
        ? dynamic(() => import('../components/debug/DevTools'), { ssr: false })
        : () => null

/**
 * Providers component wraps the entire app with necessary context providers
 * and mounts global UI components that should always be present.
 *
 * Note: AuthModal is managed by appStore and mounted in Header.tsx
 */
export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider>
            {/* Session initialization - CRITICAL for app to work */}
            <SessionSyncManager />
            {children}
            <ToastManager />
            <GlobalModals />
            <DevTools />
            <StartupHealthCheck />
        </AuthProvider>
    )
}

/** Mounts each global modal only while it is open (or has been opened once). */
function GlobalModals() {
    const modalOpen = useModalStore((s) => s.modal.isOpen)
    const listOpen = useModalStore((s) => s.listModal.isOpen)
    const collectionOpen = useModalStore((s) => s.collectionModal.isOpen)
    const creatorOpen = useModalStore((s) => s.collectionCreatorModal.isOpen)
    const builderOpen = useModalStore((s) => s.collectionBuilderModal.isOpen)
    const { homeRowEditorModal, closeHomeRowEditorModal } = useAppStore()

    return (
        <>
            {modalOpen && <Modal />}
            {listOpen && <ListSelectionModal />}
            {collectionOpen && <CollectionModal />}
            {homeRowEditorModal.isOpen && (
                <HomeRowEditorModal
                    isOpen
                    onClose={closeHomeRowEditorModal}
                    pageType={homeRowEditorModal.pageType}
                />
            )}
            {creatorOpen && <CollectionCreatorModal />}
            {builderOpen && <CollectionBuilderModal />}
        </>
    )
}

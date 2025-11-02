'use client'

import { AuthProvider } from '../hooks/useAuth'
import ToastManager from '../components/common/ToastManager'
import Modal from '../components/modals/Modal'

/**
 * Providers component wraps the entire app with necessary context providers
 * and mounts global UI components that should always be present.
 *
 * This replaces the old Pages Router _app.tsx pattern.
 *
 * Note: AuthModal is managed by appStore and doesn't need to be mounted here.
 */
export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider>
            {children}
            {/* Global UI components that should always be mounted */}
            <ToastManager />
            <Modal />
        </AuthProvider>
    )
}

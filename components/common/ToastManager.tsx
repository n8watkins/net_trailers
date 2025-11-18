import React, { useCallback } from 'react'
import ToastContainer from './ToastContainer'
import { useToastStore } from '../../stores/toastStore'

/**
 * ToastManager component - bridge between toast store and UI
 * Subscribes directly to toastStore to avoid appStore re-render issues
 * Uses stable callback references to prevent unnecessary re-renders
 */
const ToastManager: React.FC = () => {
    const toasts = useToastStore((state) => state.toasts)
    const dismissToast = useToastStore((state) => state.dismissToast)

    // Stable callback reference - won't change on re-renders
    const handleRemoveToast = useCallback(
        (id: string) => {
            dismissToast(id)
        },
        [dismissToast]
    )

    return <ToastContainer toasts={toasts} onRemoveToast={handleRemoveToast} />
}

export default ToastManager

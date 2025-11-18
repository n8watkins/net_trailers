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

    // Get dismissToast directly from the store to ensure stability
    // Zustand actions are stable and don't change between renders
    const handleRemoveToast = useCallback((id: string) => {
        useToastStore.getState().dismissToast(id)
    }, [])

    return <ToastContainer toasts={toasts} onRemoveToast={handleRemoveToast} />
}

export default ToastManager

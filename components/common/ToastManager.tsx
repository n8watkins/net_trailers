import React from 'react'
import ToastContainer from './ToastContainer'
import { useToast } from '../../hooks/useToast'

const ToastManager: React.FC = () => {
    const { toasts, removeToast } = useToast()

    return <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
}

export default ToastManager

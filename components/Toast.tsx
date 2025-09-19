import React, { useEffect } from 'react'
import { CheckCircleIcon, XCircleIcon, XMarkIcon } from '@heroicons/react/24/outline'

export interface ToastMessage {
    id: string
    type: 'success' | 'error'
    title: string
    message?: string
}

interface ToastProps {
    toast: ToastMessage
    onClose: (id: string) => void
    duration?: number
}

const Toast: React.FC<ToastProps> = ({ toast, onClose, duration = 4000 }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose(toast.id)
        }, duration)

        return () => clearTimeout(timer)
    }, [toast.id, onClose, duration])

    const handleClose = () => {
        onClose(toast.id)
    }

    return (
        <div className="bg-[#181818] border border-gray-600/50 rounded-lg shadow-xl p-4 max-w-sm w-full">
            <div className="flex items-start">
                <div className="flex-shrink-0">
                    {toast.type === 'success' ? (
                        <CheckCircleIcon className="h-6 w-6 text-green-400" />
                    ) : (
                        <XCircleIcon className="h-6 w-6 text-red-400" />
                    )}
                </div>
                <div className="ml-3 w-0 flex-1">
                    <p className="text-sm font-medium text-white">
                        {toast.title}
                    </p>
                    {toast.message && (
                        <p className="mt-1 text-sm text-gray-300">
                            {toast.message}
                        </p>
                    )}
                </div>
                <div className="ml-4 flex-shrink-0 flex">
                    <button
                        onClick={handleClose}
                        className="rounded-md inline-flex text-gray-400 hover:text-white focus:outline-none"
                    >
                        <XMarkIcon className="h-5 w-5" />
                    </button>
                </div>
            </div>
        </div>
    )
}

export default Toast
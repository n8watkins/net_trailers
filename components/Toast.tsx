import React, { useEffect, useState } from 'react'
import {
    CheckCircleIcon,
    XCircleIcon,
    XMarkIcon,
    MinusCircleIcon,
    PlusCircleIcon,
} from '@heroicons/react/24/outline'

export interface ToastMessage {
    id: string
    type: 'success' | 'error' | 'watchlist-add' | 'watchlist-remove'
    title: string
    message?: string
}

interface ToastProps {
    toast: ToastMessage
    onClose: (id: string) => void
    duration?: number
}

const Toast: React.FC<ToastProps> = ({ toast, onClose, duration = 3000 }) => {
    const [isVisible, setIsVisible] = useState(false)
    const [isExiting, setIsExiting] = useState(false)

    useEffect(() => {
        setIsVisible(true)

        const timer = setTimeout(() => {
            setIsExiting(true)
            setTimeout(() => {
                onClose(toast.id)
            }, 300)
        }, duration)

        return () => clearTimeout(timer)
    }, [toast.id, onClose, duration])

    const handleClose = () => {
        setIsExiting(true)
        setTimeout(() => {
            onClose(toast.id)
        }, 300)
    }

    return (
        <div
            className={`bg-[#181818] border border-gray-600/50 rounded-lg shadow-xl p-4 min-w-80 max-w-2xl w-auto transition-all duration-300 ease-in-out ${
                !isVisible
                    ? 'opacity-0 transform -translate-x-full'
                    : isExiting
                      ? 'opacity-0 transform translate-x-full'
                      : 'opacity-100 transform translate-x-0'
            }`}
        >
            <div className="flex items-start">
                <div className="flex-shrink-0">
                    {toast.type === 'success' && (
                        <CheckCircleIcon className="h-6 w-6 text-green-400" />
                    )}
                    {toast.type === 'error' && <XCircleIcon className="h-6 w-6 text-red-400" />}
                    {toast.type === 'watchlist-add' && (
                        <PlusCircleIcon className="h-6 w-6 text-blue-400" />
                    )}
                    {toast.type === 'watchlist-remove' && (
                        <MinusCircleIcon className="h-6 w-6 text-orange-400" />
                    )}
                </div>
                <div className="ml-3 flex-1">
                    <p className="text-sm font-medium text-white">{toast.title}</p>
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

import React, { useEffect, useState } from 'react'
import {
    CheckCircleIcon,
    XCircleIcon,
    XMarkIcon,
    MinusCircleIcon,
    PlusCircleIcon,
    EyeIcon,
    EyeSlashIcon,
} from '@heroicons/react/24/outline'

/**
 * Toast message interface for the unified notification system
 * Supports 6 different toast types with consistent styling and behavior
 */
export interface ToastMessage {
    id: string
    type:
        | 'success' // Green checkmark - successful operations
        | 'error' // Red X mark - error messages
        | 'watchlist-add' // Blue plus - adding to watchlist
        | 'watchlist-remove' // Orange minus - removing from watchlist
        | 'content-hidden' // Red eye-slash - hiding content
        | 'content-shown' // Green eye - showing content
    title: string // Main message text
    message?: string // Optional additional details
}

interface ToastProps {
    toast: ToastMessage
    onClose: (id: string) => void
    duration?: number
}

/**
 * Individual toast notification component
 * Features slide-in/slide-out animations and auto-dismiss after 5 seconds
 * Part of the unified toast system - handles all 6 toast types consistently
 */
const Toast: React.FC<ToastProps> = ({ toast, onClose, duration = 5000 }) => {
    console.log('🍞 Toast component rendering:', toast)
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
            className={`bg-[#181818] border border-gray-600/50 rounded-lg shadow-xl p-4 sm:p-6 min-w-80 sm:min-w-96 max-w-sm sm:max-w-md lg:max-w-lg w-auto transition-all duration-300 ease-in-out ${
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
                        <CheckCircleIcon className="h-7 w-7 text-green-400" />
                    )}
                    {toast.type === 'error' && <XCircleIcon className="h-7 w-7 text-red-400" />}
                    {toast.type === 'watchlist-add' && (
                        <PlusCircleIcon className="h-7 w-7 text-blue-400" />
                    )}
                    {toast.type === 'watchlist-remove' && (
                        <MinusCircleIcon className="h-7 w-7 text-orange-400" />
                    )}
                    {toast.type === 'content-hidden' && (
                        <EyeSlashIcon className="h-7 w-7 text-red-400" />
                    )}
                    {toast.type === 'content-shown' && (
                        <EyeIcon className="h-7 w-7 text-green-400" />
                    )}
                </div>
                <div className="ml-4 flex-1">
                    <p className="text-base font-medium text-white">{toast.title}</p>
                    {toast.message && <p className="text-sm text-gray-300 mt-1">{toast.message}</p>}
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

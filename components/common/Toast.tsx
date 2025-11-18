import React, { useEffect, useState, useRef } from 'react'
import {
    CheckCircleIcon,
    XCircleIcon,
    XMarkIcon,
    MinusCircleIcon,
    PlusCircleIcon,
    EyeIcon,
    EyeSlashIcon,
} from '@heroicons/react/24/outline'
import { TOAST_DURATION, TOAST_EXIT_DURATION } from '../../stores/appStore'

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
    onUndo?: () => void // Optional undo callback
    contentId?: number // Optional content ID for undo operations
    timestamp: number // When the toast was created
}

interface ToastProps {
    toast: ToastMessage
    onClose: (id: string) => void
    duration?: number
}

/**
 * Individual toast notification component
 * Features slide-in/slide-out animations and auto-dismiss after configured duration
 * Part of the unified toast system - handles all 6 toast types consistently
 */
const Toast: React.FC<ToastProps> = ({ toast, onClose, duration = TOAST_DURATION }) => {
    const [isVisible, setIsVisible] = useState(false)
    const [isExiting, setIsExiting] = useState(false)
    const timersRef = useRef<{ main?: NodeJS.Timeout; exit?: NodeJS.Timeout }>({})

    useEffect(() => {
        setIsVisible(true)

        timersRef.current.main = setTimeout(() => {
            setIsExiting(true)
            timersRef.current.exit = setTimeout(() => {
                onClose(toast.id)
            }, TOAST_EXIT_DURATION)
        }, duration)

        return () => {
            // Clean up all timers on unmount
            if (timersRef.current.main) clearTimeout(timersRef.current.main)
            if (timersRef.current.exit) clearTimeout(timersRef.current.exit)
        }
    }, [toast.id, onClose, duration])

    const handleClose = () => {
        setIsExiting(true)
        timersRef.current.exit = setTimeout(() => {
            onClose(toast.id)
        }, TOAST_EXIT_DURATION)
    }

    const handleUndo = () => {
        if (toast.onUndo) {
            toast.onUndo()
            handleClose()
        }
    }

    const getToastStyles = () => {
        switch (toast.type) {
            case 'error':
                return 'bg-gradient-to-r from-red-900/40 to-red-800/40 border-red-500/70 shadow-red-500/20'
            case 'success':
                return 'bg-[#181818] border-gray-600/50'
            case 'watchlist-add':
                return 'bg-[#181818] border-gray-600/50'
            case 'watchlist-remove':
                return 'bg-[#181818] border-gray-600/50'
            case 'content-hidden':
                return 'bg-[#181818] border-gray-600/50'
            case 'content-shown':
                return 'bg-[#181818] border-gray-600/50'
            default:
                return 'bg-[#181818] border-gray-600/50'
        }
    }

    return (
        <div
            className={`${getToastStyles()} border rounded-lg shadow-xl p-4 sm:p-6 w-full transition-all duration-500 ease-out ${
                !isVisible
                    ? 'opacity-0 transform -translate-y-4 scale-95'
                    : isExiting
                      ? 'opacity-0 transform translate-y-4 scale-95'
                      : 'opacity-100 transform translate-y-0 scale-100'
            }`}
        >
            <div className="flex items-start">
                <div className="flex-shrink-0">
                    {toast.type === 'success' && (
                        <CheckCircleIcon className="h-7 w-7 text-green-400" />
                    )}
                    {toast.type === 'error' && (
                        <XCircleIcon className="h-8 w-8 text-red-400 animate-pulse" />
                    )}
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
                    <p
                        className={`text-base font-medium ${toast.type === 'error' ? 'text-red-100 font-semibold' : 'text-white'}`}
                    >
                        {toast.title}
                    </p>
                    {toast.message && (
                        <p
                            className={`text-sm mt-1 ${toast.type === 'error' ? 'text-red-200' : 'text-gray-300'}`}
                        >
                            {toast.message}
                        </p>
                    )}
                    {/* Undo button for content-hidden toast */}
                    {toast.type === 'content-hidden' && toast.onUndo && (
                        <button
                            onClick={handleUndo}
                            className="mt-2 px-3 py-1 text-sm font-medium text-white bg-gray-700 hover:bg-gray-600 rounded-md transition-colors duration-200"
                        >
                            Undo
                        </button>
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

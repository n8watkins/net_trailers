import React, { useState } from 'react'
import { XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'

interface ConfirmationModalProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: () => void
    title: string
    message: string
    confirmText: string
    confirmButtonText?: string
    cancelButtonText?: string
    requireTyping?: boolean
    confirmationPhrase?: string
    dangerLevel?: 'warning' | 'danger'
    isLoading?: boolean
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText,
    confirmButtonText = 'Confirm',
    cancelButtonText = 'Cancel',
    requireTyping = false,
    confirmationPhrase = 'CONFIRM',
    dangerLevel = 'warning',
    isLoading = false,
}) => {
    const [typedText, setTypedText] = useState('')

    const handleClose = () => {
        setTypedText('')
        onClose()
    }

    const handleConfirm = () => {
        if (requireTyping && typedText !== confirmationPhrase) {
            return
        }
        setTypedText('')
        onConfirm()
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleConfirm()
        }
    }

    const isConfirmDisabled = isLoading || (requireTyping && typedText !== confirmationPhrase)

    const colors = {
        warning: {
            bg: 'bg-orange-900/20',
            border: 'border-orange-600/50',
            icon: 'text-orange-500',
            text: 'text-orange-400',
            button: 'bg-orange-600 hover:bg-orange-700',
        },
        danger: {
            bg: 'bg-red-900/20',
            border: 'border-red-600/50',
            icon: 'text-red-500',
            text: 'text-red-400',
            button: 'bg-red-600 hover:bg-red-700',
        },
    }

    const colorScheme = colors[dangerLevel]

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-modal flex items-center justify-center p-4">
            {/* Background overlay - no onClick to prevent closing */}
            <div className="fixed inset-0 transition-opacity bg-gray-900 bg-opacity-75" />

            {/* Modal panel */}
            <div className="relative w-full max-w-md px-8 py-6 overflow-hidden text-left transition-all transform bg-[#0a0a0a] border border-red-500/40 rounded-xl shadow-2xl shadow-red-500/20">
                {/* Close Button */}
                <button
                    onClick={handleClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors duration-200 p-1 rounded-full hover:bg-white/10"
                >
                    <XMarkIcon className="h-5 w-5" />
                </button>

                {/* Icon */}
                <div className="flex items-center justify-center mb-6">
                    <div
                        className={`w-14 h-14 rounded-full ${colorScheme.bg} border ${colorScheme.border} flex items-center justify-center`}
                    >
                        <ExclamationTriangleIcon className={`w-7 h-7 ${colorScheme.icon}`} />
                    </div>
                </div>

                {/* Title */}
                <h3 className={`text-lg font-bold text-center mb-3 ${colorScheme.text}`}>
                    {title}
                </h3>

                {/* Message */}
                <p className="text-[#b3b3b3] text-sm text-center mb-6 leading-relaxed">{message}</p>

                {/* Confirm Text */}
                {confirmText && (
                    <div
                        className={`p-3 ${colorScheme.bg} rounded-lg border ${colorScheme.border} mb-6`}
                    >
                        <p className="text-white text-xs font-medium">{confirmText}</p>
                    </div>
                )}

                {/* Typing Confirmation */}
                {requireTyping && (
                    <div className="mb-6">
                        <label className="block text-sm text-[#e5e5e5] mb-2">
                            Type <span className="font-bold">{confirmationPhrase}</span> to confirm:
                        </label>
                        <input
                            type="text"
                            value={typedText}
                            onChange={(e) => setTypedText(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={confirmationPhrase}
                            className="w-full text-sm px-4 py-2 bg-[#0a0a0a] border border-[#313131] rounded-lg text-white placeholder-[#666] text-center focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition-all"
                            autoFocus
                        />
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3">
                    <button
                        onClick={handleConfirm}
                        disabled={isConfirmDisabled}
                        className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center justify-center ${
                            isConfirmDisabled
                                ? 'bg-gray-600 cursor-not-allowed opacity-50 text-white'
                                : `${colorScheme.button} text-white`
                        }`}
                    >
                        {isLoading ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                                Processing...
                            </>
                        ) : (
                            confirmButtonText
                        )}
                    </button>
                    <button
                        onClick={handleClose}
                        disabled={isLoading}
                        className="flex-1 px-4 py-2 text-sm font-medium text-white bg-[#313131] hover:bg-[#454545] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {cancelButtonText}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default ConfirmationModal

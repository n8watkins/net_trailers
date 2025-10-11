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

    const isConfirmDisabled = requireTyping && typedText !== confirmationPhrase

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
        <div className="fixed inset-0 z-[50000] flex items-center justify-center p-4">
            {/* Background overlay */}
            <div
                className="fixed inset-0 transition-opacity bg-gray-900 bg-opacity-75"
                onClick={handleClose}
            />

            {/* Modal panel */}
            <div className="relative w-full max-w-md px-6 pt-5 pb-4 overflow-hidden text-left transition-all transform bg-[#0a0a0a] border border-red-500/40 rounded-xl shadow-2xl shadow-red-500/20 sm:p-6">
                {/* Close Button */}
                <button
                    onClick={handleClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors duration-200 p-1 rounded-full hover:bg-white/10"
                >
                    <XMarkIcon className="h-5 w-5" />
                </button>

                {/* Icon */}
                <div className="flex items-center justify-center mb-4">
                    <div
                        className={`w-16 h-16 rounded-full ${colorScheme.bg} border ${colorScheme.border} flex items-center justify-center`}
                    >
                        <ExclamationTriangleIcon className={`w-8 h-8 ${colorScheme.icon}`} />
                    </div>
                </div>

                {/* Title */}
                <h3 className={`text-xl font-bold text-center mb-2 ${colorScheme.text}`}>
                    {title}
                </h3>

                {/* Message */}
                <p className="text-[#b3b3b3] text-sm text-center mb-4">{message}</p>

                {/* Confirm Text */}
                <div
                    className={`p-4 ${colorScheme.bg} rounded-lg border ${colorScheme.border} mb-4`}
                >
                    <p className="text-white text-sm font-medium">{confirmText}</p>
                </div>

                {/* Typing Confirmation */}
                {requireTyping && (
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-[#e5e5e5] mb-2">
                            Type <span className="font-mono font-bold">{confirmationPhrase}</span>{' '}
                            to confirm:
                        </label>
                        <input
                            type="text"
                            value={typedText}
                            onChange={(e) => setTypedText(e.target.value)}
                            placeholder={confirmationPhrase}
                            className="inputClass w-full"
                            autoFocus
                        />
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 mt-6">
                    <button
                        onClick={handleConfirm}
                        disabled={isConfirmDisabled}
                        className={`flex-1 bannerButton ${
                            isConfirmDisabled
                                ? 'bg-gray-600 cursor-not-allowed opacity-50'
                                : `${colorScheme.button} text-white`
                        }`}
                    >
                        {confirmButtonText}
                    </button>
                    <button
                        onClick={handleClose}
                        className="flex-1 bannerButton bg-[#313131] text-white hover:bg-[#454545]"
                    >
                        {cancelButtonText}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default ConfirmationModal

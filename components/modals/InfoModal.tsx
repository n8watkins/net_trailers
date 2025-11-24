import React from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'

interface InfoModalProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: () => void
    title: string
    message: string
    confirmButtonText?: string
    cancelButtonText?: string
    emoji?: string
}

const InfoModal: React.FC<InfoModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmButtonText = 'Continue',
    cancelButtonText = 'Maybe Later',
    emoji = '🔒',
}) => {
    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-modal flex items-center justify-center p-4">
            {/* Background overlay */}
            <div
                className="fixed inset-0 transition-opacity bg-gray-900 bg-opacity-75"
                onClick={onClose}
            />

            {/* Modal panel */}
            <div className="relative w-full max-w-lg p-8 overflow-hidden text-center transition-all transform bg-[#0a0a0a] border border-gray-700/50 rounded-lg shadow-2xl">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-2 right-2 sm:top-4 sm:right-4 text-gray-400 hover:text-white transition-colors duration-200 p-2 sm:p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:bg-white/10"
                >
                    <XMarkIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                </button>

                {/* Emoji Icon */}
                <div className="flex justify-center mb-6">
                    <span className="text-4xl sm:text-5xl md:text-6xl">{emoji}</span>
                </div>

                {/* Title */}
                <h3 className="text-white font-bold text-2xl mb-4">{title}</h3>

                {/* Message */}
                <p className="text-gray-400 text-base leading-relaxed mb-6 max-w-md mx-auto">
                    {message}
                </p>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <button
                        onClick={onConfirm}
                        className="flex-1 px-6 py-3 bg-white text-black rounded-lg font-semibold transition-all duration-200 hover:bg-gray-200"
                    >
                        {confirmButtonText}
                    </button>
                    <button
                        onClick={onClose}
                        className="flex-1 px-6 py-3 bg-gray-700 text-white rounded-lg font-medium transition-all duration-200 hover:bg-gray-600"
                    >
                        {cancelButtonText}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default InfoModal

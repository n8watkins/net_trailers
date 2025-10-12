import React from 'react'
import { XMarkIcon, LockClosedIcon } from '@heroicons/react/24/outline'

interface InfoModalProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: () => void
    title: string
    message: string
    confirmButtonText?: string
    cancelButtonText?: string
    icon?: React.ComponentType<{ className?: string }>
}

const InfoModal: React.FC<InfoModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmButtonText = 'Continue',
    cancelButtonText = 'Maybe Later',
    icon: Icon = LockClosedIcon,
}) => {
    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[50000] flex items-center justify-center p-4">
            {/* Background overlay */}
            <div
                className="fixed inset-0 transition-opacity bg-gray-900 bg-opacity-75"
                onClick={onClose}
            />

            {/* Modal panel */}
            <div className="relative w-full max-w-md px-6 py-6 overflow-hidden text-left transition-all transform bg-[#141414] rounded-lg shadow-2xl">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors duration-200 p-1 rounded-full hover:bg-white/10"
                >
                    <XMarkIcon className="h-5 w-5" />
                </button>

                {/* Content */}
                <div className="bg-gray-800/30 rounded-lg p-5 border border-gray-700/50">
                    <div className="flex items-center space-x-3 mb-3">
                        <Icon className="w-5 h-5 text-gray-400" />
                        <h3 className="text-white font-semibold text-lg">{title}</h3>
                    </div>
                    <p className="text-gray-400 text-sm leading-relaxed mb-4">{message}</p>

                    {/* Action Buttons */}
                    <div className="flex space-x-3">
                        <button
                            onClick={onConfirm}
                            className="flex-1 px-4 py-2 bg-white text-black rounded-lg font-medium transition-all duration-200 hover:bg-gray-200"
                        >
                            {confirmButtonText}
                        </button>
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg font-medium transition-all duration-200 hover:bg-gray-600"
                        >
                            {cancelButtonText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default InfoModal

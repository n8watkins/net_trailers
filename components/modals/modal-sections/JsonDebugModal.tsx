'use client'

import React from 'react'
import { XMarkIcon } from '@heroicons/react/24/solid'
import { Content } from '../../../typings'

interface JsonDebugModalProps {
    isOpen: boolean
    onClose: () => void
    data: Content | null
}

function JsonDebugModal({ isOpen, onClose, data }: JsonDebugModalProps) {
    if (!isOpen) return null

    const handleCopyJson = () => {
        if (data) {
            navigator.clipboard.writeText(JSON.stringify(data, null, 2))
        }
    }

    return (
        <div
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
            onClick={onClose}
        >
            <div
                className="bg-gray-900 rounded-lg max-w-4xl max-h-[80vh] w-full mx-4 flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center p-4 border-b border-gray-700">
                    <h3 className="text-white text-lg font-semibold">API Response JSON</h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-gray-400 hover:text-white"
                        aria-label="Close debug panel"
                    >
                        <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                    </button>
                </div>
                <div className="p-4 flex-1 overflow-auto">
                    <pre className="text-green-400 text-xs font-mono whitespace-pre-wrap break-words">
                        {data ? JSON.stringify(data, null, 2) : 'No data available'}
                    </pre>
                </div>
                <div className="p-4 border-t border-gray-700 flex justify-end">
                    <button
                        onClick={handleCopyJson}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded mr-2"
                    >
                        Copy JSON
                    </button>
                    <button
                        onClick={onClose}
                        className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    )
}

export default JsonDebugModal

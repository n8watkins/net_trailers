import React from 'react'
import { XMarkIcon } from '@heroicons/react/24/solid'

interface ListModalHeaderProps {
    isManagementMode: boolean
    onClose: () => void
}

function ListModalHeader({ isManagementMode, onClose }: ListModalHeaderProps) {
    return (
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
            <div>
                <h2 className="text-xl font-semibold text-white">
                    {isManagementMode ? 'My Collections' : 'Add to Collections'}
                </h2>
                {!isManagementMode && (
                    <p className="text-sm text-gray-400 mt-1">
                        Click any collection to add or remove
                    </p>
                )}
            </div>
            <button
                onClick={onClose}
                className="p-2 hover:bg-gray-700 rounded-full transition-colors"
            >
                <XMarkIcon className="w-5 h-5 text-white" />
            </button>
        </div>
    )
}

export default ListModalHeader

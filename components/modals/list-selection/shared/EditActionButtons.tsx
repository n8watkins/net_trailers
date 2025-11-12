import React from 'react'
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/solid'

interface EditActionButtonsProps {
    onSave: () => void
    onCancel: () => void
    size?: 'small' | 'medium'
}

export default function EditActionButtons({
    onSave,
    onCancel,
    size = 'medium',
}: EditActionButtonsProps) {
    const buttonSize = size === 'small' ? 'p-1.5' : 'p-2'
    const iconSize = size === 'small' ? 'h-4 w-4' : 'h-5 w-5'

    return (
        <div className="flex gap-2">
            {/* Save Button */}
            <button
                onClick={onSave}
                className={`${buttonSize} bg-green-600 hover:bg-green-700 text-white rounded-full transition-colors duration-200`}
                aria-label="Save changes"
            >
                <CheckIcon className={iconSize} />
            </button>

            {/* Cancel Button */}
            <button
                onClick={onCancel}
                className={`${buttonSize} bg-gray-600 hover:bg-gray-700 text-white rounded-full transition-colors duration-200`}
                aria-label="Cancel changes"
            >
                <XMarkIcon className={iconSize} />
            </button>
        </div>
    )
}

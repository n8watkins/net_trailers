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
    const buttonSize =
        size === 'small'
            ? 'p-1.5 sm:p-2 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0'
            : 'p-2 sm:p-2.5 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0'
    const iconSize = size === 'small' ? 'h-4 w-4 sm:h-5 sm:w-5' : 'h-5 w-5 sm:h-6 sm:w-6'

    return (
        <div className="flex gap-2">
            {/* Save Button */}
            <button
                onClick={onSave}
                className={`${buttonSize} bg-green-600 hover:bg-green-700 text-white rounded-full transition-colors duration-200 flex items-center justify-center`}
                aria-label="Save changes"
            >
                <CheckIcon className={iconSize} />
            </button>

            {/* Cancel Button */}
            <button
                onClick={onCancel}
                className={`${buttonSize} bg-gray-600 hover:bg-gray-700 text-white rounded-full transition-colors duration-200 flex items-center justify-center`}
                aria-label="Cancel changes"
            >
                <XMarkIcon className={iconSize} />
            </button>
        </div>
    )
}

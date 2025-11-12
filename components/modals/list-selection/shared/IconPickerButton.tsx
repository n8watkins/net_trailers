import React, { useState } from 'react'
import IconPickerModal from '../../IconPickerModal'

interface IconPickerButtonProps {
    selectedIcon: string
    onSelectIcon: (icon: string) => void
    size?: 'small' | 'large'
    className?: string
}

export default function IconPickerButton({
    selectedIcon,
    onSelectIcon,
    size = 'large',
    className = '',
}: IconPickerButtonProps) {
    const [showPicker, setShowPicker] = useState(false)

    const handleSelectIcon = (icon: string) => {
        onSelectIcon(icon)
        setShowPicker(false)
    }

    const sizeClasses = size === 'small' ? 'text-2xl w-10 h-10' : 'text-3xl w-12 h-12'

    return (
        <>
            <button
                type="button"
                onClick={() => setShowPicker(true)}
                className={`${sizeClasses} ${className} bg-gray-700 hover:bg-gray-600 rounded-lg flex items-center justify-center transition-colors duration-200 border border-gray-600`}
                aria-label="Select icon"
            >
                {selectedIcon}
            </button>

            {showPicker && (
                <IconPickerModal
                    onSelect={handleSelectIcon}
                    onClose={() => setShowPicker(false)}
                    currentIcon={selectedIcon}
                />
            )}
        </>
    )
}

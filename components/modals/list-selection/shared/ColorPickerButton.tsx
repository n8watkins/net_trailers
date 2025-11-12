import React, { useState } from 'react'
import ColorPickerModal from '../../ColorPickerModal'

interface ColorPickerButtonProps {
    selectedColor: string
    onSelectColor: (color: string) => void
    size?: 'small' | 'large'
    className?: string
}

export default function ColorPickerButton({
    selectedColor,
    onSelectColor,
    size = 'large',
    className = '',
}: ColorPickerButtonProps) {
    const [showPicker, setShowPicker] = useState(false)

    const handleSelectColor = (color: string) => {
        onSelectColor(color)
        setShowPicker(false)
    }

    const sizeClasses = size === 'small' ? 'w-10 h-10' : 'w-12 h-12'

    return (
        <>
            <button
                type="button"
                onClick={() => setShowPicker(true)}
                className={`${sizeClasses} ${className} rounded-lg border-2 border-gray-600 hover:border-gray-500 transition-colors duration-200`}
                style={{ backgroundColor: selectedColor }}
                aria-label="Select color"
            />

            {showPicker && (
                <ColorPickerModal
                    isOpen={showPicker}
                    selectedColor={selectedColor}
                    onSelectColor={handleSelectColor}
                    onClose={() => setShowPicker(false)}
                />
            )}
        </>
    )
}

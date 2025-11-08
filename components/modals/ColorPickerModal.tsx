import React, { useEffect, useRef } from 'react'
import { AVAILABLE_COLORS } from '../../config/constants'

interface ColorPickerModalProps {
    isOpen: boolean
    selectedColor: string
    onSelectColor: (color: string) => void
    onClose: () => void
}

function ColorPickerModal({
    isOpen,
    selectedColor,
    onSelectColor,
    onClose,
}: ColorPickerModalProps) {
    const dropdownRef = useRef<HTMLDivElement>(null)

    // Use shared colors constant
    const colors = AVAILABLE_COLORS as unknown as string[]

    // Close on click outside
    useEffect(() => {
        if (!isOpen) return

        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                onClose()
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [isOpen, onClose])

    if (!isOpen) return null

    const handleColorSelect = (color: string) => {
        onSelectColor(color)
        onClose()
    }

    return (
        <div
            ref={dropdownRef}
            className="absolute bottom-full left-0 mb-2 bg-[#141414] rounded-lg shadow-2xl border border-gray-600 p-1.5 z-[1500] w-[176px]"
        >
            <div className="grid grid-cols-4 gap-1.5">
                {colors.map((color) => (
                    <button
                        key={color}
                        onClick={() => handleColorSelect(color)}
                        className="relative w-9 h-9 flex-shrink-0"
                    >
                        <div
                            className={`w-full h-full rounded-md transition-all duration-200 hover:scale-110 hover:shadow-lg border ${
                                selectedColor === color
                                    ? 'ring-1 ring-white scale-105 border-white'
                                    : 'border-gray-600 hover:border-white/50'
                            }`}
                            style={{ backgroundColor: color }}
                        />
                    </button>
                ))}
            </div>
        </div>
    )
}

export default ColorPickerModal

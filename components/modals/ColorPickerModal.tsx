import React, { useEffect, useRef } from 'react'

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

    // 16 vibrant colors that pop on dark backgrounds (Red, Yellow, Purple, Blue)
    const colors = [
        '#ef4444', // Red
        '#dc2626', // Red (darker)
        '#f97316', // Orange
        '#f43f5e', // Rose
        '#fbbf24', // Amber/Gold
        '#facc15', // Yellow
        '#eab308', // Yellow (darker)
        '#f59e0b', // Amber
        '#2dd4bf', // Teal
        '#22d3ee', // Cyan
        '#38bdf8', // Sky Blue
        '#3b82f6', // Blue
        '#6366f1', // Indigo
        '#8b5cf6', // Violet
        '#a855f7', // Purple
        '#d946ef', // Fuchsia
    ]

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

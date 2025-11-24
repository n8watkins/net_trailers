import React, { useState, useEffect, useRef } from 'react'
import { AVAILABLE_EMOJIS } from '../../config/constants'

interface IconPickerModalProps {
    isOpen: boolean
    selectedIcon: string
    onSelectIcon: (icon: string) => void
    onClose: () => void
}

type IconCategory = {
    name: string
    label: string
    icons: string[]
}

function IconPickerModal({ isOpen, selectedIcon, onSelectIcon, onClose }: IconPickerModalProps) {
    const [activeCategory, setActiveCategory] = useState('entertainment')
    const dropdownRef = useRef<HTMLDivElement>(null)

    // Category colors - solid colors instead of opacity
    const categoryColors = {
        entertainment: 'bg-purple-900',
        fantasy: 'bg-blue-900',
        achievements: 'bg-yellow-900',
        action: 'bg-red-900',
    }

    const categories: IconCategory[] = [
        {
            name: 'entertainment',
            label: '🎬',
            icons: AVAILABLE_EMOJIS.entertainment as unknown as string[],
        },
        {
            name: 'fantasy',
            label: '🦸',
            icons: AVAILABLE_EMOJIS.fantasy as unknown as string[],
        },
        {
            name: 'achievements',
            label: '🏆',
            icons: AVAILABLE_EMOJIS.achievements as unknown as string[],
        },
        {
            name: 'action',
            label: '⚔️',
            icons: AVAILABLE_EMOJIS.action as unknown as string[],
        },
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

    const handleIconSelect = (icon: string) => {
        setTimeout(() => {
            onSelectIcon(icon)
            onClose()
        }, 100)
    }

    const currentCategory = categories.find((cat) => cat.name === activeCategory) || categories[0]

    return (
        <div
            ref={dropdownRef}
            className="absolute top-full left-0 mt-2 bg-[#141414] rounded-lg shadow-2xl border border-gray-600 z-picker w-[280px]"
        >
            {/* Category Tabs */}
            <div className="flex rounded-t-lg">
                {categories.map((category, index) => (
                    <button
                        key={category.name}
                        onClick={() => setActiveCategory(category.name)}
                        className={`text-2xl flex items-center justify-center ${
                            activeCategory === category.name
                                ? `w-12 h-12 ${categoryColors[category.name as keyof typeof categoryColors]} pb-3 ${index === 0 ? 'rounded-tl-lg' : ''}`
                                : `w-10 h-10 hover:bg-white/5 rounded-md ${index === 0 ? 'rounded-tl-lg' : ''}`
                        }`}
                    >
                        {category.label}
                    </button>
                ))}
            </div>

            {/* Icon Grid - Full width with negative margins */}
            <div
                className={`-mb-1.5 grid grid-cols-6 gap-2.5 p-3 ${
                    activeCategory === categories[0].name
                        ? 'rounded-b-lg rounded-tr-lg border-t border-gray-600'
                        : 'rounded-lg'
                } ${categoryColors[activeCategory as keyof typeof categoryColors]}`}
            >
                {currentCategory.icons.map((emoji) => (
                    <button
                        key={emoji}
                        onClick={() => handleIconSelect(emoji)}
                        className={`relative w-10 h-10 flex-shrink-0 text-2xl rounded-md transition-all duration-200 ${
                            selectedIcon === emoji
                                ? 'bg-white/10 ring-1 ring-white scale-105 border border-white/50'
                                : 'hover:bg-white/5 border border-transparent'
                        }`}
                    >
                        {emoji}
                    </button>
                ))}
            </div>
        </div>
    )
}

export default IconPickerModal

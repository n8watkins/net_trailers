import React, { useState, useEffect, useRef } from 'react'

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
            icons: [
                '🎬',
                '🎭',
                '🍿',
                '🎪',
                '📽️',
                '🎞️',
                '📺',
                '📻',
                '🎵',
                '🎶',
                '🎤',
                '🎧',
                '🎸',
                '🎺',
                '🎹',
                '🎼',
                '🎨',
                '📱',
            ],
        },
        {
            name: 'fantasy',
            label: '🦸',
            icons: [
                '🦸',
                '🦹',
                '🤖',
                '👽',
                '🐉',
                '🦄',
                '💀',
                '👻',
                '🚀',
                '🛸',
                '🌍',
                '🌕',
                '👾',
                '🕷️',
                '🦇',
                '🧛',
                '🧟',
                '🧙',
            ],
        },
        {
            name: 'achievements',
            label: '🏆',
            icons: [
                '🏆',
                '🥇',
                '🎖️',
                '🏅',
                '👑',
                '💎',
                '⚡',
                '💥',
                '🔥',
                '⭐',
                '🌟',
                '✨',
                '💫',
                '🎯',
                '💪',
                '🔱',
                '⚜️',
                '🌈',
            ],
        },
        {
            name: 'action',
            label: '⚔️',
            icons: [
                '⚔️',
                '🗡️',
                '🏹',
                '🔫',
                '💣',
                '🧨',
                '🎲',
                '🃏',
                '🎰',
                '🎮',
                '🕹️',
                '🎳',
                '⚽',
                '🏀',
                '🎾',
                '⛳',
                '🏒',
                '🥊',
            ],
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
        onSelectIcon(icon)
        onClose()
    }

    const currentCategory = categories.find((cat) => cat.name === activeCategory) || categories[0]

    return (
        <div
            ref={dropdownRef}
            className="absolute bottom-full left-0 mb-2 bg-[#141414] rounded-lg shadow-2xl border border-gray-600 p-1.5 z-[1500] w-[280px]"
        >
            {/* Category Tabs */}
            <div className="flex -mx-1.5 px-1.5">
                {categories.map((category) => (
                    <button
                        key={category.name}
                        onClick={() => setActiveCategory(category.name)}
                        className={`text-2xl transition-all duration-200 flex items-center justify-center ${
                            activeCategory === category.name
                                ? `w-12 h-12 ${categoryColors[category.name as keyof typeof categoryColors]} pb-3`
                                : 'w-10 h-10 hover:bg-white/5 rounded-md'
                        }`}
                    >
                        {category.label}
                    </button>
                ))}
            </div>

            {/* Icon Grid - Full width with negative margins */}
            <div
                className={`-mx-1.5 -mb-1.5 grid grid-cols-6 gap-2.5 p-3 rounded-lg border border-gray-700 ${
                    categoryColors[activeCategory as keyof typeof categoryColors]
                }`}
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

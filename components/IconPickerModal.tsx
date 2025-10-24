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
            <div className="flex gap-1.5 mb-2 border-b border-gray-700 pb-1.5">
                {categories.map((category) => (
                    <button
                        key={category.name}
                        onClick={() => setActiveCategory(category.name)}
                        className={`w-10 h-10 text-2xl rounded-md transition-all duration-200 flex items-center justify-center border ${
                            activeCategory === category.name
                                ? 'border-white ring-2 ring-white ring-offset-2 ring-offset-[#141414]'
                                : 'border-gray-600 hover:border-white/50 hover:bg-gray-800'
                        }`}
                    >
                        {category.label}
                    </button>
                ))}
            </div>

            {/* Icon Grid */}
            <div className="grid grid-cols-6 gap-1.5">
                {currentCategory.icons.map((emoji) => (
                    <button
                        key={emoji}
                        onClick={() => handleIconSelect(emoji)}
                        className={`relative w-10 h-10 flex-shrink-0 text-2xl rounded-md transition-all duration-200 hover:scale-110 hover:bg-gray-700 border ${
                            selectedIcon === emoji
                                ? 'border-white ring-2 ring-white ring-offset-2 ring-offset-[#141414] scale-105'
                                : 'border-gray-700 hover:border-white/50'
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

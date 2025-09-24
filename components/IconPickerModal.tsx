import React from 'react'
import { XMarkIcon } from '@heroicons/react/24/solid'

interface IconPickerModalProps {
    isOpen: boolean
    selectedIcon: string
    onSelectIcon: (icon: string) => void
    onClose: () => void
}

function IconPickerModal({ isOpen, selectedIcon, onSelectIcon, onClose }: IconPickerModalProps) {
    // Movie-related emojis for list icons
    const movieEmojis = [
        '🎬',
        '🎭',
        '🍿',
        '🎪',
        '🎨',
        '🎯',
        '🎸',
        '🎺',
        '🎹',
        '🎤',
        '🎧',
        '📱',
        '📽️',
        '🎞️',
        '📺',
        '📻',
        '🎵',
        '🎶',
        '🎼',
        '🌟',
        '⭐',
        '💫',
        '✨',
        '🔥',
        '💎',
        '🏆',
        '🥇',
        '🎖️',
        '🏅',
        '👑',
        '💀',
        '👻',
        '🤖',
        '👽',
        '🦄',
        '🐉',
        '🦸',
        '🦹',
        '💥',
        '⚡',
        '🌍',
        '🌕',
        '🚀',
        '🛸',
        '⚔️',
        '🗡️',
        '🏹',
        '💣',
        '🔫',
        '🎲',
    ]

    if (!isOpen) return null

    const handleIconSelect = (icon: string) => {
        onSelectIcon(icon)
        onClose()
    }

    return (
        <div className="fixed inset-0 z-[400] flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className="relative bg-[#141414] rounded-lg shadow-2xl max-w-md w-full mx-4">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-700">
                    <h2 className="text-xl font-semibold text-white">Choose an Icon</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-700 rounded-full transition-colors"
                    >
                        <XMarkIcon className="w-5 h-5 text-white" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    <div className="grid grid-cols-8 gap-2 max-h-80 overflow-y-auto">
                        {movieEmojis.map((emoji) => (
                            <button
                                key={emoji}
                                onClick={() => handleIconSelect(emoji)}
                                className={`p-3 text-2xl rounded-lg transition-all duration-200 hover:bg-gray-700 ${
                                    selectedIcon === emoji
                                        ? 'bg-white text-black ring-2 ring-white'
                                        : 'bg-gray-800/50 hover:bg-gray-600'
                                }`}
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default IconPickerModal

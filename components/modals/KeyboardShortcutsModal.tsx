import React from 'react'
import { XMarkIcon, CommandLineIcon } from '@heroicons/react/24/outline'

interface KeyboardShortcut {
    keys: string[]
    description: string
    category: string
}

const shortcuts: KeyboardShortcut[] = [
    // Navigation
    { keys: ['Alt', '/'], description: 'Focus search bar', category: 'Navigation' },
    { keys: ['Alt', 'H'], description: 'Go to home page', category: 'Navigation' },
    { keys: ['Alt', 'L'], description: 'Go to liked content', category: 'Navigation' },
    { keys: ['Escape'], description: 'Close modal or clear search', category: 'Navigation' },

    // Search & Browse
    { keys: ['↑', '↓'], description: 'Navigate search results', category: 'Search & Browse' },
    { keys: ['Enter'], description: 'Open selected result', category: 'Search & Browse' },

    // Content Actions
    { keys: ['Space'], description: 'Play/pause video', category: 'Content Actions' },
    { keys: ['M'], description: 'Toggle mute', category: 'Content Actions' },
    { keys: ['F'], description: 'Toggle fullscreen', category: 'Content Actions' },
    { keys: ['L'], description: 'Like/unlike content', category: 'Content Actions' },
    { keys: ['H'], description: 'Hide/show content', category: 'Content Actions' },
    { keys: ['R'], description: 'Watch on YouTube', category: 'Content Actions' },

    // General
    { keys: ['?'], description: 'Toggle keyboard shortcuts menu', category: 'General' },
    { keys: ['Alt', 'T'], description: 'Open tutorial', category: 'General' },
    { keys: ['Alt', 'I'], description: 'Open about NetTrailers', category: 'General' },
]

const shortcutsByCategory = shortcuts.reduce(
    (acc, shortcut) => {
        if (!acc[shortcut.category]) {
            acc[shortcut.category] = []
        }
        acc[shortcut.category].push(shortcut)
        return acc
    },
    {} as Record<string, KeyboardShortcut[]>
)

interface KeyboardShortcutsModalProps {
    isOpen: boolean
    onClose: () => void
}

const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null

    const renderKeys = (keys: string[]) => {
        return keys.map((key, index) => (
            <React.Fragment key={key}>
                {index > 0 && <span className="text-gray-400 mx-1">+</span>}
                <kbd className="px-2 py-1 text-xs font-semibold rounded bg-zinc-800 text-gray-400 border border-zinc-700/50">
                    {key}
                </kbd>
            </React.Fragment>
        ))
    }

    return (
        <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-modal flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div
                className="relative bg-gradient-to-br from-zinc-900 via-zinc-900/95 to-black rounded-2xl max-w-4xl w-full border border-red-500/30 shadow-2xl shadow-red-500/10 overflow-hidden max-h-[90vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Animated background glow */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-64 bg-gradient-radial from-red-500/10 via-transparent to-transparent" />
                    <div
                        className="absolute inset-0 bg-gradient-to-t from-red-900/5 via-transparent to-transparent animate-pulse"
                        style={{ animationDuration: '4s' }}
                    />
                </div>

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-20 p-2 rounded-full bg-zinc-800/60 text-gray-400 hover:text-white hover:bg-zinc-700/80 transition-all duration-300 hover:scale-110"
                >
                    <XMarkIcon className="w-5 h-5" />
                </button>

                {/* Header */}
                <div className="relative z-10 p-6 border-b border-zinc-800/50 flex-shrink-0">
                    <div className="flex items-center space-x-3">
                        <CommandLineIcon className="w-6 h-6 text-red-500" />
                        <h2 className="text-xl font-semibold text-white">Keyboard Shortcuts</h2>
                    </div>
                </div>

                {/* Content */}
                <div className="relative z-10 flex-1 overflow-y-auto p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {Object.entries(shortcutsByCategory).map(
                            ([category, categoryShortcuts]) => (
                                <div key={category} className="space-y-4">
                                    <h3 className="text-lg font-medium text-red-400 border-b border-zinc-800/50 pb-2">
                                        {category}
                                    </h3>
                                    <div className="space-y-3">
                                        {categoryShortcuts.map((shortcut, index) => (
                                            <div
                                                key={index}
                                                className="flex items-center justify-between"
                                            >
                                                <span className="text-gray-300 text-sm flex-1 pr-4">
                                                    {shortcut.description}
                                                </span>
                                                <div className="flex items-center space-x-1 flex-shrink-0">
                                                    {renderKeys(shortcut.keys)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="relative z-10 px-6 py-4 border-t border-zinc-800/50 flex-shrink-0">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                        <p className="text-gray-400 text-sm">
                            Press{' '}
                            <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-gray-400 text-xs">
                                ?
                            </kbd>{' '}
                            to open this menu anytime
                        </p>
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-white bg-red-500/90 hover:bg-red-600 rounded-lg transition-all duration-300 shadow-[0_0_10px_rgba(239,68,68,0.3)]"
                        >
                            Got it!
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default KeyboardShortcutsModal

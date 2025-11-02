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
                <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-200 border border-gray-300 rounded-md shadow-sm">
                    {key}
                </kbd>
            </React.Fragment>
        ))
    }

    return (
        <div className="fixed inset-0 z-[50000] flex items-center justify-center p-4">
            {/* Background overlay */}
            <div
                className="fixed inset-0 transition-opacity bg-gray-900 bg-opacity-75"
                onClick={onClose}
            />

            {/* Modal panel */}
            <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto px-6 py-5 bg-[#0a0a0a] border border-red-500/40 rounded-xl shadow-2xl shadow-red-500/20">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-3">
                        <CommandLineIcon className="w-6 h-6 text-red-500" />
                        <h2 className="text-xl font-semibold text-white">Keyboard Shortcuts</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-gray-700"
                    >
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {Object.entries(shortcutsByCategory).map(([category, categoryShortcuts]) => (
                        <div key={category} className="space-y-4">
                            <h3 className="text-lg font-medium text-red-400 border-b border-gray-600 pb-2">
                                {category}
                            </h3>
                            <div className="space-y-3">
                                {categoryShortcuts.map((shortcut, index) => (
                                    <div key={index} className="flex items-center justify-between">
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
                    ))}
                </div>

                {/* Footer */}
                <div className="mt-8 pt-6 border-t border-gray-600">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                        <p className="text-gray-400 text-sm">
                            Press{' '}
                            <kbd className="px-1 py-0.5 text-xs font-semibold text-gray-800 bg-gray-200 border border-gray-300 rounded">
                                ?
                            </kbd>{' '}
                            to open this menu anytime
                        </p>
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-900"
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

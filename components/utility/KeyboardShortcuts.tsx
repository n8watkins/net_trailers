import React from 'react'

interface KeyboardShortcut {
    key: string
    description: string
    icon?: string
}

interface KeyboardShortcutsProps {
    shortcuts: KeyboardShortcut[]
    className?: string
}

export default function KeyboardShortcuts({ shortcuts, className = '' }: KeyboardShortcutsProps) {
    return (
        <div className={`flex flex-wrap gap-2 sm:gap-4 justify-center items-center ${className}`}>
            {shortcuts.map((shortcut, index) => (
                <div
                    key={index}
                    className="flex items-center gap-1.5 px-2 py-1 bg-black/40 backdrop-blur-sm border border-white/20 rounded-md text-xs sm:text-sm"
                >
                    <kbd className="px-1.5 py-0.5 bg-white/10 border border-white/30 rounded text-white font-mono font-semibold min-w-[1.5rem] text-center">
                        {shortcut.key}
                    </kbd>
                    {shortcut.icon && (
                        <span className="text-white/80 text-sm">{shortcut.icon}</span>
                    )}
                    <span className="text-white/90 text-xs sm:text-sm">{shortcut.description}</span>
                </div>
            ))}
        </div>
    )
}

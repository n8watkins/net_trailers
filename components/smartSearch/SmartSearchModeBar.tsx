'use client'

import { FilmIcon, RectangleStackIcon, BookmarkIcon } from '@heroicons/react/24/outline'
import { useSmartSearchStore } from '../../stores/smartSearchStore'
import type { SmartSearchMode } from '../../types/smartSearch'

const modes: Array<{
    id: SmartSearchMode
    label: string
    icon: React.ComponentType<{ className?: string }>
    description: string
}> = [
    {
        id: 'suggestions',
        label: 'Suggestions',
        icon: FilmIcon,
        description: 'Quick recommendations',
    },
    {
        id: 'row',
        label: 'Create Collection',
        icon: RectangleStackIcon,
        description: 'Build custom collection',
    },
    {
        id: 'watchlist',
        label: 'Create Collection',
        icon: BookmarkIcon,
        description: 'Save to watch later',
    },
]

export default function SmartSearchModeBar() {
    const { mode, setMode, results, generatedName } = useSmartSearchStore()

    return (
        <div className="mb-8">
            {/* Mode Tabs */}
            <div className="flex flex-wrap gap-2 mb-4">
                {modes.map((m) => {
                    const Icon = m.icon
                    const isActive = mode === m.id

                    return (
                        <button
                            key={m.id}
                            onClick={() => setMode(m.id)}
                            className={`
                flex items-center gap-2 px-4 py-2 rounded-md
                transition-all duration-200
                ${
                    isActive
                        ? 'bg-red-600 text-white shadow-lg scale-105'
                        : 'bg-white/10 text-gray-300 hover:bg-white/20 hover:text-white'
                }
              `}
                        >
                            <Icon className="h-5 w-5" />
                            <div className="flex flex-col items-start">
                                <span className="font-semibold text-sm">{m.label}</span>
                                <span className="text-xs opacity-75">{m.description}</span>
                            </div>
                        </button>
                    )
                })}
            </div>

            {/* Results Summary */}
            {results.length > 0 && (
                <div className="text-white">
                    <h2 className="text-2xl font-bold mb-1">
                        {mode === 'suggestions' && 'Suggested For You'}
                        {mode === 'row' && (generatedName || 'Custom Collection')}
                        {mode === 'watchlist' && (generatedName || 'Your Collection')}
                    </h2>
                    <p className="text-sm text-gray-400">{results.length} titles</p>
                </div>
            )}
        </div>
    )
}

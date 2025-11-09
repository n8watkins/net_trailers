'use client'

import React, { useState } from 'react'
import { SmartInput, Entity } from './SmartInput'

interface SmartStep1InputProps {
    onContinue: (data: {
        entities: Entity[]
        rawText: string
        mediaType: 'movie' | 'tv' | 'both'
    }) => void
    initialData?: {
        entities: Entity[]
        rawText: string
        mediaType?: 'movie' | 'tv' | 'both'
    }
}

/**
 * SmartStep1Input - First step of Smart Row Builder
 *
 * Features:
 * - Smart input field with entity tagging
 * - AI infers content type from your description
 * - Continue button with validation
 */
export function SmartStep1Input({ onContinue, initialData }: SmartStep1InputProps) {
    const [entities, setEntities] = useState<Entity[]>(initialData?.entities || [])
    const [rawText, setRawText] = useState(initialData?.rawText || '')
    const [mediaType, setMediaType] = useState<'movie' | 'tv' | 'both'>(
        initialData?.mediaType || 'movie'
    )

    const canContinue = entities.length > 0 || rawText.trim().length >= 10

    const handleContinue = () => {
        onContinue({
            entities,
            rawText,
            mediaType,
        })
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h3 className="text-lg font-semibold text-white mb-2">What are you looking for?</h3>
                <p className="text-gray-400 text-sm">
                    Tag actors, directors, genres, or describe your vibe. AI handles the rest.
                </p>
            </div>

            {/* Smart Input */}
            <SmartInput
                onEntitiesChange={setEntities}
                onTextChange={setRawText}
                placeholder="Try: 'dark sci-fi thrillers @Christopher Nolan' or 'wholesome 90s family movies'"
            />

            {/* Tips */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                <p className="text-gray-300 text-sm font-medium mb-2">Quick tips:</p>
                <ul className="text-gray-400 text-sm space-y-1">
                    <li>
                        • <span className="text-white">@</span> for people: @Spielberg
                    </li>
                    <li>
                        • <span className="text-white">:</span> for titles: :Inception
                    </li>
                    <li className="pt-1 text-purple-400">
                        ✨ AI infers movies/shows, genres, tone, and era
                    </li>
                </ul>
            </div>

            {/* Removed Media Type Selector - AI infers this */}
            <div className="hidden">
                <div className="grid grid-cols-3 gap-3">
                    {(['movie', 'tv', 'both'] as const).map((type) => (
                        <button
                            key={type}
                            className={`p-4 rounded-lg border-2 transition-all font-medium border-gray-700 bg-gray-800 text-gray-400`}
                        >
                            <div className="flex flex-col items-center gap-1">
                                <span className="text-2xl">
                                    {type === 'movie' ? '🎬' : type === 'tv' ? '📺' : '🎭'}
                                </span>
                                <span className="text-sm">
                                    {type === 'both'
                                        ? 'Both'
                                        : type === 'movie'
                                          ? 'Movies'
                                          : 'TV Shows'}
                                </span>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Continue Button */}
            <button
                onClick={handleContinue}
                disabled={!canContinue}
                className="w-full px-6 py-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg shadow-lg shadow-red-600/20"
            >
                {entities.length > 0
                    ? `🔍 Analyze ${entities.length} Selection${entities.length > 1 ? 's' : ''} →`
                    : '🔍 Generate Suggestions →'}
            </button>

            {!canContinue && (
                <p className="text-center text-gray-500 text-sm">
                    Tag at least one entity or write 10+ characters to continue
                </p>
            )}
        </div>
    )
}

'use client'

import React, { useState } from 'react'
import { SmartInput } from '@/components/common/SmartInput'

interface SmartStep1InputProps {
    onContinue: (data: { rawText: string; mediaType: 'movie' | 'tv' | 'both' }) => void
    initialData?: {
        rawText: string
        mediaType?: 'movie' | 'tv' | 'both'
    }
}

/**
 * SmartStep1Input - First step of Smart Row Builder
 *
 * Features:
 * - Simple text input for natural language queries
 * - AI infers content type, genres, cast, directors from text
 * - Continue button with validation
 */
export function SmartStep1Input({ onContinue, initialData }: SmartStep1InputProps) {
    const [rawText, setRawText] = useState(initialData?.rawText || '')
    const [mediaType] = useState<'movie' | 'tv' | 'both'>(initialData?.mediaType || 'movie')

    const canContinue = rawText.trim().length >= 10

    const handleContinue = () => {
        onContinue({
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
                    Describe your vibe, genre, or theme. AI will interpret actors, directors,
                    genres, and more.
                </p>
            </div>

            {/* Smart Input */}
            <SmartInput
                value={rawText}
                onChange={setRawText}
                onSubmit={canContinue ? handleContinue : () => {}}
                placeholder="Try: 'dark sci-fi thrillers by Christopher Nolan' or 'wholesome 90s family movies'"
                size="large"
                variant="solid"
                shimmer="rainbow"
                showTypewriter={true}
            />

            {/* Tips */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                <p className="text-gray-300 text-sm font-medium mb-2">Quick tips:</p>
                <ul className="text-gray-400 text-sm space-y-1">
                    <li>• Mention actors, directors by name: "Christopher Nolan films"</li>
                    <li>• Describe genres or vibes: "cozy rainy day movies"</li>
                    <li>• Include decades or eras: "90s action classics"</li>
                    <li className="pt-1 text-purple-400">
                        ✨ AI automatically infers movies/shows, genres, tone, and era
                    </li>
                </ul>
            </div>

            {/* Continue Button */}
            <button
                onClick={handleContinue}
                disabled={!canContinue}
                className="w-full px-6 py-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg shadow-lg shadow-red-600/20"
            >
                🔍 Generate Suggestions →
            </button>

            {!canContinue && (
                <p className="text-center text-gray-500 text-sm">
                    Write at least 10 characters to continue
                </p>
            )}
        </div>
    )
}

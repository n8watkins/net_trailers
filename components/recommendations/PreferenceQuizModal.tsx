/**
 * Preference Quiz Modal
 *
 * Allows users to express genre preferences to improve recommendations.
 * Users can like, dislike, or skip genres.
 */

'use client'

import React, { useState, useCallback } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { HandThumbUpIcon, HandThumbDownIcon, MinusIcon } from '@heroicons/react/24/solid'
import { UNIFIED_GENRES, UnifiedGenre } from '../../constants/unifiedGenres'

export type GenrePreferenceValue = 'like' | 'dislike' | 'neutral'

export interface GenrePreference {
    genreId: string
    preference: GenrePreferenceValue
    updatedAt: number
}

interface PreferenceQuizModalProps {
    isOpen: boolean
    onClose: () => void
    onSave: (preferences: GenrePreference[]) => Promise<void>
    existingPreferences?: GenrePreference[]
}

// Select a subset of genres for the quiz (most popular/relevant)
const QUIZ_GENRES: string[] = [
    'action',
    'comedy',
    'drama',
    'horror',
    'romance',
    'scifi',
    'thriller',
    'fantasy',
    'animation',
    'documentary',
    'mystery',
    'crime',
]

export default function PreferenceQuizModal({
    isOpen,
    onClose,
    onSave,
    existingPreferences = [],
}: PreferenceQuizModalProps) {
    // Initialize preferences from existing data
    const [preferences, setPreferences] = useState<Record<string, GenrePreferenceValue>>(() => {
        const initial: Record<string, GenrePreferenceValue> = {}
        existingPreferences.forEach((pref) => {
            initial[pref.genreId] = pref.preference
        })
        return initial
    })
    const [isSaving, setIsSaving] = useState(false)
    const [currentIndex, setCurrentIndex] = useState(0)

    const quizGenres = UNIFIED_GENRES.filter((g) => QUIZ_GENRES.includes(g.id))

    const handlePreference = useCallback(
        (genreId: string, value: GenrePreferenceValue) => {
            setPreferences((prev) => ({
                ...prev,
                [genreId]: value,
            }))

            // Auto-advance to next genre
            if (currentIndex < quizGenres.length - 1) {
                setTimeout(() => setCurrentIndex((prev) => prev + 1), 200)
            }
        },
        [currentIndex, quizGenres.length]
    )

    const handleSave = async () => {
        setIsSaving(true)
        try {
            const prefsToSave: GenrePreference[] = Object.entries(preferences).map(
                ([genreId, preference]) => ({
                    genreId,
                    preference,
                    updatedAt: Date.now(),
                })
            )
            await onSave(prefsToSave)
            onClose()
        } catch (error) {
            console.error('Failed to save preferences:', error)
        } finally {
            setIsSaving(false)
        }
    }

    const currentGenre = quizGenres[currentIndex]
    const progress = ((currentIndex + 1) / quizGenres.length) * 100
    const answeredCount = Object.keys(preferences).length

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[50000] flex items-center justify-center p-4">
            {/* Background overlay */}
            <div
                className="fixed inset-0 transition-opacity bg-gray-900 bg-opacity-75"
                onClick={onClose}
            />

            {/* Modal panel */}
            <div className="relative w-full max-w-md overflow-hidden transition-all transform bg-[#0a0a0a] border border-gray-700/50 rounded-lg shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-700/50">
                    <div>
                        <h2 className="text-lg font-bold text-white">Genre Preferences</h2>
                        <p className="text-xs text-gray-400">
                            {currentIndex + 1} of {quizGenres.length}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors duration-200 p-2 rounded-full hover:bg-white/10"
                    >
                        <XMarkIcon className="h-5 w-5" />
                    </button>
                </div>

                {/* Progress bar */}
                <div className="h-1 bg-gray-800">
                    <div
                        className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
                        style={{ width: `${progress}%` }}
                    />
                </div>

                {/* Current genre card */}
                <div className="p-6">
                    <div className="text-center mb-8">
                        <h3 className="text-2xl font-bold text-white mb-2">{currentGenre?.name}</h3>
                        <p className="text-gray-400 text-sm">
                            Do you enjoy {currentGenre?.name.toLowerCase()} content?
                        </p>
                    </div>

                    {/* Preference buttons */}
                    <div className="flex justify-center gap-4 mb-6">
                        <button
                            onClick={() => handlePreference(currentGenre.id, 'dislike')}
                            className={`flex flex-col items-center gap-2 p-4 rounded-xl transition-all duration-200 min-w-[80px] ${
                                preferences[currentGenre?.id] === 'dislike'
                                    ? 'bg-red-500/20 border-2 border-red-500 scale-105'
                                    : 'bg-gray-800/50 border-2 border-transparent hover:bg-gray-700/50'
                            }`}
                        >
                            <HandThumbDownIcon
                                className={`w-8 h-8 ${
                                    preferences[currentGenre?.id] === 'dislike'
                                        ? 'text-red-500'
                                        : 'text-gray-400'
                                }`}
                            />
                            <span
                                className={`text-xs font-medium ${
                                    preferences[currentGenre?.id] === 'dislike'
                                        ? 'text-red-400'
                                        : 'text-gray-400'
                                }`}
                            >
                                Dislike
                            </span>
                        </button>

                        <button
                            onClick={() => handlePreference(currentGenre.id, 'neutral')}
                            className={`flex flex-col items-center gap-2 p-4 rounded-xl transition-all duration-200 min-w-[80px] ${
                                preferences[currentGenre?.id] === 'neutral'
                                    ? 'bg-gray-500/20 border-2 border-gray-500 scale-105'
                                    : 'bg-gray-800/50 border-2 border-transparent hover:bg-gray-700/50'
                            }`}
                        >
                            <MinusIcon
                                className={`w-8 h-8 ${
                                    preferences[currentGenre?.id] === 'neutral'
                                        ? 'text-gray-400'
                                        : 'text-gray-500'
                                }`}
                            />
                            <span
                                className={`text-xs font-medium ${
                                    preferences[currentGenre?.id] === 'neutral'
                                        ? 'text-gray-300'
                                        : 'text-gray-500'
                                }`}
                            >
                                Neutral
                            </span>
                        </button>

                        <button
                            onClick={() => handlePreference(currentGenre.id, 'like')}
                            className={`flex flex-col items-center gap-2 p-4 rounded-xl transition-all duration-200 min-w-[80px] ${
                                preferences[currentGenre?.id] === 'like'
                                    ? 'bg-green-500/20 border-2 border-green-500 scale-105'
                                    : 'bg-gray-800/50 border-2 border-transparent hover:bg-gray-700/50'
                            }`}
                        >
                            <HandThumbUpIcon
                                className={`w-8 h-8 ${
                                    preferences[currentGenre?.id] === 'like'
                                        ? 'text-green-500'
                                        : 'text-gray-400'
                                }`}
                            />
                            <span
                                className={`text-xs font-medium ${
                                    preferences[currentGenre?.id] === 'like'
                                        ? 'text-green-400'
                                        : 'text-gray-400'
                                }`}
                            >
                                Like
                            </span>
                        </button>
                    </div>

                    {/* Genre navigation dots */}
                    <div className="flex justify-center gap-1.5 mb-4">
                        {quizGenres.map((genre, index) => (
                            <button
                                key={genre.id}
                                onClick={() => setCurrentIndex(index)}
                                className={`w-2 h-2 rounded-full transition-all duration-200 ${
                                    index === currentIndex
                                        ? 'bg-purple-500 w-4'
                                        : preferences[genre.id]
                                          ? preferences[genre.id] === 'like'
                                              ? 'bg-green-500/60'
                                              : preferences[genre.id] === 'dislike'
                                                ? 'bg-red-500/60'
                                                : 'bg-gray-500/60'
                                          : 'bg-gray-700'
                                }`}
                            />
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-800/30 border-t border-gray-700/50 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-3 bg-gray-700 text-white rounded-lg font-medium transition-all duration-200 hover:bg-gray-600"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving || answeredCount === 0}
                        className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                            answeredCount > 0
                                ? 'bg-purple-600 hover:bg-purple-500 text-white'
                                : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                        }`}
                    >
                        {isSaving ? 'Saving...' : `Save (${answeredCount})`}
                    </button>
                </div>
            </div>
        </div>
    )
}

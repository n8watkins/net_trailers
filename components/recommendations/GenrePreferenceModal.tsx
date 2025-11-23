/**
 * Genre Preference Modal
 *
 * Allows users to rate genre preferences (love/not for me) to improve recommendations.
 * Mobile-friendly with large touch targets.
 */

'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { HeartIcon, HandThumbDownIcon, SparklesIcon } from '@heroicons/react/24/solid'
import { UNIFIED_GENRES, UnifiedGenre } from '../../constants/unifiedGenres'
import { GenrePreference } from '../../types/shared'

type PreferenceValue = 'love' | 'not_for_me'

interface GenrePreferenceModalProps {
    isOpen: boolean
    onClose: () => void
    onSave: (preferences: GenrePreference[]) => Promise<void>
    existingPreferences?: GenrePreference[]
}

// Key genres for the preference quiz
const PREFERENCE_GENRES: string[] = [
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

export default function GenrePreferenceModal({
    isOpen,
    onClose,
    onSave,
    existingPreferences = [],
}: GenrePreferenceModalProps) {
    const [isSaving, setIsSaving] = useState(false)
    const [preferences, setPreferences] = useState<Record<string, PreferenceValue>>(() => {
        const initial: Record<string, PreferenceValue> = {}
        existingPreferences.forEach((pref) => {
            initial[pref.genreId] = pref.preference
        })
        return initial
    })
    const [currentIndex, setCurrentIndex] = useState(0)

    const quizGenres = useMemo(
        () => UNIFIED_GENRES.filter((g) => PREFERENCE_GENRES.includes(g.id)),
        []
    )

    const handlePreference = useCallback(
        (genreId: string, value: PreferenceValue) => {
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
            console.error('Failed to save genre preferences:', error)
        } finally {
            setIsSaving(false)
        }
    }

    const currentGenre = quizGenres[currentIndex]
    const progress = ((currentIndex + 1) / quizGenres.length) * 100
    const answeredCount = Object.keys(preferences).length

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[50000] flex items-center justify-center p-2 sm:p-4">
            {/* Background overlay */}
            <div
                className="fixed inset-0 transition-opacity bg-black/80 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal panel */}
            <div className="relative w-full max-w-md overflow-hidden transition-all transform bg-[#0a0a0a] border border-gray-700/50 rounded-xl shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-700/50">
                    <div className="flex items-center gap-2 sm:gap-3">
                        <SparklesIcon className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400" />
                        <div>
                            <h2 className="text-base sm:text-lg font-bold text-white">
                                Rate Genres
                            </h2>
                            <p className="text-xs text-gray-400">
                                {currentIndex + 1} of {quizGenres.length}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors duration-200 p-2 rounded-full hover:bg-white/10 -mr-2"
                    >
                        <XMarkIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 sm:p-6">
                    {/* Progress bar */}
                    <div className="h-1 bg-gray-800 rounded-full mb-4 sm:mb-6">
                        <div
                            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-300"
                            style={{ width: `${progress}%` }}
                        />
                    </div>

                    {/* Prompt */}
                    <p className="text-gray-400 text-sm text-center mb-4 sm:mb-6">
                        What kind of content do you enjoy?
                    </p>

                    {/* Current genre card */}
                    <div className="text-center mb-6 sm:mb-8">
                        <div className="inline-block bg-gradient-to-br from-purple-900/50 to-pink-900/50 rounded-2xl px-8 sm:px-12 py-6 sm:py-8 border border-purple-500/30">
                            <h3 className="text-2xl sm:text-3xl font-bold text-white mb-1">
                                {currentGenre?.name}
                            </h3>
                        </div>
                    </div>

                    {/* Preference buttons */}
                    <div className="flex justify-center gap-4 sm:gap-6 mb-6">
                        <button
                            onClick={() => handlePreference(currentGenre.id, 'not_for_me')}
                            className={`flex flex-col items-center gap-2 p-4 sm:p-5 rounded-xl transition-all duration-200 min-w-[100px] sm:min-w-[120px] active:scale-95 ${
                                preferences[currentGenre?.id] === 'not_for_me'
                                    ? 'bg-red-500/20 border-2 border-red-500 scale-105'
                                    : 'bg-gray-800/50 border-2 border-transparent hover:bg-gray-700/50'
                            }`}
                        >
                            <HandThumbDownIcon
                                className={`w-8 h-8 sm:w-10 sm:h-10 ${
                                    preferences[currentGenre?.id] === 'not_for_me'
                                        ? 'text-red-500'
                                        : 'text-gray-400'
                                }`}
                            />
                            <span
                                className={`text-xs sm:text-sm font-medium ${
                                    preferences[currentGenre?.id] === 'not_for_me'
                                        ? 'text-red-400'
                                        : 'text-gray-400'
                                }`}
                            >
                                Not for me
                            </span>
                        </button>

                        <button
                            onClick={() => handlePreference(currentGenre.id, 'love')}
                            className={`flex flex-col items-center gap-2 p-4 sm:p-5 rounded-xl transition-all duration-200 min-w-[100px] sm:min-w-[120px] active:scale-95 ${
                                preferences[currentGenre?.id] === 'love'
                                    ? 'bg-pink-500/20 border-2 border-pink-500 scale-105'
                                    : 'bg-gray-800/50 border-2 border-transparent hover:bg-gray-700/50'
                            }`}
                        >
                            <HeartIcon
                                className={`w-8 h-8 sm:w-10 sm:h-10 ${
                                    preferences[currentGenre?.id] === 'love'
                                        ? 'text-pink-500'
                                        : 'text-gray-400'
                                }`}
                            />
                            <span
                                className={`text-xs sm:text-sm font-medium ${
                                    preferences[currentGenre?.id] === 'love'
                                        ? 'text-pink-400'
                                        : 'text-gray-400'
                                }`}
                            >
                                Love it
                            </span>
                        </button>
                    </div>

                    {/* Genre navigation dots */}
                    <div className="flex justify-center gap-1.5 flex-wrap max-w-xs mx-auto">
                        {quizGenres.map((genre, index) => (
                            <button
                                key={genre.id}
                                onClick={() => setCurrentIndex(index)}
                                className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full transition-all duration-200 ${
                                    index === currentIndex
                                        ? 'bg-purple-500 w-4 sm:w-5'
                                        : preferences[genre.id]
                                          ? preferences[genre.id] === 'love'
                                              ? 'bg-pink-500/60'
                                              : 'bg-red-500/60'
                                          : 'bg-gray-700'
                                }`}
                            />
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-4 sm:px-6 py-3 sm:py-4 bg-gray-800/30 border-t border-gray-700/50">
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-3 bg-gray-700 text-white rounded-lg font-medium transition-all duration-200 hover:bg-gray-600 text-sm sm:text-base"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isSaving || answeredCount === 0}
                            className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all duration-200 text-sm sm:text-base ${
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
        </div>
    )
}

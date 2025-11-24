/**
 * Genre Preference Modal
 *
 * Allows users to rate genre preferences (love/not for me) to improve recommendations.
 * Mobile-friendly with large touch targets.
 */

'use client'

import React, { useState, useCallback, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'
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
    const [mounted, setMounted] = useState(false)
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

    // Check if preferences have changed from the initial state
    const hasChanges = useMemo(() => {
        const currentKeys = Object.keys(preferences)
        const existingMap = new Map(existingPreferences.map((p) => [p.genreId, p.preference]))

        // Check if any new preferences were added or changed
        for (const [genreId, value] of Object.entries(preferences)) {
            if (existingMap.get(genreId) !== value) {
                return true
            }
        }

        // Check if we have different number of preferences
        if (currentKeys.length !== existingPreferences.length) {
            return true
        }

        return false
    }, [preferences, existingPreferences])

    const handleSave = async () => {
        // If nothing changed, just close without saving
        if (!hasChanges) {
            onClose()
            return
        }

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

    // Mount portal after client-side render
    useEffect(() => {
        setMounted(true)
        return () => setMounted(false)
    }, [])

    // Handle escape key
    useEffect(() => {
        if (!isOpen) return

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault()
                onClose()
            }
        }

        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [isOpen, onClose])

    const currentGenre = quizGenres[currentIndex]
    const progress = ((currentIndex + 1) / quizGenres.length) * 100
    const answeredCount = Object.keys(preferences).length

    if (!isOpen || !mounted) return null

    const modalContent = (
        <div className="fixed inset-0 z-modal flex items-center justify-center p-2 sm:p-4">
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
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="w-full px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-all duration-200 text-sm sm:text-base"
                    >
                        {isSaving
                            ? 'Saving...'
                            : answeredCount > 0
                              ? `Done (${answeredCount} rated)`
                              : 'Done'}
                    </button>
                </div>
            </div>
        </div>
    )

    // Render via portal to escape stacking contexts
    return createPortal(modalContent, document.body)
}

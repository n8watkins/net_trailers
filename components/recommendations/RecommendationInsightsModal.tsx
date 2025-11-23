/**
 * Recommendation Insights Modal
 *
 * Displays brief information about how recommendations work,
 * shows user's genre preferences, and offers quiz options.
 */

'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { XMarkIcon } from '@heroicons/react/24/outline'
import {
    SparklesIcon,
    Cog6ToothIcon,
    SwatchIcon,
    FilmIcon,
    HeartIcon,
    HandThumbDownIcon,
} from '@heroicons/react/24/solid'
import { GenrePreference } from '../../types/shared'
import { UNIFIED_GENRES } from '../../constants/unifiedGenres'

interface RecommendationInsightsModalProps {
    isOpen: boolean
    onClose: () => void
    onOpenGenreQuiz?: () => void
    onOpenTitleQuiz?: () => void
    genrePreferences?: GenrePreference[]
}

export default function RecommendationInsightsModal({
    isOpen,
    onClose,
    onOpenGenreQuiz,
    onOpenTitleQuiz,
    genrePreferences = [],
}: RecommendationInsightsModalProps) {
    const router = useRouter()

    if (!isOpen) return null

    const handleGoToSettings = () => {
        onClose()
        router.push('/settings/preferences')
    }

    // Get genre name from ID
    const getGenreName = (genreId: string): string => {
        const genre = UNIFIED_GENRES.find((g) => g.id === genreId)
        return genre?.name || genreId
    }

    // Separate loved and not-for-me genres
    const lovedGenres = genrePreferences.filter((p) => p.preference === 'love')
    const notForMeGenres = genrePreferences.filter((p) => p.preference === 'not_for_me')
    const hasGenrePreferences = genrePreferences.length > 0

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
                <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-700/50">
                    <div className="flex items-center gap-3">
                        <SparklesIcon className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-400" />
                        <h2 className="text-lg sm:text-xl font-bold text-white">
                            Your Recommendations
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors duration-200 p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:bg-white/10"
                    >
                        <XMarkIcon className="h-5 w-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 sm:p-6 space-y-4">
                    {/* Brief explanation */}
                    <p className="text-gray-300 text-sm leading-relaxed">
                        Recommendations are personalized based on your preferences and interactions.
                    </p>

                    {/* Settings Option - at top */}
                    <div className="flex items-center justify-between py-2 border-b border-gray-700/50">
                        <div className="flex items-center gap-2">
                            <Cog6ToothIcon className="w-5 h-5 text-gray-400" />
                            <span className="text-gray-300 text-sm">Manage Settings</span>
                        </div>
                        <button
                            onClick={handleGoToSettings}
                            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-xs font-medium transition-colors duration-200"
                        >
                            Settings
                        </button>
                    </div>

                    {/* Your Genre Preferences - show if user has taken quiz */}
                    {hasGenrePreferences && (
                        <div className="bg-gray-800/40 rounded-lg p-4 border border-gray-700/50">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-white font-semibold text-sm">
                                    Your Genre Preferences
                                </h3>
                                <button
                                    onClick={onOpenGenreQuiz}
                                    className="text-purple-400 hover:text-purple-300 text-xs font-medium transition-colors"
                                >
                                    Edit
                                </button>
                            </div>

                            {/* Loved genres */}
                            {lovedGenres.length > 0 && (
                                <div className="mb-3">
                                    <div className="flex items-center gap-1.5 mb-2">
                                        <HeartIcon className="w-3.5 h-3.5 text-pink-500" />
                                        <span className="text-gray-400 text-xs">Love</span>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {lovedGenres.map((pref) => (
                                            <span
                                                key={pref.genreId}
                                                className="px-2 py-1 bg-pink-500/20 text-pink-300 rounded text-xs"
                                            >
                                                {getGenreName(pref.genreId)}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Not for me genres */}
                            {notForMeGenres.length > 0 && (
                                <div>
                                    <div className="flex items-center gap-1.5 mb-2">
                                        <HandThumbDownIcon className="w-3.5 h-3.5 text-red-500" />
                                        <span className="text-gray-400 text-xs">Not for me</span>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {notForMeGenres.map((pref) => (
                                            <span
                                                key={pref.genreId}
                                                className="px-2 py-1 bg-red-500/20 text-red-300 rounded text-xs"
                                            >
                                                {getGenreName(pref.genreId)}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Customize Section */}
                    <div className="bg-gray-800/40 rounded-lg p-4 border border-gray-700/50">
                        <h3 className="text-white font-semibold text-sm mb-2">
                            {hasGenrePreferences
                                ? 'Fine-tune Recommendations'
                                : 'Customize Your Experience'}
                        </h3>
                        <p className="text-gray-400 text-xs mb-4">
                            {hasGenrePreferences
                                ? 'Rate more titles or update your genre preferences.'
                                : 'Help us understand what you enjoy by rating genres or specific titles.'}
                        </p>

                        {/* Side by side quiz buttons */}
                        <div className="grid grid-cols-2 gap-3">
                            {/* Genre Quiz */}
                            <button
                                onClick={onOpenGenreQuiz}
                                disabled={!onOpenGenreQuiz}
                                className={`flex flex-col items-center gap-2 p-4 rounded-lg transition-all duration-200 ${
                                    onOpenGenreQuiz
                                        ? 'bg-purple-600/20 border border-purple-500/50 hover:bg-purple-600/30 hover:border-purple-500'
                                        : 'bg-gray-700/30 border border-gray-600/30 cursor-not-allowed opacity-60'
                                }`}
                            >
                                <SwatchIcon
                                    className={`w-8 h-8 ${onOpenGenreQuiz ? 'text-purple-400' : 'text-gray-500'}`}
                                />
                                <span
                                    className={`text-sm font-medium ${onOpenGenreQuiz ? 'text-purple-300' : 'text-gray-500'}`}
                                >
                                    {hasGenrePreferences ? 'Update Genres' : 'Rate Genres'}
                                </span>
                            </button>

                            {/* Title Quiz */}
                            <button
                                onClick={onOpenTitleQuiz}
                                disabled={!onOpenTitleQuiz}
                                className={`flex flex-col items-center gap-2 p-4 rounded-lg transition-all duration-200 ${
                                    onOpenTitleQuiz
                                        ? 'bg-pink-600/20 border border-pink-500/50 hover:bg-pink-600/30 hover:border-pink-500'
                                        : 'bg-gray-700/30 border border-gray-600/30 cursor-not-allowed opacity-60'
                                }`}
                            >
                                <FilmIcon
                                    className={`w-8 h-8 ${onOpenTitleQuiz ? 'text-pink-400' : 'text-gray-500'}`}
                                />
                                <span
                                    className={`text-sm font-medium ${onOpenTitleQuiz ? 'text-pink-300' : 'text-gray-500'}`}
                                >
                                    Rate Titles
                                </span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-4 sm:px-6 py-4 bg-gray-800/30 border-t border-gray-700/50">
                    <button
                        onClick={onClose}
                        className="w-full px-6 py-3 bg-gray-700 text-white rounded-lg font-medium transition-all duration-200 hover:bg-gray-600"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    )
}

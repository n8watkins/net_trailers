'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { XMarkIcon, FilmIcon, TvIcon, Squares2X2Icon } from '@heroicons/react/24/solid'
import { SystemRecommendation, SystemRecommendationId } from '../../types/recommendations'
import { useSessionStore } from '../../stores/sessionStore'
import { useAuthStore } from '../../stores/authStore'
import { useGuestStore } from '../../stores/guestStore'
import { useToastStore } from '../../stores/toastStore'
import { getUnifiedGenresByMediaType, UNIFIED_GENRES } from '../../constants/unifiedGenres'

// Common emoji options for system recommendations
const EMOJI_OPTIONS = [
    '🔥',
    '⭐',
    '✨',
    '🎬',
    '📺',
    '🎥',
    '🍿',
    '🎭',
    '🏆',
    '💎',
    '🌟',
    '⚡',
    '💫',
    '🎪',
    '🎯',
    '🚀',
    '💥',
    '🌈',
    '❤️',
    '👑',
]

interface SystemRecommendationEditorModalProps {
    recommendation: SystemRecommendation | null
    isOpen: boolean
    onClose: () => void
}

export default function SystemRecommendationEditorModal({
    recommendation,
    isOpen,
    onClose,
}: SystemRecommendationEditorModalProps) {
    // Form state
    const [name, setName] = useState('')
    const [emoji, setEmoji] = useState('')
    const [mediaType, setMediaType] = useState<'movie' | 'tv' | 'both'>('both')
    const [selectedGenres, setSelectedGenres] = useState<string[]>([])
    const [isSaving, setIsSaving] = useState(false)

    // Stores
    const sessionType = useSessionStore((state) => state.sessionType)
    const isGuest = sessionType === 'guest'
    const authUpdateSystemRecommendation = useAuthStore((state) => state.updateSystemRecommendation)
    const guestUpdateSystemRecommendation = useGuestStore(
        (state) => state.updateSystemRecommendation
    )
    const updateSystemRecommendation = isGuest
        ? guestUpdateSystemRecommendation
        : authUpdateSystemRecommendation

    // Get child safety mode
    const authChildSafetyMode = useAuthStore((state) => state.childSafetyMode)
    const guestChildSafetyMode = useGuestStore((state) => state.childSafetyMode)
    const childSafetyMode = isGuest ? guestChildSafetyMode : authChildSafetyMode

    const { showToast } = useToastStore()

    // Get available genres based on media type and child safety
    const availableGenres = useMemo(() => {
        return getUnifiedGenresByMediaType(mediaType, childSafetyMode)
    }, [mediaType, childSafetyMode])

    // Initialize form when recommendation changes
    useEffect(() => {
        if (recommendation) {
            setName(recommendation.name)
            setEmoji(recommendation.emoji || '')
            setMediaType(recommendation.mediaType || 'both')
            setSelectedGenres(recommendation.genres || [])
        }
    }, [recommendation])

    // Reset form when modal closes
    useEffect(() => {
        if (!isOpen) {
            setName('')
            setEmoji('')
            setMediaType('both')
            setSelectedGenres([])
            setIsSaving(false)
        }
    }, [isOpen])

    // Handle body scroll lock
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = 'unset'
        }

        return () => {
            document.body.style.overflow = 'unset'
        }
    }, [isOpen])

    // Handle escape key to close modal
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

    // Toggle genre selection
    const handleGenreToggle = useCallback((genreId: string) => {
        setSelectedGenres((prev) => {
            if (prev.includes(genreId)) {
                return prev.filter((g) => g !== genreId)
            } else {
                return [...prev, genreId]
            }
        })
    }, [])

    // Save changes
    const handleSave = async () => {
        if (!recommendation) return

        setIsSaving(true)

        try {
            await updateSystemRecommendation(recommendation.id, {
                name: name.trim(),
                emoji: emoji,
                mediaType: mediaType,
                genres: selectedGenres,
            })

            showToast('success', `"${name.trim()}" updated successfully`)
            onClose()
        } catch (error) {
            console.error('Failed to update system recommendation:', error)
            showToast('error', 'Failed to update recommendation')
        } finally {
            setIsSaving(false)
        }
    }

    // Get display title for the recommendation type
    const getTypeLabel = (id: SystemRecommendationId): string => {
        switch (id) {
            case 'trending':
                return 'Trending'
            case 'top-rated':
                return 'Top Rated'
            case 'recommended-for-you':
                return 'Recommended For You'
            default:
                return 'System Row'
        }
    }

    if (!isOpen || !recommendation) return null

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-[60] bg-black/70" onClick={onClose} />

            {/* Modal */}
            <div
                className="fixed inset-0 z-[60] flex items-center justify-center p-4"
                role="dialog"
                aria-modal="true"
                aria-labelledby="system-rec-editor-title"
            >
                <div
                    className="bg-[#141414] rounded-lg w-full max-w-lg max-h-[90vh] overflow-hidden shadow-xl"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-gray-700">
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">{emoji || '⚙️'}</span>
                            <div>
                                <h2
                                    id="system-rec-editor-title"
                                    className="text-xl font-bold text-white"
                                >
                                    Edit {getTypeLabel(recommendation.id)}
                                </h2>
                                <p className="text-sm text-gray-400">Customize this system row</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-700 rounded-full transition-colors"
                        >
                            <XMarkIcon className="w-6 h-6 text-gray-400" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-4 overflow-y-auto max-h-[60vh] space-y-6">
                        {/* Name Field */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Display Name
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder={getTypeLabel(recommendation.id)}
                                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
                            />
                        </div>

                        {/* Emoji Selector */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Emoji Icon
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {EMOJI_OPTIONS.map((e) => (
                                    <button
                                        key={e}
                                        onClick={() => setEmoji(emoji === e ? '' : e)}
                                        className={`w-10 h-10 flex items-center justify-center text-xl rounded-lg transition-all ${
                                            emoji === e
                                                ? 'bg-red-600 ring-2 ring-red-400'
                                                : 'bg-gray-800 hover:bg-gray-700'
                                        }`}
                                    >
                                        {e}
                                    </button>
                                ))}
                            </div>
                            {emoji && (
                                <button
                                    onClick={() => setEmoji('')}
                                    className="mt-2 text-sm text-gray-400 hover:text-gray-300"
                                >
                                    Clear emoji
                                </button>
                            )}
                        </div>

                        {/* Media Type Selector */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Content Type
                            </label>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setMediaType('both')}
                                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-all ${
                                        mediaType === 'both'
                                            ? 'bg-red-600 text-white'
                                            : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                                    }`}
                                >
                                    <Squares2X2Icon className="w-5 h-5" />
                                    <span>Both</span>
                                </button>
                                <button
                                    onClick={() => setMediaType('movie')}
                                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-all ${
                                        mediaType === 'movie'
                                            ? 'bg-red-600 text-white'
                                            : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                                    }`}
                                >
                                    <FilmIcon className="w-5 h-5" />
                                    <span>Movies</span>
                                </button>
                                <button
                                    onClick={() => setMediaType('tv')}
                                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-all ${
                                        mediaType === 'tv'
                                            ? 'bg-red-600 text-white'
                                            : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                                    }`}
                                >
                                    <TvIcon className="w-5 h-5" />
                                    <span>TV Shows</span>
                                </button>
                            </div>
                        </div>

                        {/* Genre Filter */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Genre Filter (Optional)
                            </label>
                            <p className="text-sm text-gray-500 mb-3">
                                Select genres to filter results. Leave empty to show all genres.
                            </p>
                            <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 bg-gray-800/50 rounded-lg">
                                {availableGenres.map((genre) => (
                                    <button
                                        key={genre.id}
                                        onClick={() => handleGenreToggle(genre.id)}
                                        className={`px-3 py-1.5 text-sm rounded-full transition-all ${
                                            selectedGenres.includes(genre.id)
                                                ? 'bg-red-600 text-white'
                                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                        }`}
                                    >
                                        {genre.name}
                                    </button>
                                ))}
                            </div>
                            {selectedGenres.length > 0 && (
                                <button
                                    onClick={() => setSelectedGenres([])}
                                    className="mt-2 text-sm text-gray-400 hover:text-gray-300"
                                >
                                    Clear all genres ({selectedGenres.length} selected)
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex justify-end gap-3 p-4 border-t border-gray-700">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                            disabled={isSaving}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
                            disabled={isSaving || !name.trim()}
                        >
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </div>
            </div>
        </>
    )
}

'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { XMarkIcon, FilmIcon, TvIcon } from '@heroicons/react/24/outline'
import { SystemRecommendation, DEFAULT_SYSTEM_RECOMMENDATIONS } from '../../types/recommendations'
import { useToast } from '../../hooks/useToast'
import { GenrePills } from '../collections/GenrePills'
import { getUnifiedGenresByMediaType } from '../../constants/unifiedGenres'
import { useChildSafety } from '../../hooks/useChildSafety'
import { useSessionStore } from '../../stores/sessionStore'
import { useAuthStore } from '../../stores/authStore'
import { useGuestStore } from '../../stores/guestStore'
import {
    generateSystemRecommendationName,
    getSystemRecommendationEmoji,
} from '../../utils/systemRecommendationNames'

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
    const { isEnabled: isChildSafetyEnabled } = useChildSafety()
    const sessionType = useSessionStore((state) => state.sessionType)
    const isGuest = sessionType === 'guest'

    // Get update function from appropriate store
    const authUpdateSystemRecommendation = useAuthStore((state) => state.updateSystemRecommendation)
    const guestUpdateSystemRecommendation = useGuestStore(
        (state) => state.updateSystemRecommendation
    )
    const updateSystemRecommendation = isGuest
        ? guestUpdateSystemRecommendation
        : authUpdateSystemRecommendation

    const GENRE_LOOKUP = useMemo(() => {
        const map = new Map<string, string>()
        const allGenres = getUnifiedGenresByMediaType('both', isChildSafetyEnabled)
        allGenres.forEach((genre) => {
            map.set(genre.id, genre.name)
        })
        return map
    }, [isChildSafetyEnabled])

    const { showSuccess, showError } = useToast()

    // Form state
    const [displayAsRow, setDisplayAsRow] = useState(true)
    const [mediaType, setMediaType] = useState<'movie' | 'tv' | 'both'>('both')
    const [selectedGenres, setSelectedGenres] = useState<string[]>([])

    // Check if this is an actors/directors row (no genre support)
    const isPersonRow =
        recommendation?.id.includes('actors') || recommendation?.id.includes('directors')

    // Auto-generated name based on current selections
    const generatedName = useMemo(() => {
        if (!recommendation) return ''
        return generateSystemRecommendationName({
            recommendationId: recommendation.id,
            mediaType,
            genres: isPersonRow ? [] : selectedGenres,
        })
    }, [recommendation, mediaType, selectedGenres, isPersonRow])

    // Get emoji for this recommendation type
    const emoji = recommendation ? getSystemRecommendationEmoji(recommendation.id) : ''

    // UI state
    const [showGenreModal, setShowGenreModal] = useState(false)
    const [mounted, setMounted] = useState(false)
    const [highlightMediaType, setHighlightMediaType] = useState(false)
    const [isSaving, setIsSaving] = useState(false)

    // Media type enabled states (independent toggles)
    const [isMovieEnabled, setIsMovieEnabled] = useState(true)
    const [isTVEnabled, setIsTVEnabled] = useState(true)

    // Track mousedown location for click-outside detection
    const mouseDownTargetRef = useRef<EventTarget | null>(null)
    const genreModalMouseDownTargetRef = useRef<EventTarget | null>(null)

    // Mount the portal after client-side render
    useEffect(() => {
        setMounted(true)
        return () => setMounted(false)
    }, [])

    // Load recommendation data when modal opens
    useEffect(() => {
        if (recommendation && isOpen) {
            setDisplayAsRow(recommendation.enabled)
            const recMediaType = recommendation.mediaType || 'both'
            setMediaType(recMediaType)
            // Set individual enabled states based on media type
            setIsMovieEnabled(recMediaType === 'movie' || recMediaType === 'both')
            setIsTVEnabled(recMediaType === 'tv' || recMediaType === 'both')
            setSelectedGenres(recommendation.genres || [])
            setHighlightMediaType(false)
        }
    }, [recommendation, isOpen])

    // Sync mediaType with individual enabled states
    useEffect(() => {
        if (isMovieEnabled && isTVEnabled) {
            setMediaType('both')
        } else if (isMovieEnabled) {
            setMediaType('movie')
        } else if (isTVEnabled) {
            setMediaType('tv')
        } else {
            // Both disabled - keep as 'both' for storage but UI shows both off
            setMediaType('both')
        }
    }, [isMovieEnabled, isTVEnabled])

    // Auto-disable display on page when both media types are disabled
    useEffect(() => {
        if (!isMovieEnabled && !isTVEnabled && displayAsRow) {
            setDisplayAsRow(false)
        }
    }, [isMovieEnabled, isTVEnabled, displayAsRow])

    // Handle escape key to close modal (respecting nested modals)
    useEffect(() => {
        if (!isOpen) return

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault()
                if (showGenreModal) {
                    setShowGenreModal(false)
                } else {
                    onClose()
                }
            }
        }

        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [isOpen, showGenreModal, onClose])

    if (!isOpen || !recommendation) return null

    // Get the display title (e.g., "Edit 🔥 Trending" or "Edit ⭐ Top Rated")
    const getModalTitle = () => {
        return `Edit ${emoji} ${generatedName}`
    }

    const resetModalState = () => {
        setDisplayAsRow(true)
        setMediaType('both')
        setIsMovieEnabled(true)
        setIsTVEnabled(true)
        setSelectedGenres([])
        setHighlightMediaType(false)
    }

    const handleClose = async (options?: { skipWaitForSave?: boolean }) => {
        const shouldAwaitSave = !(options?.skipWaitForSave ?? false)

        if (shouldAwaitSave) {
            await handleSave()
        } else {
            void handleSave()
        }

        onClose()
        resetModalState()
    }

    const handleSave = async () => {
        setIsSaving(true)

        try {
            await updateSystemRecommendation(recommendation.id, {
                name: generatedName,
                enabled: displayAsRow,
                mediaType,
                genres: isPersonRow ? [] : selectedGenres,
            })
        } catch (error) {
            console.error('Save system recommendation error:', error)
            const description = error instanceof Error ? error.message : undefined
            showError('Failed to save changes', description)
        } finally {
            setIsSaving(false)
        }
    }

    const handleMediaTypeToggle = (type: 'movie' | 'tv') => {
        if (type === 'movie') {
            setIsMovieEnabled(!isMovieEnabled)
        } else {
            setIsTVEnabled(!isTVEnabled)
        }
    }

    const handleDisplayOnPageToggle = () => {
        // Check if no media types are selected
        if (!isMovieEnabled && !isTVEnabled) {
            setHighlightMediaType(true)
            showError(
                'Enable a media type first',
                'You must select Movies or TV Shows before displaying this row on the page'
            )
            setTimeout(() => setHighlightMediaType(false), 2000)
            return
        }
        setDisplayAsRow(!displayAsRow)
    }

    const handleResetToDefault = async () => {
        if (!recommendation) return

        // Find the default settings for this recommendation
        const defaultRec = DEFAULT_SYSTEM_RECOMMENDATIONS.find((r) => r.id === recommendation.id)
        if (!defaultRec) {
            showError('Could not find default settings')
            return
        }

        // Reset all customizable fields to defaults in local state
        setMediaType(defaultRec.mediaType)
        setIsMovieEnabled(defaultRec.mediaType === 'movie' || defaultRec.mediaType === 'both')
        setIsTVEnabled(defaultRec.mediaType === 'tv' || defaultRec.mediaType === 'both')
        setSelectedGenres(defaultRec.genres || [])
        setDisplayAsRow(defaultRec.enabled)

        // Save the default settings to the store immediately
        try {
            await updateSystemRecommendation(recommendation.id, {
                name: defaultRec.name,
                enabled: defaultRec.enabled,
                mediaType: defaultRec.mediaType,
                genres: defaultRec.genres || [],
            })
            showSuccess('Reset to default settings')
        } catch (error) {
            console.error('Failed to reset to defaults:', error)
            showError('Failed to reset to defaults')
        }
    }

    // Check if any media type is enabled
    const hasMediaTypeEnabled = isMovieEnabled || isTVEnabled

    const selectedGenreNames = selectedGenres.map((id) => GENRE_LOOKUP.get(id) || `Genre ${id}`)

    const modalContent = (
        <div className="fixed inset-0 z-modal-editor overflow-y-auto">
            {/* Backdrop */}
            <div className="fixed inset-0 z-modal-editor-bg bg-black/80 backdrop-blur-sm pointer-events-none" />

            {/* Modal */}
            <div
                className="relative min-h-screen flex items-center justify-center p-4 z-modal-editor"
                onMouseDown={(e) => {
                    if (e.target === e.currentTarget) {
                        mouseDownTargetRef.current = e.target
                    }
                }}
                onMouseUp={(e) => {
                    if (e.target === e.currentTarget && mouseDownTargetRef.current === e.target) {
                        void handleClose({ skipWaitForSave: true })
                    }
                    mouseDownTargetRef.current = null
                }}
            >
                <div
                    className="relative z-modal-editor bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] rounded-lg shadow-2xl w-full max-w-xl border border-gray-700"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-gray-700">
                        <h2 className="text-2xl font-bold text-white">{getModalTitle()}</h2>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleResetToDefault}
                                className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                            >
                                Reset to Default
                            </button>
                            <button
                                type="button"
                                onClick={() => handleClose()}
                                className="text-gray-400 hover:text-white transition-colors"
                            >
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-6">
                        {/* Display on Page Toggle */}
                        <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium text-white flex items-center gap-2">
                                    <span>🏠</span>
                                    Display on Page
                                </label>
                                <button
                                    type="button"
                                    onClick={handleDisplayOnPageToggle}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                        displayAsRow ? 'bg-green-600' : 'bg-gray-600'
                                    } ${!hasMediaTypeEnabled ? 'opacity-50 cursor-pointer' : ''}`}
                                >
                                    <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                            displayAsRow ? 'translate-x-6' : 'translate-x-1'
                                        }`}
                                    />
                                </button>
                            </div>
                            <p className="text-xs text-gray-400 mt-2">
                                {displayAsRow
                                    ? 'This row will be visible on the homepage'
                                    : 'This row will be hidden from the homepage'}
                            </p>
                        </div>

                        {/* Media Type and Genres - Side by side (or just media type for person rows) */}
                        <div
                            className={`grid gap-4 ${isPersonRow ? 'grid-cols-1' : 'grid-cols-2'}`}
                        >
                            {/* Media Type Selection */}
                            <div
                                className={`bg-gray-800/50 rounded-lg border p-4 transition-all duration-500 ${
                                    highlightMediaType
                                        ? 'border-yellow-500 bg-yellow-500/20'
                                        : 'border-gray-700'
                                }`}
                            >
                                <div className="space-y-3">
                                    <p className="text-sm font-medium text-white">Media Type</p>
                                    <div className="space-y-2">
                                        {/* Movies Toggle */}
                                        <div className="flex items-center justify-between">
                                            <label className="text-sm font-medium text-white flex items-center gap-2">
                                                <FilmIcon className="w-4 h-4" />
                                                Movies
                                            </label>
                                            <button
                                                type="button"
                                                onClick={() => handleMediaTypeToggle('movie')}
                                                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                                                    isMovieEnabled ? 'bg-red-600' : 'bg-gray-600'
                                                }`}
                                            >
                                                <span
                                                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                                                        isMovieEnabled
                                                            ? 'translate-x-5'
                                                            : 'translate-x-0.5'
                                                    }`}
                                                />
                                            </button>
                                        </div>

                                        {/* TV Shows Toggle */}
                                        <div className="flex items-center justify-between">
                                            <label className="text-sm font-medium text-white flex items-center gap-2">
                                                <TvIcon className="w-4 h-4" />
                                                TV Shows
                                            </label>
                                            <button
                                                type="button"
                                                onClick={() => handleMediaTypeToggle('tv')}
                                                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                                                    isTVEnabled ? 'bg-red-600' : 'bg-gray-600'
                                                }`}
                                            >
                                                <span
                                                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                                                        isTVEnabled
                                                            ? 'translate-x-5'
                                                            : 'translate-x-0.5'
                                                    }`}
                                                />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Genres - only show for non-person rows */}
                            {!isPersonRow && (
                                <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-4">
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-medium text-white">Genres</p>
                                            <button
                                                type="button"
                                                onClick={() => setShowGenreModal(true)}
                                                className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors whitespace-nowrap"
                                            >
                                                Edit
                                            </button>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedGenres.length === 0 ? (
                                                <span className="px-4 py-2 rounded-full text-sm font-medium bg-red-600 text-white">
                                                    All Genres
                                                </span>
                                            ) : (
                                                selectedGenres.map((genreId, index) => (
                                                    <span
                                                        key={`${genreId}-${index}`}
                                                        className="group relative px-4 py-2 rounded-full text-sm font-medium bg-red-600 text-white"
                                                    >
                                                        {selectedGenreNames[index]}
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setSelectedGenres(
                                                                    selectedGenres.filter(
                                                                        (_, i) => i !== index
                                                                    )
                                                                )
                                                            }
                                                            className="absolute -top-1 -right-1 w-5 h-5 bg-white hover:bg-gray-200 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                                                            title="Remove genre"
                                                        >
                                                            <XMarkIcon className="w-3 h-3 text-slate-600" />
                                                        </button>
                                                    </span>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )

    // Genre Modal
    const genreModal = showGenreModal && (
        <div className="fixed inset-0 z-modal-editor-inner overflow-y-auto">
            {/* Backdrop */}
            <div className="fixed inset-0 z-modal-editor bg-black/80 backdrop-blur-sm pointer-events-none" />

            {/* Modal */}
            <div
                className="relative min-h-screen flex items-center justify-center p-4 z-modal-editor-inner"
                onMouseDown={(e) => {
                    if (e.target === e.currentTarget) {
                        genreModalMouseDownTargetRef.current = e.target
                    }
                }}
                onMouseUp={(e) => {
                    if (
                        e.target === e.currentTarget &&
                        genreModalMouseDownTargetRef.current === e.target
                    ) {
                        setShowGenreModal(false)
                    }
                    genreModalMouseDownTargetRef.current = null
                }}
            >
                <div
                    className="relative z-modal-editor-inner bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] rounded-lg shadow-2xl max-w-4xl w-full border border-gray-700"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-gray-700">
                        <div>
                            <h3 className="text-xl font-bold text-white">Filter by Genres</h3>
                        </div>
                        <button
                            onClick={() => setShowGenreModal(false)}
                            className="text-gray-400 hover:text-white transition-colors"
                        >
                            <XMarkIcon className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 max-h-[calc(90vh-200px)] overflow-y-auto">
                        {/* Genre Pills */}
                        <div>
                            <div className="mb-3">
                                <div className="flex items-baseline justify-between mb-2">
                                    <p className="text-sm font-medium text-gray-300">
                                        Genres{' '}
                                        {selectedGenres.length === 0
                                            ? '(Any)'
                                            : `(${selectedGenres.length})`}
                                    </p>
                                    <p className="text-xs text-gray-400">Select up to 3</p>
                                </div>
                                <p className="text-xs text-gray-400">
                                    Filter {recommendation.name} results to specific genres
                                </p>
                            </div>
                            <GenrePills
                                selectedGenres={selectedGenres}
                                onChange={setSelectedGenres}
                                mediaType={mediaType}
                                childSafeMode={isChildSafetyEnabled}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )

    // Render via portal to document.body to escape any parent stacking contexts
    if (!mounted || typeof window === 'undefined') return null
    return (
        <>
            {createPortal(modalContent, document.body)}
            {showGenreModal && createPortal(genreModal, document.body)}
        </>
    )
}

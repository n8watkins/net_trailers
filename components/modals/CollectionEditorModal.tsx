'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import {
    XMarkIcon,
    QuestionMarkCircleIcon,
    MagnifyingGlassIcon,
    FilmIcon,
    TvIcon,
    TrashIcon,
} from '@heroicons/react/24/outline'
import { UserList } from '../../types/collections'
import { Content, getTitle, getYear } from '../../typings'
import useUserData from '../../hooks/useUserData'
import { useToast } from '../../hooks/useToast'
import IconPickerModal from './IconPickerModal'
import ColorPickerModal from './ColorPickerModal'
import InlineSearchBar from './InlineSearchBar'
import { GenrePills } from '../collections/GenrePills'
import { getUnifiedGenresByMediaType } from '../../constants/unifiedGenres'
import { useChildSafety } from '../../hooks/useChildSafety'
import { useCollectionPrefsStore } from '../../stores/collectionPrefsStore'
import { useSessionStore } from '../../stores/sessionStore'
import { SystemRowStorage } from '../../utils/systemRowStorage'

interface CollectionEditorModalProps {
    collection: UserList | null
    isOpen: boolean
    onClose: () => void
}

export default function CollectionEditorModal({
    collection,
    isOpen,
    onClose,
}: CollectionEditorModalProps) {
    const { isEnabled: isChildSafetyEnabled } = useChildSafety()
    const getUserId = useSessionStore((state) => state.getUserId)
    const sessionType = useSessionStore((state) => state.sessionType)
    const userId = getUserId()
    const isAuth = sessionType === 'authenticated'
    const deleteSystemRow = useCollectionPrefsStore((state) => state.deleteSystemRow)

    const GENRE_LOOKUP = useMemo(() => {
        const map = new Map<string, string>()
        const allGenres = getUnifiedGenresByMediaType('both', isChildSafetyEnabled)
        allGenres.forEach((genre) => {
            map.set(genre.id, genre.name)
        })
        return map
    }, [isChildSafetyEnabled])

    const { updateList, addToList, removeFromList, deleteList } = useUserData()
    const { showSuccess, showError } = useToast()

    // Collection metadata
    const [name, setName] = useState('')
    const [emoji, setEmoji] = useState('📺')
    const [color, setColor] = useState('#3b82f6')
    const [displayAsRow, setDisplayAsRow] = useState(true)
    const [enableInfiniteContent, setEnableInfiniteContent] = useState(false)
    const [mediaType, setMediaType] = useState<'movie' | 'tv' | 'both'>('both')
    const [selectedGenres, setSelectedGenres] = useState<string[]>([])
    const [genreLogic, setGenreLogic] = useState<'AND' | 'OR'>('AND')

    // UI state
    const [showIconPicker, setShowIconPicker] = useState(false)
    const [showColorPicker, setShowColorPicker] = useState(false)
    const [showInfiniteTooltip, setShowInfiniteTooltip] = useState(false)
    const [showGenreModal, setShowGenreModal] = useState(false)
    const [searchFilter, setSearchFilter] = useState('')
    const [isSaving, setIsSaving] = useState(false)
    const [mounted, setMounted] = useState(false)
    const [highlightMediaType, setHighlightMediaType] = useState(false)

    // Media type enabled states (independent toggles)
    const [isMovieEnabled, setIsMovieEnabled] = useState(true)
    const [isTVEnabled, setIsTVEnabled] = useState(true)

    // Content management
    const [content, setContent] = useState<Content[]>([])
    const [removedIds, setRemovedIds] = useState<Set<number>>(new Set())

    // Track mousedown location for click-outside detection
    const mouseDownTargetRef = React.useRef<EventTarget | null>(null)
    const genreModalMouseDownTargetRef = React.useRef<EventTarget | null>(null)

    // Mount the portal after client-side render
    useEffect(() => {
        setMounted(true)
        return () => setMounted(false)
    }, [])

    // Load collection data when modal opens
    useEffect(() => {
        if (collection && isOpen) {
            setName(collection.name)
            setEmoji(collection.emoji || '📺')
            setColor(collection.color || '#3b82f6')
            setDisplayAsRow(collection.displayAsRow ?? true)
            const collectionMediaType = collection.mediaType || 'both'
            setMediaType(collectionMediaType)
            // Set individual enabled states based on media type
            setIsMovieEnabled(collectionMediaType === 'movie' || collectionMediaType === 'both')
            setIsTVEnabled(collectionMediaType === 'tv' || collectionMediaType === 'both')
            setSelectedGenres(collection.genres || [])
            setGenreLogic(
                collection.genreLogic || ((collection.genres?.length ?? 0) >= 2 ? 'AND' : 'OR')
            )
            setEnableInfiniteContent(
                collection.canGenerateMore ?? !!(collection.genres && collection.genres.length > 0)
            )
            setContent(collection.items || [])
            setRemovedIds(new Set())
            setSearchFilter('')
            setHighlightMediaType(false)
        }
    }, [collection, isOpen])

    useEffect(() => {
        if (enableInfiniteContent && selectedGenres.length === 0) {
            setEnableInfiniteContent(false)
        }
    }, [enableInfiniteContent, selectedGenres.length])

    // Auto-set genre logic based on infinite content toggle
    useEffect(() => {
        if (enableInfiniteContent) {
            setGenreLogic('OR') // Match ANY for infinite generation
        } else {
            setGenreLogic('AND') // Match ALL by default (more strict)
        }
    }, [enableInfiniteContent])

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

    if (!isOpen || !collection) return null

    // Determine editing capabilities based on collection properties
    const isSystemCollection = collection.isSystemCollection || collection.id.startsWith('system-')
    const canEditFull = !isSystemCollection // User-created collections get full editing
    const canEditLimited = isSystemCollection && collection.canEdit // Editable system collections (Action, Comedy, etc.)
    const canOnlyToggle = isSystemCollection && !collection.canEdit // Non-editable system collections (Trending, Top Rated)

    const resetModalState = () => {
        setName('')
        setEmoji('📺')
        setColor('#3b82f6')
        setDisplayAsRow(true)
        setEnableInfiniteContent(false)
        setMediaType('both')
        setIsMovieEnabled(true)
        setIsTVEnabled(true)
        setSelectedGenres([])
        setGenreLogic('AND')
        setContent([])
        setRemovedIds(new Set())
        setSearchFilter('')
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

    const handleDelete = async () => {
        if (!collection) return

        const confirmMessage = isSystemCollection
            ? `Are you sure you want to delete "${collection.name}"? This system collection can be restored later.`
            : `Are you sure you want to delete "${collection.name}"? This action cannot be undone.`

        if (!window.confirm(confirmMessage)) return

        try {
            if (isSystemCollection) {
                if (!userId) {
                    showError('No user ID found')
                    return
                }
                // Delete system collection
                await deleteSystemRow(userId, collection.id)
                showSuccess('Collection deleted!', `"${collection.name}" has been removed`)
            } else {
                // Delete user-created collection
                await deleteList(collection.id)
                showSuccess('Collection deleted!', `"${collection.name}" has been removed`)
            }
            handleClose()
        } catch (error) {
            console.error('Delete collection error:', error)
            const description = error instanceof Error ? error.message : undefined
            showError('Failed to delete collection', description)
        }
    }

    const handleSave = async () => {
        // For non-toggle-only collections, validate name
        if (!canOnlyToggle && !name.trim()) {
            showError('Please enter a collection name')
            return
        }

        if (enableInfiniteContent && selectedGenres.length === 0) {
            showError('Add at least one genre', 'Infinite content requires genre filters')
            return
        }

        setIsSaving(true)

        try {
            // Build update object based on edit capabilities
            let updates: Partial<typeof collection> = {}

            if (canOnlyToggle) {
                // For non-editable system collections (Trending, Top Rated)
                // Only update displayAsRow (enable/disable)
                updates = {
                    displayAsRow,
                }
            } else if (canEditLimited) {
                // For editable system collections (Action, Comedy, etc.)
                // Update name, emoji, displayAsRow, genres, genreLogic
                updates = {
                    name: name.trim(),
                    emoji,
                    displayAsRow,
                    genres: selectedGenres,
                    genreLogic,
                }
            } else {
                // For user-created collections
                // Update everything
                updates = {
                    name: name.trim(),
                    emoji,
                    color,
                    displayAsRow,
                    genres: selectedGenres,
                    genreLogic,
                    mediaType,
                    canGenerateMore: enableInfiniteContent && selectedGenres.length > 0,
                }
            }

            // Update collection metadata
            if (isSystemCollection) {
                // For system collections, update the system row preferences
                if (!userId) {
                    showError('No user ID found')
                    return
                }

                // Get current preferences
                const currentPrefs =
                    useCollectionPrefsStore.getState().systemRowPreferences.get(userId) || {}

                // Build the updated preference for this row (only include defined values)
                const updatedPref: any = {
                    enabled: displayAsRow,
                    order: currentPrefs[collection.id]?.order ?? 0,
                }

                // Only add optional fields if they have values
                if (canEditLimited && name.trim()) {
                    updatedPref.customName = name.trim()
                } else if (currentPrefs[collection.id]?.customName) {
                    updatedPref.customName = currentPrefs[collection.id].customName
                }

                if (canEditLimited && selectedGenres.length > 0) {
                    updatedPref.customGenres = selectedGenres
                } else if (currentPrefs[collection.id]?.customGenres) {
                    updatedPref.customGenres = currentPrefs[collection.id].customGenres
                }

                if (canEditLimited) {
                    updatedPref.customGenreLogic = genreLogic
                } else if (currentPrefs[collection.id]?.customGenreLogic) {
                    updatedPref.customGenreLogic = currentPrefs[collection.id].customGenreLogic
                }

                // Update in-memory state
                const newPrefs = {
                    ...currentPrefs,
                    [collection.id]: updatedPref,
                }
                useCollectionPrefsStore.getState().setSystemRowPreferences(userId, newPrefs)

                // Persist to storage
                await SystemRowStorage.setSystemRowPreferences(userId, newPrefs, !isAuth)
            } else {
                // For user-created collections, use the regular update method
                await updateList(collection.id, updates)

                // Handle removed items (only for user-created collections)
                if (canEditFull) {
                    for (const removedId of removedIds) {
                        await removeFromList(collection.id, removedId)
                    }
                }
            }

            // Don't show success toast for auto-save on close
            // Don't call handleClose here anymore (creates circular call)
        } catch (error) {
            console.error('Save collection error:', error)
            const description = error instanceof Error ? error.message : undefined
            showError('Failed to save collection', description)
        } finally {
            setIsSaving(false)
        }
    }

    const handleRemoveContent = (contentId: number) => {
        setRemovedIds((prev) => new Set(prev).add(contentId))
    }

    const handleAddContent = (newContent: Content) => {
        // Add to local state
        setContent((prev) => [...prev, newContent])
        // Add to actual collection
        addToList(collection.id, newContent)
    }

    const handleToggleInfinite = () => {
        if (!enableInfiniteContent && selectedGenres.length === 0) {
            showError('Add at least one genre', 'Select genres before enabling infinite content.')
            return
        }
        setEnableInfiniteContent((prev) => !prev)
    }

    const handleMediaTypeToggle = (type: 'movie' | 'tv') => {
        // Simple unrestricted toggle
        if (type === 'movie') {
            setIsMovieEnabled(!isMovieEnabled)
        } else {
            setIsTVEnabled(!isTVEnabled)
        }
        // With unified genre system, no need to clear genres when changing media type
    }

    const handleDisplayOnPageToggle = () => {
        // Check if no media types are selected
        if (!isMovieEnabled && !isTVEnabled) {
            // Highlight the media type container and show toast simultaneously
            setHighlightMediaType(true)
            showError(
                'Enable a media type first',
                'You must select Movies or TV Shows before displaying this collection on the page'
            )
            // Fade back after 2 seconds
            setTimeout(() => setHighlightMediaType(false), 2000)
            return
        }
        setDisplayAsRow(!displayAsRow)
    }

    // Check if any media type is enabled
    const hasMediaTypeEnabled = isMovieEnabled || isTVEnabled

    // Filter content based on search and removed IDs
    const visibleContent = content
        .filter((item) => !removedIds.has(item.id))
        .filter((item) => {
            if (!searchFilter.trim()) return true
            const title = getTitle(item).toLowerCase()
            return title.includes(searchFilter.toLowerCase().trim())
        })

    const selectedGenreNames = selectedGenres.map((id) => GENRE_LOOKUP.get(id) || `Genre ${id}`)

    const modalContent = (
        <div className="fixed inset-0 z-[99999] overflow-y-auto">
            {/* Backdrop */}
            <div className="fixed inset-0 z-[99998] bg-black/80 backdrop-blur-sm pointer-events-none" />

            {/* Modal */}
            <div
                className="relative min-h-screen flex items-center justify-center p-4 z-[99999]"
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
                    className={`relative z-[99999] bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] rounded-lg shadow-2xl w-full border border-gray-700 ${
                        isSystemCollection ? 'max-w-xl' : 'max-w-6xl'
                    }`}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-gray-700">
                        <div>
                            <h2 className="text-2xl font-bold text-white">Edit Collection</h2>
                        </div>

                        <div className="flex items-center gap-3">
                            {/* Delete button - show for user collections and deletable system collections */}
                            {(canEditFull ||
                                (isSystemCollection && collection.canDelete === true)) && (
                                <button
                                    onClick={handleDelete}
                                    className="px-3 py-2 bg-red-600/20 border border-red-600 text-red-400 rounded-lg font-medium transition-all duration-200 hover:bg-red-600/30 hover:text-red-300 flex items-center gap-2"
                                    title="Delete collection"
                                >
                                    <TrashIcon className="w-5 h-5" />
                                    <span className="hidden sm:inline">Delete</span>
                                </button>
                            )}

                            {/* Close button */}
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
                    <div className="p-6 max-h-[calc(90vh-200px)] overflow-y-auto">
                        <div className="space-y-6">
                            {/* For non-editable system collections, show minimal UI */}
                            {canOnlyToggle && (
                                <div className="text-center py-8">
                                    <p className="text-gray-300 mb-6">
                                        This is a core system collection with limited customization
                                        options.
                                    </p>
                                    <div className="inline-flex flex-col items-center gap-4 p-6 bg-gray-800/50 rounded-lg border border-gray-700">
                                        <div className="flex items-center justify-between gap-3 sm:gap-4 md:gap-6 lg:gap-8">
                                            <label className="text-sm font-medium text-white flex items-center gap-2">
                                                <span>🏠</span>
                                                Display on Page
                                            </label>
                                            <button
                                                type="button"
                                                onClick={() => setDisplayAsRow(!displayAsRow)}
                                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                                    displayAsRow ? 'bg-blue-600' : 'bg-gray-600'
                                                }`}
                                            >
                                                <span
                                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                                        displayAsRow
                                                            ? 'translate-x-6'
                                                            : 'translate-x-1'
                                                    }`}
                                                />
                                            </button>
                                        </div>
                                        <p className="text-xs text-gray-400 max-w-sm">
                                            {displayAsRow
                                                ? 'This collection will be visible on the page'
                                                : 'This collection will be hidden from the page'}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* For editable collections, show full or limited UI */}
                            {!canOnlyToggle && (
                                <>
                                    {/* Name, Icon, Color Section - Left Aligned */}
                                    <div className="flex items-center space-x-3">
                                        {/* Icon Picker */}
                                        <div className="relative flex-shrink-0">
                                            <button
                                                onClick={() => setShowIconPicker(true)}
                                                className="w-14 h-14 bg-gray-800 border border-gray-600 rounded-lg flex items-center justify-center text-3xl transition-all duration-200 hover:bg-gray-700 hover:border-gray-500"
                                                title="Choose an icon"
                                            >
                                                {emoji}
                                            </button>

                                            <IconPickerModal
                                                isOpen={showIconPicker}
                                                selectedIcon={emoji}
                                                onSelectIcon={(selectedEmoji) => {
                                                    setEmoji(selectedEmoji)
                                                    setShowIconPicker(false)
                                                }}
                                                onClose={() => setShowIconPicker(false)}
                                            />
                                        </div>

                                        {/* Color Picker - Available for user collections and editable system collections */}
                                        {(canEditFull || canEditLimited) && (
                                            <div className="relative flex-shrink-0">
                                                <button
                                                    onClick={() => setShowColorPicker(true)}
                                                    className="w-14 h-14 bg-gray-800 border-2 border-gray-700 rounded-lg transition-all duration-200 hover:bg-gray-700 hover:border-gray-600 p-2 flex items-center justify-center"
                                                    title="Choose a color"
                                                >
                                                    <div
                                                        className="w-full h-full rounded-md"
                                                        style={{ backgroundColor: color }}
                                                    />
                                                </button>

                                                <ColorPickerModal
                                                    isOpen={showColorPicker}
                                                    selectedColor={color}
                                                    onSelectColor={(selectedColor) => {
                                                        setColor(selectedColor)
                                                        setShowColorPicker(false)
                                                    }}
                                                    onClose={() => setShowColorPicker(false)}
                                                />
                                            </div>
                                        )}

                                        {/* Name Input */}
                                        <div className="flex-1">
                                            <input
                                                type="text"
                                                placeholder="Collection name"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                disabled={canOnlyToggle}
                                                className={`w-full max-w-md h-14 px-4 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                                    canOnlyToggle
                                                        ? 'opacity-50 cursor-not-allowed'
                                                        : ''
                                                }`}
                                            />
                                        </div>
                                    </div>

                                    {/* Toggle Settings Row - Display on Page and Infinite Content side by side */}
                                    <div className="grid grid-cols-2 gap-3">
                                        {/* Display on Page Toggle */}
                                        <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                                            <div className="flex items-center justify-between">
                                                <label className="text-sm font-medium text-white flex items-center gap-1.5">
                                                    <span>🏠</span>
                                                    Display on Page
                                                </label>
                                                <button
                                                    type="button"
                                                    onClick={handleDisplayOnPageToggle}
                                                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                                                        displayAsRow
                                                            ? 'bg-green-600'
                                                            : 'bg-gray-600'
                                                    } ${!hasMediaTypeEnabled ? 'opacity-50 cursor-pointer' : ''}`}
                                                >
                                                    <span
                                                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                                                            displayAsRow
                                                                ? 'translate-x-5'
                                                                : 'translate-x-0.5'
                                                        }`}
                                                    />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Infinite Content Toggle */}
                                        <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                                            <div className="relative flex items-center justify-between">
                                                <label className="text-sm font-medium text-white flex items-center gap-1.5">
                                                    <span>♾️</span>
                                                    Infinite Content
                                                    <button
                                                        type="button"
                                                        onMouseEnter={() =>
                                                            setShowInfiniteTooltip(true)
                                                        }
                                                        onMouseLeave={() =>
                                                            setShowInfiniteTooltip(false)
                                                        }
                                                        onClick={() =>
                                                            setShowInfiniteTooltip(
                                                                !showInfiniteTooltip
                                                            )
                                                        }
                                                        className="text-gray-400 hover:text-white relative"
                                                    >
                                                        <QuestionMarkCircleIcon className="w-4 h-4" />
                                                        {showInfiniteTooltip && (
                                                            <div
                                                                className={`absolute z-10 top-full left-1/2 -translate-x-1/2 mt-2 p-2 bg-gray-900 border border-gray-700 rounded-md shadow-xl whitespace-normal ${
                                                                    canEditFull
                                                                        ? 'max-w-xs'
                                                                        : 'w-64 max-w-none'
                                                                }`}
                                                            >
                                                                <p className="text-xs text-gray-300">
                                                                    {canEditFull
                                                                        ? 'After your curated titles, show more similar content based on genres'
                                                                        : 'This is a system collection that is infinite by default'}
                                                                </p>
                                                            </div>
                                                        )}
                                                    </button>
                                                </label>
                                                <button
                                                    type="button"
                                                    onClick={
                                                        canEditFull
                                                            ? handleToggleInfinite
                                                            : () => {
                                                                  showError(
                                                                      'Cannot disable infinite content',
                                                                      'This is a system collection that is infinite by default'
                                                                  )
                                                              }
                                                    }
                                                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                                                        enableInfiniteContent || !canEditFull
                                                            ? 'bg-red-600'
                                                            : 'bg-gray-600'
                                                    } ${!canEditFull ? 'opacity-50 cursor-pointer' : ''}`}
                                                >
                                                    <span
                                                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                                                            enableInfiniteContent || !canEditFull
                                                                ? 'translate-x-5'
                                                                : 'translate-x-0.5'
                                                        }`}
                                                    />
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Media Type and Genres - Side by side */}
                                    <div className="grid grid-cols-2 gap-3">
                                        {/* Media Type Selection */}
                                        <div
                                            className={`bg-gray-800/50 rounded-lg border p-4 transition-all duration-500 ${
                                                highlightMediaType
                                                    ? 'border-yellow-500 bg-yellow-500/20'
                                                    : 'border-gray-700'
                                            }`}
                                        >
                                            <div className="space-y-3">
                                                <p className="text-sm font-medium text-white">
                                                    Media Type
                                                </p>
                                                <div className="space-y-2">
                                                    {/* Movies Toggle */}
                                                    <div className="flex items-center justify-between">
                                                        <label className="text-sm font-medium text-white flex items-center gap-2">
                                                            <FilmIcon className="w-4 h-4" />
                                                            Movies
                                                        </label>
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                !canOnlyToggle &&
                                                                handleMediaTypeToggle('movie')
                                                            }
                                                            disabled={canOnlyToggle}
                                                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                                                                isMovieEnabled
                                                                    ? 'bg-red-600'
                                                                    : 'bg-gray-600'
                                                            } ${canOnlyToggle ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                                                            onClick={() =>
                                                                !canOnlyToggle &&
                                                                handleMediaTypeToggle('tv')
                                                            }
                                                            disabled={canOnlyToggle}
                                                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                                                                isTVEnabled
                                                                    ? 'bg-red-600'
                                                                    : 'bg-gray-600'
                                                            } ${canOnlyToggle ? 'opacity-50 cursor-not-allowed' : ''}`}
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

                                        {/* Genres */}
                                        <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-4">
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-gray-400">
                                                            {selectedGenres.length === 0 ? (
                                                                <>(Any)</>
                                                            ) : (
                                                                <>({selectedGenres.length})</>
                                                            )}
                                                        </span>
                                                        <p className="text-sm font-medium text-white">
                                                            Genres
                                                        </p>
                                                    </div>
                                                    {!canOnlyToggle && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowGenreModal(true)}
                                                            className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors whitespace-nowrap"
                                                        >
                                                            Edit
                                                        </button>
                                                    )}
                                                </div>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {selectedGenres.length === 0 ? (
                                                        <span className="px-2 py-0.5 text-xs rounded bg-red-600 text-white">
                                                            All Genres
                                                        </span>
                                                    ) : (
                                                        selectedGenreNames.map((name, index) => (
                                                            <span
                                                                key={`${name}-${index}`}
                                                                className="px-2 py-0.5 text-xs rounded bg-red-600 text-white"
                                                            >
                                                                {name}
                                                            </span>
                                                        ))
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* Content Management - Only for user-created collections */}
                            {canEditFull && (
                                <>
                                    {/* Add Content Search Bar - Left Aligned */}
                                    <div>
                                        <div className="w-full max-w-2xl">
                                            <InlineSearchBar
                                                onAddContent={handleAddContent}
                                                existingContentIds={content.map((c) => c.id)}
                                                placeholder="Search to add movies or TV shows..."
                                            />
                                        </div>
                                    </div>

                                    {/* Content Grid */}
                                    <div>
                                        <h3 className="text-lg font-semibold text-white mb-4">
                                            Collection Content ({visibleContent.length} titles
                                            {removedIds.size > 0 && (
                                                <span className="text-gray-500 ml-2">
                                                    · {removedIds.size} removed
                                                </span>
                                            )}
                                            )
                                        </h3>

                                        {/* Search Filter - Below heading */}
                                        <div className="mb-4">
                                            <div className="relative w-96">
                                                <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                                <input
                                                    type="text"
                                                    placeholder="Filter titles..."
                                                    value={searchFilter}
                                                    onChange={(e) =>
                                                        setSearchFilter(e.target.value)
                                                    }
                                                    className="w-full h-12 pl-12 pr-4 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                />
                                                {searchFilter && (
                                                    <button
                                                        onClick={() => setSearchFilter('')}
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                                                    >
                                                        <XMarkIcon className="h-5 w-5" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {visibleContent.length === 0 ? (
                                            <div className="text-center py-8 text-gray-400">
                                                No content in this collection. Use the search bar
                                                above to add titles.
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 max-h-[400px] overflow-y-auto p-2">
                                                {visibleContent.map((item) => (
                                                    <div
                                                        key={item.id}
                                                        className="group relative rounded-lg overflow-hidden bg-gray-800 hover:ring-2 hover:ring-red-600 transition-all"
                                                    >
                                                        {/* Remove Button */}
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                handleRemoveContent(item.id)
                                                            }}
                                                            className="
                                                        absolute top-2 left-1/2 -translate-x-1/2 z-50
                                                        w-8 h-8 rounded-full
                                                        bg-white shadow-lg
                                                        border-2 border-black
                                                        opacity-0 group-hover:opacity-100
                                                        transition-all duration-200
                                                        hover:scale-110
                                                        flex items-center justify-center
                                                    "
                                                            aria-label="Remove from collection"
                                                        >
                                                            <XMarkIcon className="h-5 w-5 text-black" />
                                                        </button>

                                                        {/* Poster */}
                                                        <div className="aspect-[2/3] relative">
                                                            {item.poster_path ? (
                                                                <Image
                                                                    src={`https://image.tmdb.org/t/p/w342${item.poster_path}`}
                                                                    alt={getTitle(item)}
                                                                    fill
                                                                    className="object-cover"
                                                                    sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 20vw"
                                                                />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center bg-gray-700 text-gray-500 text-xs p-2 text-center">
                                                                    {getTitle(item)}
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Hover overlay with info */}
                                                        <div className="absolute inset-0 bg-black/90 opacity-0 group-hover:opacity-100 transition-opacity p-2 flex flex-col justify-end">
                                                            <p className="text-white text-sm font-semibold line-clamp-2">
                                                                {getTitle(item)}
                                                            </p>
                                                            <p className="text-gray-400 text-xs">
                                                                {getYear(item)} • ⭐{' '}
                                                                {item.vote_average.toFixed(1)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )

    // Genre Modal
    const genreModal = showGenreModal && (
        <div className="fixed inset-0 z-[100000] overflow-y-auto">
            {/* Backdrop */}
            <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-sm pointer-events-none" />

            {/* Modal */}
            <div
                className="relative min-h-screen flex items-center justify-center p-4 z-[100000]"
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
                    className="relative z-[100000] bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] rounded-lg shadow-2xl max-w-4xl w-full border border-gray-700"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-gray-700">
                        <div>
                            <h3 className="text-xl font-bold text-white">Edit Genre Collections</h3>
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
                                    Click order determines priority (1 = most important, 3 = least
                                    important)
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

                    {/* Footer */}
                    <div className="p-6 border-t border-gray-700">
                        <p className="text-base text-gray-300 mb-4 text-center">
                            Note: Genres can be used for infinite content generation
                        </p>
                        <div className="flex items-center justify-center">
                            <button
                                onClick={() => setShowGenreModal(false)}
                                className="px-16 py-2.5 bg-blue-600 text-white rounded-lg font-medium transition-all duration-200 hover:bg-blue-700"
                            >
                                Done
                            </button>
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

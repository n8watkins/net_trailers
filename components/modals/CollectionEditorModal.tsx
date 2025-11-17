'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Image from 'next/image'
import {
    XMarkIcon,
    QuestionMarkCircleIcon,
    MagnifyingGlassIcon,
    FilmIcon,
    TvIcon,
} from '@heroicons/react/24/outline'
import { CheckIcon } from '@heroicons/react/24/solid'
import { UserList } from '../../types/userLists'
import { Content, getTitle, getYear } from '../../typings'
import useUserData from '../../hooks/useUserData'
import { useToast } from '../../hooks/useToast'
import IconPickerModal from './IconPickerModal'
import ColorPickerModal from './ColorPickerModal'
import InlineSearchBar from './InlineSearchBar'
import { GenrePills } from '../customRows/GenrePills'
import { getUnifiedGenresByMediaType } from '../../constants/unifiedGenres'
import { useChildSafety } from '../../hooks/useChildSafety'

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

    const GENRE_LOOKUP = useMemo(() => {
        const map = new Map<string, string>()
        const allGenres = getUnifiedGenresByMediaType('both', isChildSafetyEnabled)
        allGenres.forEach((genre) => {
            map.set(genre.id, genre.name)
        })
        return map
    }, [isChildSafetyEnabled])

    const { updateList, addToList, removeFromList } = useUserData()
    const { showSuccess, showError } = useToast()

    // Collection metadata
    const [name, setName] = useState('')
    const [emoji, setEmoji] = useState('📺')
    const [color, setColor] = useState('#3b82f6')
    const [isPublic, setIsPublic] = useState(false)
    const [displayAsRow, setDisplayAsRow] = useState(true)
    const [enableInfiniteContent, setEnableInfiniteContent] = useState(false)
    const [mediaType, setMediaType] = useState<'movie' | 'tv' | 'both'>('both')
    const [selectedGenres, setSelectedGenres] = useState<string[]>([])
    const [genreLogic, setGenreLogic] = useState<'AND' | 'OR'>('AND')

    // UI state
    const [showIconPicker, setShowIconPicker] = useState(false)
    const [showColorPicker, setShowColorPicker] = useState(false)
    const [showInfiniteTooltip, setShowInfiniteTooltip] = useState(false)
    const [searchFilter, setSearchFilter] = useState('')
    const [isSaving, setIsSaving] = useState(false)

    // Content management
    const [content, setContent] = useState<Content[]>([])
    const [removedIds, setRemovedIds] = useState<Set<number>>(new Set())

    // Load collection data when modal opens
    useEffect(() => {
        if (collection && isOpen) {
            setName(collection.name)
            setEmoji(collection.emoji || '📺')
            setColor(collection.color || '#3b82f6')
            setIsPublic(collection.isPublic || false)
            setDisplayAsRow(collection.displayAsRow ?? true)
            setMediaType(collection.mediaType || 'both')
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
        }
    }, [collection, isOpen])

    useEffect(() => {
        if (enableInfiniteContent && selectedGenres.length === 0) {
            setEnableInfiniteContent(false)
        }
    }, [enableInfiniteContent, selectedGenres.length])

    useEffect(() => {
        if (selectedGenres.length < 2 && genreLogic === 'AND') {
            setGenreLogic('OR')
        }
    }, [genreLogic, selectedGenres.length])

    if (!isOpen || !collection) return null

    const handleClose = () => {
        onClose()
        // Reset state
        setName('')
        setEmoji('📺')
        setColor('#3b82f6')
        setIsPublic(false)
        setDisplayAsRow(true)
        setEnableInfiniteContent(false)
        setMediaType('both')
        setSelectedGenres([])
        setGenreLogic('AND')
        setContent([])
        setRemovedIds(new Set())
        setSearchFilter('')
    }

    const handleSave = async () => {
        if (!name.trim()) {
            showError('Please enter a collection name')
            return
        }

        if (enableInfiniteContent && selectedGenres.length === 0) {
            showError('Add at least one genre', 'Infinite content requires genre filters')
            return
        }

        setIsSaving(true)

        try {
            // Update collection metadata
            await updateList(collection.id, {
                name: name.trim(),
                emoji,
                color,
                isPublic,
                displayAsRow,
                genres: selectedGenres,
                genreLogic,
                mediaType,
                canGenerateMore: enableInfiniteContent && selectedGenres.length > 0,
            })

            // Handle removed items
            for (const removedId of removedIds) {
                await removeFromList(collection.id, removedId)
            }

            showSuccess('Collection updated!', `"${name}" has been saved`)
            handleClose()
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

    const handleMediaTypeChange = (nextType: 'movie' | 'tv' | 'both') => {
        if (mediaType === nextType) return
        setMediaType(nextType)
        setSelectedGenres([])
    }

    // Filter content based on search and removed IDs
    const visibleContent = content
        .filter((item) => !removedIds.has(item.id))
        .filter((item) => {
            if (!searchFilter.trim()) return true
            const title = getTitle(item).toLowerCase()
            return title.includes(searchFilter.toLowerCase().trim())
        })

    const canAdjustGenreLogic = selectedGenres.length >= 2
    const selectedGenreNames = selectedGenres.map((id) => GENRE_LOOKUP.get(id) || `Genre ${id}`)

    return (
        <div className="fixed inset-0 z-[56000] overflow-y-auto">
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={handleClose} />

            {/* Modal */}
            <div className="relative min-h-screen flex items-center justify-center p-4">
                <div
                    className="relative bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] rounded-lg shadow-2xl max-w-6xl w-full border border-gray-700"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-gray-700">
                        <div>
                            <h2 className="text-2xl font-bold text-white">Edit Collection</h2>
                            <p className="text-gray-400 text-sm mt-1">
                                Modify your collection settings and content
                            </p>
                        </div>

                        {/* Close button */}
                        <button
                            type="button"
                            onClick={handleClose}
                            className="text-gray-400 hover:text-white transition-colors"
                        >
                            <XMarkIcon className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 max-h-[calc(90vh-200px)] overflow-y-auto">
                        <div className="space-y-6">
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

                                {/* Color Picker */}
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

                                {/* Name Input */}
                                <div className="flex-1">
                                    <input
                                        type="text"
                                        placeholder="Collection name"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full max-w-md h-14 px-4 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                            </div>

                            {/* Toggle Settings - Compact Width */}
                            <div className="relative p-3 bg-gray-800/50 rounded-lg border border-gray-700 space-y-3 max-w-md">
                                {/* Infinite Content Toggle */}
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-medium text-white flex items-center gap-1.5">
                                        <span>♾️</span>
                                        Infinite Content
                                        <button
                                            type="button"
                                            onMouseEnter={() => setShowInfiniteTooltip(true)}
                                            onMouseLeave={() => setShowInfiniteTooltip(false)}
                                            onClick={() =>
                                                setShowInfiniteTooltip(!showInfiniteTooltip)
                                            }
                                            className="text-gray-400 hover:text-white"
                                        >
                                            <QuestionMarkCircleIcon className="w-4 h-4" />
                                        </button>
                                    </label>
                                    <button
                                        type="button"
                                        onClick={handleToggleInfinite}
                                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                                            enableInfiniteContent ? 'bg-red-600' : 'bg-gray-600'
                                        }`}
                                    >
                                        <span
                                            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                                                enableInfiniteContent
                                                    ? 'translate-x-5'
                                                    : 'translate-x-0.5'
                                            }`}
                                        />
                                    </button>
                                </div>
                                {showInfiniteTooltip && (
                                    <div className="absolute z-10 top-full left-0 mt-1 p-2 bg-gray-900 border border-gray-700 rounded-md shadow-xl max-w-xs">
                                        <p className="text-xs text-gray-300">
                                            After your curated titles, show more similar content
                                            based on genres
                                        </p>
                                    </div>
                                )}

                                {/* Display as Row Toggle */}
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-medium text-white flex items-center gap-1.5">
                                        <span>🏠</span>
                                        Display as Row
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setDisplayAsRow(!displayAsRow)}
                                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                                            displayAsRow ? 'bg-blue-600' : 'bg-gray-600'
                                        }`}
                                    >
                                        <span
                                            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                                                displayAsRow ? 'translate-x-5' : 'translate-x-0.5'
                                            }`}
                                        />
                                    </button>
                                </div>

                                {/* Public Collection Toggle */}
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-medium text-white flex items-center gap-1.5">
                                        <span>🌐</span>
                                        Public Collection
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setIsPublic(!isPublic)}
                                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                                            isPublic ? 'bg-green-600' : 'bg-gray-600'
                                        }`}
                                    >
                                        <span
                                            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                                                isPublic ? 'translate-x-5' : 'translate-x-0.5'
                                            }`}
                                        />
                                    </button>
                                </div>
                            </div>

                            {/* Discovery Settings */}
                            <div className="bg-gray-900/40 rounded-lg border border-gray-800 p-4 space-y-6">
                                <div>
                                    <h3 className="text-white font-semibold">Discovery Settings</h3>
                                    <p className="text-sm text-gray-400">
                                        Configure how infinite recommendations are generated
                                    </p>
                                </div>

                                {/* Media Type Selection */}
                                <div>
                                    <p className="text-sm font-medium text-gray-300 mb-3">
                                        Media Type
                                    </p>
                                    <div className="inline-flex items-center rounded-full bg-gray-800/80 border border-gray-700 p-1 text-sm font-medium">
                                        <button
                                            type="button"
                                            onClick={() => handleMediaTypeChange('movie')}
                                            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full transition-colors ${
                                                mediaType === 'movie'
                                                    ? 'bg-red-600 text-white'
                                                    : 'text-gray-400 hover:text-white'
                                            }`}
                                        >
                                            <FilmIcon className="w-4 h-4" />
                                            Movies
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleMediaTypeChange('tv')}
                                            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full transition-colors ${
                                                mediaType === 'tv'
                                                    ? 'bg-red-600 text-white'
                                                    : 'text-gray-400 hover:text-white'
                                            }`}
                                        >
                                            <TvIcon className="w-4 h-4" />
                                            TV
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleMediaTypeChange('both')}
                                            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full transition-colors ${
                                                mediaType === 'both'
                                                    ? 'bg-red-600 text-white'
                                                    : 'text-gray-400 hover:text-white'
                                            }`}
                                        >
                                            <FilmIcon className="w-4 h-4" />
                                            <TvIcon className="w-4 h-4" />
                                            Both
                                        </button>
                                    </div>
                                </div>

                                {/* Genre Selection */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm font-medium text-gray-300">Genres</p>
                                        <span className="text-xs text-gray-400">
                                            {selectedGenres.length === 0
                                                ? 'No genres selected'
                                                : `${selectedGenres.length} selected`}
                                        </span>
                                    </div>
                                    {selectedGenres.length > 0 && (
                                        <div className="flex flex-wrap gap-2 text-xs text-white">
                                            {selectedGenreNames.map((name, index) => (
                                                <span
                                                    key={`${name}-${index}`}
                                                    className="px-3 py-1 rounded-full bg-gray-800 border border-gray-700"
                                                >
                                                    {name}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                    <GenrePills
                                        selectedGenres={selectedGenres}
                                        onChange={setSelectedGenres}
                                        mediaType={mediaType}
                                        childSafeMode={isChildSafetyEnabled}
                                    />
                                </div>

                                {/* Genre Logic */}
                                <div>
                                    <p className="text-sm font-medium text-gray-300 mb-1">
                                        Genre Matching
                                    </p>
                                    <p className="text-xs text-gray-400 mb-3">
                                        Infinite recommendations try to match ALL genres first, then
                                        relax to ANY if needed.
                                    </p>
                                    <div className="inline-flex items-center rounded-full bg-gray-800/80 border border-gray-700 p-1 text-sm font-medium">
                                        <button
                                            type="button"
                                            onClick={() => setGenreLogic('AND')}
                                            disabled={!canAdjustGenreLogic}
                                            className={`px-4 py-1.5 rounded-full transition-colors ${
                                                genreLogic === 'AND'
                                                    ? 'bg-red-600 text-white'
                                                    : 'text-gray-400 hover:text-white'
                                            } ${!canAdjustGenreLogic ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        >
                                            Match ALL
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setGenreLogic('OR')}
                                            disabled={!canAdjustGenreLogic}
                                            className={`px-4 py-1.5 rounded-full transition-colors ${
                                                genreLogic === 'OR'
                                                    ? 'bg-red-600 text-white'
                                                    : 'text-gray-400 hover:text-white'
                                            } ${!canAdjustGenreLogic ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        >
                                            Match ANY
                                        </button>
                                    </div>
                                </div>
                            </div>

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
                                            onChange={(e) => setSearchFilter(e.target.value)}
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
                                        No content in this collection. Use the search bar above to
                                        add titles.
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
                        </div>
                    </div>

                    {/* Footer with Action Buttons */}
                    <div className="p-6 border-t border-gray-700">
                        <div className="flex space-x-3">
                            <button
                                onClick={handleSave}
                                disabled={!name.trim() || isSaving}
                                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold transition-all duration-200 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSaving ? (
                                    'Saving...'
                                ) : (
                                    <>
                                        <CheckIcon className="w-5 h-5" />
                                        Save Changes
                                    </>
                                )}
                            </button>
                            <button
                                onClick={handleClose}
                                className="px-6 py-3 bg-gray-700 text-white rounded-lg font-semibold transition-all duration-200 hover:bg-gray-600"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

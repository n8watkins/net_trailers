/**
 * RankingCreator Component
 *
 * 3-step wizard for creating rankings:
 * Step 1: Basic info (title, description, item count, public/private, tags)
 * Step 2: Search and add content items
 * Step 3: Order items with drag & drop and add notes
 */

'use client'

import { useState, useCallback } from 'react'
import Image from 'next/image'
import { Content, getTitle, getPosterPath, getYear } from '@/typings'
import {
    RankedItem,
    CreateRankingRequest,
    UpdateRankingRequest,
    RANKING_CONSTRAINTS,
} from '@/types/rankings'
import { useRankingStore } from '@/stores/rankingStore'
import { useSessionStore } from '@/stores/sessionStore'
import { useProfileStore } from '@/stores/profileStore'
import { useSearch } from '@/hooks/useSearch'
import {
    TrophyIcon,
    MagnifyingGlassIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    XMarkIcon,
    PlusIcon,
    CheckIcon,
    GlobeAltIcon,
    LockClosedIcon,
    Bars3Icon,
} from '@heroicons/react/24/outline'

interface RankingCreatorProps {
    onComplete?: (rankingId: string) => void
    onCancel?: () => void
}

export function RankingCreator({ onComplete, onCancel }: RankingCreatorProps) {
    const getUserId = useSessionStore((state) => state.getUserId)
    const userId = getUserId()
    const { profile } = useProfileStore()
    const { createRanking, updateRanking } = useRankingStore()
    const { query, updateQuery, results, isLoading: isSearchLoading } = useSearch()

    // Step management
    const [currentStep, setCurrentStep] = useState(1)

    // Step 1: Basic info
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [itemCount, setItemCount] = useState(10)
    const [isPublic, setIsPublic] = useState(true)
    const [tags, setTags] = useState<string[]>([])
    const [tagInput, setTagInput] = useState('')

    // Step 2: Content selection
    const [selectedItems, setSelectedItems] = useState<Content[]>([])

    // Step 3: Ordering and notes
    const [rankedItems, setRankedItems] = useState<Array<{ content: Content; note: string }>>([])
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

    // Step 1 validation
    const isStep1Valid =
        title.trim().length >= RANKING_CONSTRAINTS.MIN_TITLE_LENGTH &&
        title.trim().length <= RANKING_CONSTRAINTS.MAX_TITLE_LENGTH &&
        itemCount >= RANKING_CONSTRAINTS.MIN_ITEM_COUNT &&
        itemCount <= RANKING_CONSTRAINTS.MAX_ITEM_COUNT

    // Step 2 validation
    const isStep2Valid = selectedItems.length >= RANKING_CONSTRAINTS.MIN_ITEM_COUNT

    // Step 3 validation
    const isStep3Valid = rankedItems.length >= RANKING_CONSTRAINTS.MIN_ITEM_COUNT

    const handleAddTag = () => {
        const newTag = tagInput.trim()
        if (newTag && !tags.includes(newTag) && tags.length < RANKING_CONSTRAINTS.MAX_TAGS) {
            setTags([...tags, newTag])
            setTagInput('')
        }
    }

    const handleRemoveTag = (tagToRemove: string) => {
        setTags(tags.filter((tag) => tag !== tagToRemove))
    }

    const handleToggleItem = (content: Content) => {
        if (selectedItems.find((item) => item.id === content.id)) {
            setSelectedItems(selectedItems.filter((item) => item.id !== content.id))
        } else {
            if (selectedItems.length < itemCount) {
                setSelectedItems([...selectedItems, content])
            }
        }
    }

    const handleNextStep = () => {
        if (currentStep === 1 && isStep1Valid) {
            setCurrentStep(2)
        } else if (currentStep === 2 && isStep2Valid) {
            // Initialize rankedItems with selected items
            setRankedItems(selectedItems.map((content) => ({ content, note: '' })))
            setCurrentStep(3)
        }
    }

    const handlePreviousStep = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1)
        }
    }

    const handleDragStart = (index: number) => {
        setDraggedIndex(index)
    }

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault()
        if (draggedIndex === null || draggedIndex === index) return

        const newItems = [...rankedItems]
        const draggedItem = newItems[draggedIndex]
        newItems.splice(draggedIndex, 1)
        newItems.splice(index, 0, draggedItem)

        setRankedItems(newItems)
        setDraggedIndex(index)
    }

    const handleDragEnd = () => {
        setDraggedIndex(null)
    }

    const handleUpdateNote = (index: number, note: string) => {
        const newItems = [...rankedItems]
        newItems[index].note = note
        setRankedItems(newItems)
    }

    const handleSubmit = async () => {
        if (!userId || !profile || !isStep3Valid) return

        // Extract values to ensure they're stable
        const username = profile.username
        const avatarUrl = profile.avatarUrl

        if (!username) {
            console.error('Profile missing username')
            return
        }

        // Validate note lengths before submission
        const invalidNotes = rankedItems.filter(
            (item) => item.note.trim().length > RANKING_CONSTRAINTS.MAX_NOTE_LENGTH
        )
        if (invalidNotes.length > 0) {
            console.error('Some notes exceed maximum length')
            return
        }

        try {
            // Step 1: Create the ranking with basic info
            const createRequest: CreateRankingRequest = {
                title: title.trim(),
                description: description.trim() || undefined,
                itemCount,
                isPublic,
                tags: tags.length > 0 ? tags : undefined,
            }

            const rankingId = await createRanking(userId, username, avatarUrl, createRequest)

            if (!rankingId) {
                throw new Error('Failed to create ranking')
            }

            // Step 2: Update with ranked items
            const updateRequest: UpdateRankingRequest = {
                id: rankingId,
                rankedItems: rankedItems.map((item, index) => ({
                    position: index + 1,
                    content: item.content,
                    note: item.note.trim() || undefined,
                    addedAt: Date.now(),
                })),
            }

            await updateRanking(userId, updateRequest)

            onComplete?.(rankingId)
        } catch (error) {
            console.error('Failed to create ranking:', error)
        }
    }

    return (
        <div className="max-w-4xl mx-auto">
            {/* Progress indicator */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                    {[1, 2, 3].map((step) => (
                        <div key={step} className="flex items-center flex-1">
                            <div
                                className={`flex items-center justify-center w-10 h-10 rounded-full font-bold ${
                                    step === currentStep
                                        ? 'bg-yellow-500 text-black'
                                        : step < currentStep
                                          ? 'bg-green-500 text-white'
                                          : 'bg-zinc-800 text-gray-500'
                                }`}
                            >
                                {step < currentStep ? <CheckIcon className="w-6 h-6" /> : step}
                            </div>
                            {step < 3 && (
                                <div
                                    className={`flex-1 h-1 mx-2 ${
                                        step < currentStep ? 'bg-green-500' : 'bg-zinc-800'
                                    }`}
                                />
                            )}
                        </div>
                    ))}
                </div>
                <div className="flex justify-between text-sm text-gray-400">
                    <span>Basic Info</span>
                    <span>Add Items</span>
                    <span>Order & Finish</span>
                </div>
            </div>

            {/* Step 1: Basic Info */}
            {currentStep === 1 && (
                <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800 space-y-6">
                    <div className="flex items-center gap-3 mb-4">
                        <TrophyIcon className="w-8 h-8 text-yellow-500" />
                        <h2 className="text-2xl font-bold text-white">Basic Information</h2>
                    </div>

                    {/* Title */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Title <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="My Top 10 Sci-Fi Movies"
                            maxLength={RANKING_CONSTRAINTS.MAX_TITLE_LENGTH}
                            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500"
                        />
                        <p className="text-sm text-gray-500 mt-1">
                            {title.length}/{RANKING_CONSTRAINTS.MAX_TITLE_LENGTH} characters
                        </p>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Description
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Describe your ranking criteria or theme..."
                            maxLength={RANKING_CONSTRAINTS.MAX_DESCRIPTION_LENGTH}
                            rows={4}
                            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500 resize-none"
                        />
                        <p className="text-sm text-gray-500 mt-1">
                            {description.length}/{RANKING_CONSTRAINTS.MAX_DESCRIPTION_LENGTH}{' '}
                            characters
                        </p>
                    </div>

                    {/* Item Count */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Number of Items <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="number"
                            value={itemCount}
                            onChange={(e) =>
                                setItemCount(
                                    parseInt(e.target.value) || RANKING_CONSTRAINTS.MIN_ITEM_COUNT
                                )
                            }
                            min={RANKING_CONSTRAINTS.MIN_ITEM_COUNT}
                            max={RANKING_CONSTRAINTS.MAX_ITEM_COUNT}
                            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-yellow-500"
                        />
                        <p className="text-sm text-gray-500 mt-1">
                            Between {RANKING_CONSTRAINTS.MIN_ITEM_COUNT} and{' '}
                            {RANKING_CONSTRAINTS.MAX_ITEM_COUNT} items
                        </p>
                    </div>

                    {/* Privacy */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-3">
                            Privacy
                        </label>
                        <div className="flex gap-4">
                            <button
                                onClick={() => setIsPublic(true)}
                                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-colors ${
                                    isPublic
                                        ? 'border-yellow-500 bg-yellow-500/10 text-yellow-500'
                                        : 'border-zinc-700 bg-zinc-800 text-gray-400 hover:border-zinc-600'
                                }`}
                            >
                                <GlobeAltIcon className="w-5 h-5" />
                                <span className="font-medium">Public</span>
                            </button>
                            <button
                                onClick={() => setIsPublic(false)}
                                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-colors ${
                                    !isPublic
                                        ? 'border-yellow-500 bg-yellow-500/10 text-yellow-500'
                                        : 'border-zinc-700 bg-zinc-800 text-gray-400 hover:border-zinc-600'
                                }`}
                            >
                                <LockClosedIcon className="w-5 h-5" />
                                <span className="font-medium">Private</span>
                            </button>
                        </div>
                    </div>

                    {/* Tags */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Tags (optional)
                        </label>
                        <div className="flex gap-2 mb-3">
                            <input
                                type="text"
                                value={tagInput}
                                onChange={(e) => setTagInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault()
                                        handleAddTag()
                                    }
                                }}
                                placeholder="Add a tag..."
                                maxLength={RANKING_CONSTRAINTS.MAX_TAG_LENGTH}
                                className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500"
                            />
                            <button
                                onClick={handleAddTag}
                                disabled={
                                    !tagInput.trim() || tags.length >= RANKING_CONSTRAINTS.MAX_TAGS
                                }
                                className="px-4 py-2 bg-yellow-500 text-black font-medium rounded-lg hover:bg-yellow-400 disabled:bg-zinc-800 disabled:text-gray-600 disabled:cursor-not-allowed transition-colors"
                            >
                                <PlusIcon className="w-5 h-5" />
                            </button>
                        </div>
                        {tags.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {tags.map((tag) => (
                                    <span
                                        key={tag}
                                        className="flex items-center gap-1 px-3 py-1 bg-zinc-800 text-gray-300 rounded-full"
                                    >
                                        {tag}
                                        <button
                                            onClick={() => handleRemoveTag(tag)}
                                            className="hover:text-red-500 transition-colors"
                                        >
                                            <XMarkIcon className="w-4 h-4" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}
                        <p className="text-sm text-gray-500 mt-2">
                            {tags.length}/{RANKING_CONSTRAINTS.MAX_TAGS} tags
                        </p>
                    </div>
                </div>
            )}

            {/* Step 2: Add Items */}
            {currentStep === 2 && (
                <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800 space-y-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-2xl font-bold text-white">Add Items</h2>
                        <span className="text-gray-400">
                            {selectedItems.length} / {itemCount} selected
                        </span>
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => updateQuery(e.target.value)}
                            placeholder="Search for movies and TV shows..."
                            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-12 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500"
                        />
                    </div>

                    {/* Selected items */}
                    {selectedItems.length > 0 && (
                        <div className="border-t border-zinc-800 pt-4">
                            <h3 className="text-lg font-bold text-white mb-3">Selected Items</h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                {selectedItems.map((content) => (
                                    <div key={content.id} className="relative group">
                                        <div className="relative aspect-[2/3]">
                                            <Image
                                                src={getPosterPath(content)}
                                                alt={getTitle(content)}
                                                fill
                                                className="object-cover rounded-lg"
                                            />
                                            <button
                                                onClick={() => handleToggleItem(content)}
                                                className="absolute top-2 right-2 w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-colors"
                                            >
                                                <XMarkIcon className="w-5 h-5" />
                                            </button>
                                        </div>
                                        <p className="text-sm text-gray-300 mt-1 truncate">
                                            {getTitle(content)}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Search results */}
                    {query.length >= 2 && (
                        <div className="border-t border-zinc-800 pt-4">
                            <h3 className="text-lg font-bold text-white mb-3">Search Results</h3>
                            {isSearchLoading ? (
                                <div className="text-center py-8 text-gray-500">Searching...</div>
                            ) : results.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    No results found
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                    {results.slice(0, 20).map((content) => {
                                        const isSelected = selectedItems.find(
                                            (item) => item.id === content.id
                                        )
                                        const canSelect = selectedItems.length < itemCount

                                        return (
                                            <div
                                                key={content.id}
                                                className="relative group cursor-pointer"
                                                onClick={() => handleToggleItem(content)}
                                            >
                                                <div className="relative aspect-[2/3]">
                                                    <Image
                                                        src={getPosterPath(content)}
                                                        alt={getTitle(content)}
                                                        fill
                                                        className={`object-cover rounded-lg transition-opacity ${
                                                            isSelected
                                                                ? 'opacity-50'
                                                                : 'group-hover:opacity-75'
                                                        }`}
                                                    />
                                                    {isSelected ? (
                                                        <div className="absolute inset-0 flex items-center justify-center">
                                                            <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                                                                <CheckIcon className="w-8 h-8 text-white" />
                                                            </div>
                                                        </div>
                                                    ) : canSelect ? (
                                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <div className="w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center">
                                                                <PlusIcon className="w-8 h-8 text-black" />
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                                            <span className="text-white text-sm font-medium">
                                                                Limit reached
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                                <p className="text-sm text-gray-300 mt-1 truncate">
                                                    {getTitle(content)}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {getYear(content)}
                                                </p>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {query.length < 2 && selectedItems.length === 0 && (
                        <div className="text-center py-12 text-gray-500">
                            <MagnifyingGlassIcon className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                            <p>Search for movies and TV shows to add to your ranking</p>
                        </div>
                    )}
                </div>
            )}

            {/* Step 3: Order & Finish */}
            {currentStep === 3 && (
                <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800 space-y-6">
                    <div className="mb-4">
                        <h2 className="text-2xl font-bold text-white mb-2">Order Your Ranking</h2>
                        <p className="text-gray-400">
                            Drag and drop to reorder. Add optional notes for each item.
                        </p>
                    </div>

                    <div className="space-y-3">
                        {rankedItems.map((item, index) => (
                            <div
                                key={item.content.id}
                                draggable
                                onDragStart={() => handleDragStart(index)}
                                onDragOver={(e) => handleDragOver(e, index)}
                                onDragEnd={handleDragEnd}
                                className={`flex items-start gap-4 bg-zinc-800 rounded-lg p-4 cursor-move transition-all ${
                                    draggedIndex === index ? 'opacity-50' : 'hover:bg-zinc-750'
                                }`}
                            >
                                {/* Drag handle */}
                                <div className="flex items-center gap-3">
                                    <Bars3Icon className="w-6 h-6 text-gray-500" />
                                    <div className="flex-shrink-0 w-10 h-10 bg-yellow-500 text-black font-bold rounded-full flex items-center justify-center text-lg">
                                        {index + 1}
                                    </div>
                                </div>

                                {/* Poster */}
                                <div className="relative w-12 h-18 flex-shrink-0">
                                    <Image
                                        src={getPosterPath(item.content)}
                                        alt={getTitle(item.content)}
                                        fill
                                        className="object-cover rounded-md"
                                    />
                                </div>

                                {/* Content info and note */}
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-white font-bold truncate">
                                        {getTitle(item.content)}
                                    </h3>
                                    <p className="text-sm text-gray-400 mb-2">
                                        {getYear(item.content)} •{' '}
                                        {item.content.media_type === 'movie' ? 'Movie' : 'TV Show'}
                                    </p>
                                    <input
                                        type="text"
                                        value={item.note}
                                        onChange={(e) => handleUpdateNote(index, e.target.value)}
                                        placeholder="Add a note (optional)..."
                                        maxLength={RANKING_CONSTRAINTS.MAX_NOTE_LENGTH}
                                        className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500"
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Navigation buttons */}
            <div className="flex justify-between mt-8">
                <div>
                    {currentStep > 1 && (
                        <button
                            onClick={handlePreviousStep}
                            className="flex items-center gap-2 px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
                        >
                            <ChevronLeftIcon className="w-5 h-5" />
                            Back
                        </button>
                    )}
                    {currentStep === 1 && onCancel && (
                        <button
                            onClick={onCancel}
                            className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                    )}
                </div>

                <div>
                    {currentStep < 3 ? (
                        <button
                            onClick={handleNextStep}
                            disabled={
                                (currentStep === 1 && !isStep1Valid) ||
                                (currentStep === 2 && !isStep2Valid)
                            }
                            className="flex items-center gap-2 px-6 py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-medium rounded-lg disabled:bg-zinc-800 disabled:text-gray-600 disabled:cursor-not-allowed transition-colors"
                        >
                            Next
                            <ChevronRightIcon className="w-5 h-5" />
                        </button>
                    ) : (
                        <button
                            onClick={handleSubmit}
                            disabled={!isStep3Valid}
                            className="px-6 py-3 bg-green-500 hover:bg-green-400 text-white font-medium rounded-lg disabled:bg-zinc-800 disabled:text-gray-600 disabled:cursor-not-allowed transition-colors"
                        >
                            Create Ranking
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}

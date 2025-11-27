/**
 * RankingCreator Component
 *
 * 3-step wizard for creating rankings:
 * Step 1: Pick content items
 * Step 2: Order items with drag & drop and add notes
 * Step 3: Name & share settings (title, description, public/private)
 */

'use client'

import { useState, useCallback, useEffect } from 'react'
import Image from 'next/image'
import { Content, getTitle, getPosterPath, getYear } from '@/typings'
import {
    Ranking,
    RankedItem,
    CreateRankingRequest,
    UpdateRankingRequest,
    RANKING_CONSTRAINTS,
} from '@/types/rankings'
import { useRankingStore } from '@/stores/rankingStore'
import { useSessionStore } from '@/stores/sessionStore'
import { useSearch } from '@/hooks/useSearch'
import { useToast } from '@/hooks/useToast'
import { auth } from '@/firebase'
import { POPULAR_TAGS, getTagById, searchTags } from '@/utils/popularTags'
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
    existingRanking?: Ranking
    onComplete?: (rankingId: string) => void
    onCancel?: () => void
}

interface LocalRankedItem {
    content: Content
    note: string
    addedAt?: number
}

export function RankingCreator({ existingRanking, onComplete, onCancel }: RankingCreatorProps) {
    const isEditMode = !!existingRanking
    const [mouseDownOnBackdrop, setMouseDownOnBackdrop] = useState(false)
    const getUserId = useSessionStore((state) => state.getUserId)
    const userId = getUserId()
    const { createRanking, updateRanking } = useRankingStore()
    const { query, updateQuery, results, isLoading: isSearchLoading } = useSearch()
    const { showSuccess, showError } = useToast()

    // Step management
    const [currentStep, setCurrentStep] = useState(1)

    // Step 1: Basic info
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [itemCount, setItemCount] = useState(10)
    const [isPublic, setIsPublic] = useState(true)

    // Step 2: Content selection
    const [selectedItems, setSelectedItems] = useState<Content[]>([])
    const [selectedTag, setSelectedTag] = useState<string | null>(null)
    const [tagContent, setTagContent] = useState<Content[]>([])

    // Initialize form with existing ranking data (edit mode)
    useEffect(() => {
        if (existingRanking) {
            setTitle(existingRanking.title)
            setDescription(existingRanking.description || '')
            setItemCount(existingRanking.itemCount)
            setIsPublic(existingRanking.isPublic)

            // Set selected items and ranked items from existing ranking
            const contents = existingRanking.rankedItems.map((item) => item.content)
            setSelectedItems(contents)
            setRankedItems(
                existingRanking.rankedItems.map((item) => ({
                    content: item.content,
                    note: item.note ?? '',
                    addedAt: item.addedAt,
                }))
            )

            // Skip to step 3 in edit mode (already have items)
            setCurrentStep(3)
        }
    }, [existingRanking])
    const [isLoadingTag, setIsLoadingTag] = useState(false)
    const [tagSearchQuery, setTagSearchQuery] = useState('')

    // Step 3: Ordering and notes
    const [rankedItems, setRankedItems] = useState<LocalRankedItem[]>([])
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

    // Pagination for Step 1 (content browsing)
    const [step1Page, setStep1Page] = useState(1)
    const step1ItemsPerPage = 20

    // Pagination for Step 2
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage, setItemsPerPage] = useState(10)

    // Step 1 validation (Pick Content)
    const isStep1Valid = selectedItems.length >= RANKING_CONSTRAINTS.MIN_ITEM_COUNT

    // Step 2 validation (Order & Notes)
    const isStep2Valid = rankedItems.length >= RANKING_CONSTRAINTS.MIN_ITEM_COUNT

    // Step 3 validation (Name & Share)
    const isStep3Valid =
        title.trim().length >= RANKING_CONSTRAINTS.MIN_TITLE_LENGTH &&
        title.trim().length <= RANKING_CONSTRAINTS.MAX_TITLE_LENGTH

    // Filter tags based on search query using enhanced searchTags function
    const filteredTags = tagSearchQuery ? searchTags(tagSearchQuery) : POPULAR_TAGS

    // Fetch content by tag
    const fetchTagContent = async (tagId: string) => {
        const tag = getTagById(tagId)
        if (!tag) return

        setIsLoadingTag(true)
        setTagContent([])

        try {
            // Fetch movies by IDs
            const moviePromises = tag.movieIds.map(async (id) => {
                const response = await fetch(`/api/movies/details/${id}?media_type=movie`)
                if (response.ok) {
                    const data = await response.json()
                    return { ...data, media_type: 'movie' as const }
                }
                return null
            })

            // Fetch TV shows by IDs
            const tvPromises = tag.tvShowIds.map(async (id) => {
                const response = await fetch(`/api/movies/details/${id}?media_type=tv`)
                if (response.ok) {
                    const data = await response.json()
                    return { ...data, media_type: 'tv' as const }
                }
                return null
            })

            const results = await Promise.all([...moviePromises, ...tvPromises])
            const validResults = results.filter((item): item is Content => item !== null)
            setTagContent(validResults)
        } catch (error) {
            console.error('Error fetching tag content:', error)
        } finally {
            setIsLoadingTag(false)
        }
    }

    // Handle tag selection
    const handleSelectTag = (tagId: string) => {
        if (selectedTag === tagId) {
            // Deselect tag
            setSelectedTag(null)
            setTagContent([])
        } else {
            // Select new tag
            setSelectedTag(tagId)
            setStep1Page(1) // Reset pagination
            fetchTagContent(tagId)
            // Clear search when selecting a tag
            updateQuery('')
        }
    }

    // Reset pagination when search query changes
    useEffect(() => {
        if (query.length >= 2) {
            setStep1Page(1)
        }
    }, [query])

    const handleToggleItem = (content: Content) => {
        if (selectedItems.find((item) => item.id === content.id)) {
            setSelectedItems(selectedItems.filter((item) => item.id !== content.id))
        } else {
            if (selectedItems.length < RANKING_CONSTRAINTS.MAX_ITEM_COUNT) {
                setSelectedItems([...selectedItems, content])
            }
        }
    }

    const handleNextStep = () => {
        if (currentStep === 1 && isStep1Valid) {
            // Initialize rankedItems with selected items when moving from Step 1 to Step 2
            setRankedItems(selectedItems.map((content) => ({ content, note: '' })))
            setCurrentStep(2)
        } else if (currentStep === 2 && isStep2Valid) {
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
        // Validation checks with user feedback
        if (!userId) {
            showError('You must be logged in to create a ranking')
            return
        }

        if (!isStep3Valid) {
            showError('Please enter a valid ranking title')
            return
        }

        // Get current user info from Firebase Auth
        const currentUser = auth.currentUser
        if (!currentUser) {
            showError('You must be logged in to create a ranking')
            return
        }

        const username = currentUser.displayName || 'Unknown User'
        const avatarUrl = currentUser.photoURL || undefined

        // Validate note lengths before submission
        const invalidNotes = rankedItems.filter(
            (item) => item.note.trim().length > RANKING_CONSTRAINTS.MAX_NOTE_LENGTH
        )
        if (invalidNotes.length > 0) {
            showError(
                `Some notes exceed the maximum length of ${RANKING_CONSTRAINTS.MAX_NOTE_LENGTH} characters`
            )
            return
        }

        try {
            if (isEditMode && existingRanking) {
                // Edit mode: Update existing ranking
                const updateRequest: UpdateRankingRequest = {
                    id: existingRanking.id,
                    title: title.trim(),
                    description: description.trim() || undefined,
                    isPublic,
                    rankedItems: rankedItems.map((item, index) => ({
                        position: index + 1,
                        content: item.content,
                        note: item.note.trim() || undefined,
                        addedAt: item.addedAt || Date.now(), // Preserve existing addedAt if available
                    })),
                }

                await updateRanking(userId, updateRequest)

                showSuccess('Ranking Updated!', 'Your ranking has been updated successfully')
                onComplete?.(existingRanking.id)
            } else {
                // Create mode: Create new ranking
                const createRequest: CreateRankingRequest = {
                    title: title.trim(),
                    itemCount: rankedItems.length, // Dynamic item count based on selected items
                    isPublic,
                }

                // Only add optional fields if they have values (Firestore doesn't accept undefined)
                if (description.trim()) {
                    createRequest.description = description.trim()
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

                showSuccess('Ranking Created!', 'Your ranking has been created successfully')
                onComplete?.(rankingId)
            }
        } catch (error) {
            console.error(`Failed to ${isEditMode ? 'update' : 'create'} ranking:`, error)
            showError(`Failed to ${isEditMode ? 'update' : 'create'} ranking. Please try again.`)
        }
    }

    const handleBackdropMouseDown = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            setMouseDownOnBackdrop(true)
        }
    }

    const handleBackdropClick = (e: React.MouseEvent) => {
        // Only close if both mousedown and mouseup happened on the backdrop
        if (e.target === e.currentTarget && mouseDownOnBackdrop) {
            onCancel?.()
        }
        setMouseDownOnBackdrop(false)
    }

    return (
        <div className="fixed inset-0 z-[250] overflow-y-auto">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/80 backdrop-blur-sm"
                onMouseDown={handleBackdropMouseDown}
                onClick={handleBackdropClick}
            />

            {/* Modal */}
            <div
                className="relative min-h-screen flex items-center justify-center p-2"
                onMouseDown={handleBackdropMouseDown}
                onClick={handleBackdropClick}
            >
                <div
                    className="relative bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] rounded-lg shadow-2xl max-w-[96vw] w-full max-h-[94vh] border border-gray-700 flex flex-col"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header - Compact */}
                    <div className="flex items-center justify-between px-6 py-3 border-b border-gray-700 flex-shrink-0">
                        <div className="flex items-center gap-3">
                            <TrophyIcon className="w-5 h-5 text-yellow-500" />
                            <h2 className="text-xl font-bold text-white">Create Ranking</h2>
                        </div>
                        <button
                            onClick={onCancel}
                            className="text-gray-400 hover:text-white transition-colors p-1.5 hover:bg-white/10 rounded-lg"
                        >
                            <XMarkIcon className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Content - Scrollable */}
                    <div className="p-4 overflow-y-auto flex-1">
                        {/* Progress indicator */}
                        <div className="mb-8">
                            {/* Step circles and connectors */}
                            <div className="flex items-center mb-4">
                                {[1, 2, 3].map((step) => (
                                    <div
                                        key={step}
                                        className="flex items-center flex-1 last:flex-initial"
                                    >
                                        {/* Step circle */}
                                        <div className="relative flex items-center justify-center">
                                            <div
                                                className={`relative flex items-center justify-center w-12 h-12 rounded-full font-bold text-lg transition-all duration-300 ${
                                                    step === currentStep
                                                        ? 'bg-yellow-500 text-black scale-110 ring-4 ring-yellow-500/20'
                                                        : step < currentStep
                                                          ? 'bg-green-500 text-white'
                                                          : 'bg-zinc-800 text-gray-500'
                                                }`}
                                            >
                                                {step < currentStep ? (
                                                    <CheckIcon className="w-7 h-7 animate-in zoom-in duration-200" />
                                                ) : (
                                                    step
                                                )}
                                            </div>
                                        </div>

                                        {/* Connector line */}
                                        {step < 3 && (
                                            <div className="flex-1 h-1 mx-3 bg-zinc-800 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full transition-all duration-500 rounded-full ${
                                                        step < currentStep
                                                            ? 'bg-green-500 w-full'
                                                            : 'bg-transparent w-0'
                                                    }`}
                                                />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Step labels */}
                            <div className="flex items-start">
                                <div className="flex-1 text-left">
                                    <span
                                        className={`text-sm font-medium transition-colors duration-200 ${
                                            currentStep === 1 ? 'text-yellow-400' : 'text-gray-400'
                                        }`}
                                    >
                                        Pick Content
                                    </span>
                                </div>
                                <div className="flex-1 text-center">
                                    <span
                                        className={`text-sm font-medium transition-colors duration-200 ${
                                            currentStep === 2 ? 'text-yellow-400' : 'text-gray-400'
                                        }`}
                                    >
                                        Order & Notes
                                    </span>
                                </div>
                                <div className="flex-1 text-right">
                                    <span
                                        className={`text-sm font-medium transition-colors duration-200 ${
                                            currentStep === 3 ? 'text-yellow-400' : 'text-gray-400'
                                        }`}
                                    >
                                        Name & Share
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Step 1: Pick Content */}
                        {currentStep === 1 && (
                            <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800">
                                <div className="mb-6">
                                    <h2 className="text-2xl font-bold text-white mb-2">
                                        Pick Content
                                    </h2>
                                    <p className="text-gray-400 text-sm">
                                        Search for movies and TV shows. You need at least 3 items to
                                        continue.
                                    </p>
                                </div>

                                {/* Two-column layout */}
                                <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
                                    {/* Left: Search and Results */}
                                    <div className="space-y-6 min-h-[600px]">
                                        {/* Popular Tags */}
                                        <div>
                                            <div className="flex items-center justify-between mb-3">
                                                <h3 className="text-sm font-medium text-gray-400">
                                                    Browse by Popular Tags
                                                </h3>
                                                <span className="text-xs text-gray-500">
                                                    {filteredTags.length} tags
                                                </span>
                                            </div>
                                            {/* Tag search input */}
                                            <div className="relative mb-3">
                                                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                                                <input
                                                    type="text"
                                                    value={tagSearchQuery}
                                                    onChange={(e) =>
                                                        setTagSearchQuery(e.target.value)
                                                    }
                                                    placeholder="Search tags..."
                                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500 transition-colors"
                                                />
                                                {tagSearchQuery && (
                                                    <button
                                                        onClick={() => setTagSearchQuery('')}
                                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                                                    >
                                                        <XMarkIcon className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                            {/* Tags */}
                                            {filteredTags.length > 0 ? (
                                                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto pr-2">
                                                    {filteredTags.map((tag) => (
                                                        <button
                                                            key={tag.id}
                                                            onClick={() => handleSelectTag(tag.id)}
                                                            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                                                                selectedTag === tag.id
                                                                    ? 'bg-yellow-500 text-black'
                                                                    : 'bg-zinc-800 text-gray-300 hover:bg-zinc-700'
                                                            }`}
                                                            title={tag.description}
                                                        >
                                                            <span className="mr-1">
                                                                {tag.emoji}
                                                            </span>
                                                            {tag.name}
                                                        </button>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-center py-4 text-gray-500 text-sm">
                                                    No tags found
                                                </div>
                                            )}
                                        </div>

                                        {/* Search */}
                                        <div className="relative">
                                            <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                                            <input
                                                type="text"
                                                value={query}
                                                onChange={(e) => {
                                                    updateQuery(e.target.value)
                                                    // Clear tag when searching
                                                    if (e.target.value.length >= 2) {
                                                        setSelectedTag(null)
                                                        setTagContent([])
                                                    }
                                                }}
                                                placeholder="Search for movies and TV shows..."
                                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-12 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500"
                                            />
                                        </div>

                                        {/* Tag content */}
                                        {selectedTag && !query ? (
                                            <div>
                                                <div className="flex items-center justify-between mb-3">
                                                    <h3 className="text-lg font-bold text-white">
                                                        {getTagById(selectedTag)?.name}
                                                    </h3>
                                                    {tagContent.length > 0 && (
                                                        <span className="text-sm text-gray-400">
                                                            {tagContent.length} items
                                                        </span>
                                                    )}
                                                </div>
                                                {isLoadingTag ? (
                                                    <div className="text-center py-8 text-gray-500">
                                                        Loading...
                                                    </div>
                                                ) : tagContent.length === 0 ? (
                                                    <div className="text-center py-8 text-gray-500">
                                                        No content found
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3">
                                                            {tagContent
                                                                .slice(
                                                                    (step1Page - 1) *
                                                                        step1ItemsPerPage,
                                                                    step1Page * step1ItemsPerPage
                                                                )
                                                                .map((content) => {
                                                                    const isSelected =
                                                                        selectedItems.find(
                                                                            (item) =>
                                                                                item.id ===
                                                                                content.id
                                                                        )
                                                                    const canSelect =
                                                                        selectedItems.length <
                                                                        RANKING_CONSTRAINTS.MAX_ITEM_COUNT

                                                                    return (
                                                                        <div
                                                                            key={content.id}
                                                                            className="relative group cursor-pointer"
                                                                            onClick={() =>
                                                                                handleToggleItem(
                                                                                    content
                                                                                )
                                                                            }
                                                                        >
                                                                            <div className="relative aspect-[2/3]">
                                                                                <Image
                                                                                    src={getPosterPath(
                                                                                        content
                                                                                    )}
                                                                                    alt={getTitle(
                                                                                        content
                                                                                    )}
                                                                                    fill
                                                                                    sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, (max-width: 1024px) 20vw, (max-width: 1280px) 16vw, 14vw"
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
                                                                                ) : (
                                                                                    canSelect && (
                                                                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                                                            <div className="w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center">
                                                                                                <PlusIcon className="w-8 h-8 text-black" />
                                                                                            </div>
                                                                                        </div>
                                                                                    )
                                                                                )}
                                                                            </div>
                                                                            <p className="mt-2 text-xs text-white text-center line-clamp-2">
                                                                                {getTitle(content)}
                                                                            </p>
                                                                        </div>
                                                                    )
                                                                })}
                                                        </div>
                                                        {/* Pagination controls */}
                                                        {tagContent.length > step1ItemsPerPage && (
                                                            <div className="flex items-center justify-center gap-2 mt-6">
                                                                <button
                                                                    onClick={() =>
                                                                        setStep1Page(
                                                                            Math.max(
                                                                                1,
                                                                                step1Page - 1
                                                                            )
                                                                        )
                                                                    }
                                                                    disabled={step1Page === 1}
                                                                    className="px-3 py-2 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                                >
                                                                    <ChevronLeftIcon className="w-5 h-5" />
                                                                </button>
                                                                <span className="text-sm text-gray-400 min-w-[100px] text-center">
                                                                    Page {step1Page} of{' '}
                                                                    {Math.ceil(
                                                                        tagContent.length /
                                                                            step1ItemsPerPage
                                                                    )}
                                                                </span>
                                                                <button
                                                                    onClick={() =>
                                                                        setStep1Page(
                                                                            Math.min(
                                                                                Math.ceil(
                                                                                    tagContent.length /
                                                                                        step1ItemsPerPage
                                                                                ),
                                                                                step1Page + 1
                                                                            )
                                                                        )
                                                                    }
                                                                    disabled={
                                                                        step1Page >=
                                                                        Math.ceil(
                                                                            tagContent.length /
                                                                                step1ItemsPerPage
                                                                        )
                                                                    }
                                                                    className="px-3 py-2 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                                >
                                                                    <ChevronRightIcon className="w-5 h-5" />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        ) : query.length >= 2 ? (
                                            <div>
                                                <div className="flex items-center justify-between mb-3">
                                                    <h3 className="text-lg font-bold text-white">
                                                        Search Results
                                                    </h3>
                                                    {results.length > 0 && (
                                                        <span className="text-sm text-gray-400">
                                                            {results.length} results
                                                        </span>
                                                    )}
                                                </div>
                                                {isSearchLoading ? (
                                                    <div className="text-center py-8 text-gray-500">
                                                        Searching...
                                                    </div>
                                                ) : results.length === 0 ? (
                                                    <div className="text-center py-8 text-gray-500">
                                                        No results found
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3">
                                                            {results
                                                                .slice(
                                                                    (step1Page - 1) *
                                                                        step1ItemsPerPage,
                                                                    step1Page * step1ItemsPerPage
                                                                )
                                                                .map((content) => {
                                                                    const isSelected =
                                                                        selectedItems.find(
                                                                            (item) =>
                                                                                item.id ===
                                                                                content.id
                                                                        )
                                                                    const canSelect =
                                                                        selectedItems.length <
                                                                        RANKING_CONSTRAINTS.MAX_ITEM_COUNT

                                                                    return (
                                                                        <div
                                                                            key={content.id}
                                                                            className="relative group cursor-pointer"
                                                                            onClick={() =>
                                                                                handleToggleItem(
                                                                                    content
                                                                                )
                                                                            }
                                                                        >
                                                                            <div className="relative aspect-[2/3]">
                                                                                <Image
                                                                                    src={getPosterPath(
                                                                                        content
                                                                                    )}
                                                                                    alt={getTitle(
                                                                                        content
                                                                                    )}
                                                                                    fill
                                                                                    sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, (max-width: 1024px) 20vw, (max-width: 1280px) 16vw, 14vw"
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
                                                                                            Limit
                                                                                            reached
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
                                                        {/* Pagination controls */}
                                                        {results.length > step1ItemsPerPage && (
                                                            <div className="flex items-center justify-center gap-2 mt-6">
                                                                <button
                                                                    onClick={() =>
                                                                        setStep1Page(
                                                                            Math.max(
                                                                                1,
                                                                                step1Page - 1
                                                                            )
                                                                        )
                                                                    }
                                                                    disabled={step1Page === 1}
                                                                    className="px-3 py-2 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                                >
                                                                    <ChevronLeftIcon className="w-5 h-5" />
                                                                </button>
                                                                <span className="text-sm text-gray-400 min-w-[100px] text-center">
                                                                    Page {step1Page} of{' '}
                                                                    {Math.ceil(
                                                                        results.length /
                                                                            step1ItemsPerPage
                                                                    )}
                                                                </span>
                                                                <button
                                                                    onClick={() =>
                                                                        setStep1Page(
                                                                            Math.min(
                                                                                Math.ceil(
                                                                                    results.length /
                                                                                        step1ItemsPerPage
                                                                                ),
                                                                                step1Page + 1
                                                                            )
                                                                        )
                                                                    }
                                                                    disabled={
                                                                        step1Page >=
                                                                        Math.ceil(
                                                                            results.length /
                                                                                step1ItemsPerPage
                                                                        )
                                                                    }
                                                                    className="px-3 py-2 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                                >
                                                                    <ChevronRightIcon className="w-5 h-5" />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="text-center py-12 text-gray-500">
                                                <MagnifyingGlassIcon className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                                                <p className="text-lg mb-2">
                                                    Search for movies and TV shows
                                                </p>
                                                <p className="text-sm">
                                                    Type at least 2 characters to start searching
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Right: Selected Items Panel */}
                                    <div className="lg:self-stretch flex flex-col">
                                        <div className="bg-zinc-800 rounded-lg p-4 border border-zinc-700 flex flex-col h-full min-h-[600px]">
                                            <div className="flex items-center justify-between mb-4">
                                                <h3 className="text-lg font-bold text-white">
                                                    Selected
                                                </h3>
                                                {selectedItems.length > 0 && (
                                                    <div
                                                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                                                            selectedItems.length >=
                                                            RANKING_CONSTRAINTS.MIN_ITEM_COUNT
                                                                ? 'bg-green-500/20 text-green-400'
                                                                : 'bg-yellow-500/20 text-yellow-400'
                                                        }`}
                                                    >
                                                        {selectedItems.length}
                                                    </div>
                                                )}
                                            </div>

                                            {selectedItems.length > 0 ? (
                                                <>
                                                    <div className="space-y-2 flex-1 overflow-y-auto pr-2">
                                                        {selectedItems.map((content) => (
                                                            <div
                                                                key={content.id}
                                                                className="flex items-center gap-3 bg-zinc-900 rounded-lg p-2 group hover:bg-zinc-750 transition-colors"
                                                            >
                                                                <div className="relative w-16 h-24 flex-shrink-0">
                                                                    <Image
                                                                        src={getPosterPath(content)}
                                                                        alt={getTitle(content)}
                                                                        fill
                                                                        sizes="64px"
                                                                        className="object-cover rounded shadow-md"
                                                                    />
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-sm font-medium text-white truncate">
                                                                        {getTitle(content)}
                                                                    </p>
                                                                    <p className="text-xs text-gray-400">
                                                                        {getYear(content)}
                                                                    </p>
                                                                </div>
                                                                <button
                                                                    onClick={() =>
                                                                        handleToggleItem(content)
                                                                    }
                                                                    className="flex-shrink-0 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100"
                                                                >
                                                                    <XMarkIcon className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <button
                                                        onClick={() => setSelectedItems([])}
                                                        className="w-full mt-4 px-4 py-2 text-sm bg-zinc-900 hover:bg-zinc-950 text-gray-400 hover:text-red-400 rounded-lg transition-colors"
                                                    >
                                                        Clear All
                                                    </button>
                                                </>
                                            ) : (
                                                <div className="text-center py-8 text-gray-500">
                                                    <p className="text-sm">No items selected yet</p>
                                                    <p className="text-xs mt-1">
                                                        Search and click to add
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 2: Order & Notes */}
                        {currentStep === 2 &&
                            (() => {
                                // Pagination calculations
                                const totalPages = Math.ceil(rankedItems.length / itemsPerPage)
                                const startIndex = (currentPage - 1) * itemsPerPage
                                const endIndex = startIndex + itemsPerPage
                                const paginatedItems = rankedItems.slice(startIndex, endIndex)

                                return (
                                    <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800">
                                        <div className="mb-6">
                                            <div className="flex items-center justify-between mb-4">
                                                <h2 className="text-2xl font-bold text-white">
                                                    Order Your Ranking
                                                </h2>
                                                <div className="text-sm text-gray-400">
                                                    Showing {startIndex + 1}-
                                                    {Math.min(endIndex, rankedItems.length)} of{' '}
                                                    {rankedItems.length}
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-3 p-4 bg-zinc-800/50 border border-zinc-700 rounded-lg">
                                                <div className="flex-shrink-0 w-8 h-8 bg-yellow-500/10 rounded-full flex items-center justify-center">
                                                    <Bars3Icon className="w-5 h-5 text-yellow-500" />
                                                </div>
                                                <div className="flex-1 text-sm">
                                                    <p className="text-gray-300 mb-1">
                                                        <strong>Drag the handle</strong> to reorder
                                                        items. Your #1 pick should be at the top.
                                                    </p>
                                                    <p className="text-gray-500">
                                                        Add optional notes to explain your choices
                                                        (e.g., &quot;Best plot twist of all
                                                        time&quot;)
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            {paginatedItems.map((item, paginatedIndex) => {
                                                const actualIndex = startIndex + paginatedIndex
                                                return (
                                                    <div
                                                        key={item.content.id}
                                                        draggable
                                                        onDragStart={() =>
                                                            handleDragStart(actualIndex)
                                                        }
                                                        onDragOver={(e) =>
                                                            handleDragOver(e, actualIndex)
                                                        }
                                                        onDragEnd={handleDragEnd}
                                                        className={`group relative flex items-start gap-4 rounded-lg p-5 transition-all duration-200 ${
                                                            draggedIndex === actualIndex
                                                                ? 'opacity-50 scale-95 bg-yellow-500/10 border-2 border-yellow-500 border-dashed'
                                                                : 'bg-zinc-800 hover:bg-zinc-750 border-2 border-transparent cursor-move'
                                                        }`}
                                                    >
                                                        {/* Drag handle */}
                                                        <div className="flex flex-col items-center gap-2 flex-shrink-0">
                                                            <Bars3Icon className="w-7 h-7 text-gray-500 group-hover:text-yellow-500 transition-colors" />
                                                            <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-yellow-600 text-black font-bold rounded-full flex items-center justify-center text-xl shadow-lg ring-2 ring-black/20">
                                                                #{actualIndex + 1}
                                                            </div>
                                                        </div>

                                                        {/* Poster - Much Larger */}
                                                        <div className="relative w-24 h-36 flex-shrink-0 group-hover:scale-105 transition-transform duration-200">
                                                            <Image
                                                                src={getPosterPath(item.content)}
                                                                alt={getTitle(item.content)}
                                                                fill
                                                                sizes="96px"
                                                                className="object-cover rounded-lg shadow-lg"
                                                            />
                                                            {/* Media type badge */}
                                                            <div className="absolute top-2 right-2">
                                                                <span
                                                                    className={`px-2 py-1 text-xs font-bold rounded backdrop-blur-sm ${
                                                                        item.content.media_type ===
                                                                        'movie'
                                                                            ? 'bg-white/90 text-black'
                                                                            : 'bg-black/90 text-white'
                                                                    }`}
                                                                >
                                                                    {item.content.media_type ===
                                                                    'movie'
                                                                        ? 'Movie'
                                                                        : 'TV'}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* Content info and note */}
                                                        <div className="flex-1 min-w-0 space-y-3">
                                                            <div>
                                                                <h3 className="text-xl font-bold text-white group-hover:text-yellow-400 transition-colors line-clamp-2">
                                                                    {getTitle(item.content)}
                                                                </h3>
                                                                <div className="flex items-center gap-3 mt-1">
                                                                    <p className="text-sm text-gray-400">
                                                                        {getYear(item.content)}
                                                                    </p>
                                                                    {item.content.vote_average && (
                                                                        <div className="flex items-center gap-1">
                                                                            <span className="text-yellow-400">
                                                                                ★
                                                                            </span>
                                                                            <span className="text-sm font-medium text-gray-300">
                                                                                {item.content.vote_average.toFixed(
                                                                                    1
                                                                                )}
                                                                            </span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* Note input */}
                                                            <div>
                                                                <label className="block text-xs font-medium text-gray-400 mb-1">
                                                                    Note (optional)
                                                                </label>
                                                                <input
                                                                    type="text"
                                                                    value={item.note}
                                                                    onChange={(e) =>
                                                                        handleUpdateNote(
                                                                            actualIndex,
                                                                            e.target.value
                                                                        )
                                                                    }
                                                                    placeholder="Why did you rank this here?"
                                                                    maxLength={
                                                                        RANKING_CONSTRAINTS.MAX_NOTE_LENGTH
                                                                    }
                                                                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 transition-all"
                                                                    onClick={(e) =>
                                                                        e.stopPropagation()
                                                                    }
                                                                    onDragStart={(e) =>
                                                                        e.stopPropagation()
                                                                    }
                                                                />
                                                                <p className="text-xs text-gray-600 mt-1">
                                                                    {item.note.length}/
                                                                    {
                                                                        RANKING_CONSTRAINTS.MAX_NOTE_LENGTH
                                                                    }
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {/* Remove button */}
                                                        <button
                                                            onClick={() => {
                                                                const newItems = rankedItems.filter(
                                                                    (_, i) => i !== actualIndex
                                                                )
                                                                setRankedItems(newItems)
                                                                // Also remove from selectedItems
                                                                setSelectedItems(
                                                                    selectedItems.filter(
                                                                        (c) =>
                                                                            c.id !== item.content.id
                                                                    )
                                                                )
                                                            }}
                                                            className="flex-shrink-0 w-8 h-8 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                                                            title="Remove from ranking"
                                                        >
                                                            <XMarkIcon className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                )
                                            })}
                                        </div>

                                        {/* Pagination Controls */}
                                        {rankedItems.length > 0 && (
                                            <div className="flex items-center justify-between px-4 py-6 border-t border-zinc-800">
                                                {/* Items per page selector */}
                                                <div className="flex items-center gap-3">
                                                    <label className="text-sm text-gray-400">
                                                        Items per page:
                                                    </label>
                                                    <select
                                                        value={itemsPerPage}
                                                        onChange={(e) => {
                                                            setItemsPerPage(Number(e.target.value))
                                                            setCurrentPage(1) // Reset to first page
                                                        }}
                                                        className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20"
                                                    >
                                                        <option value={5}>5</option>
                                                        <option value={10}>10</option>
                                                        <option value={20}>20</option>
                                                        <option value={50}>50</option>
                                                    </select>
                                                </div>

                                                {/* Page navigation */}
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() =>
                                                            setCurrentPage((p) =>
                                                                Math.max(1, p - 1)
                                                            )
                                                        }
                                                        disabled={currentPage === 1}
                                                        className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-900 disabled:text-gray-600 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-all"
                                                    >
                                                        Previous
                                                    </button>

                                                    <div className="flex items-center gap-1">
                                                        {Array.from(
                                                            { length: totalPages },
                                                            (_, i) => i + 1
                                                        ).map((page) => {
                                                            // Show first page, last page, current page, and pages around current
                                                            const showPage =
                                                                page === 1 ||
                                                                page === totalPages ||
                                                                Math.abs(page - currentPage) <= 1

                                                            if (!showPage) {
                                                                // Show ellipsis for gaps
                                                                if (
                                                                    page === currentPage - 2 ||
                                                                    page === currentPage + 2
                                                                ) {
                                                                    return (
                                                                        <span
                                                                            key={page}
                                                                            className="px-2 text-gray-600"
                                                                        >
                                                                            ...
                                                                        </span>
                                                                    )
                                                                }
                                                                return null
                                                            }

                                                            return (
                                                                <button
                                                                    key={page}
                                                                    onClick={() =>
                                                                        setCurrentPage(page)
                                                                    }
                                                                    className={`min-w-[40px] h-10 rounded-lg text-sm font-medium transition-all ${
                                                                        page === currentPage
                                                                            ? 'bg-yellow-500 text-black'
                                                                            : 'bg-zinc-800 hover:bg-zinc-700 text-white'
                                                                    }`}
                                                                >
                                                                    {page}
                                                                </button>
                                                            )
                                                        })}
                                                    </div>

                                                    <button
                                                        onClick={() =>
                                                            setCurrentPage((p) =>
                                                                Math.min(totalPages, p + 1)
                                                            )
                                                        }
                                                        disabled={currentPage === totalPages}
                                                        className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-900 disabled:text-gray-600 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-all"
                                                    >
                                                        Next
                                                    </button>
                                                </div>

                                                {/* Page info */}
                                                <div className="text-sm text-gray-400">
                                                    Page {currentPage} of {totalPages}
                                                </div>
                                            </div>
                                        )}

                                        {/* Empty state */}
                                        {rankedItems.length === 0 && (
                                            <div className="text-center py-12 text-gray-500">
                                                <p className="text-lg mb-2">
                                                    No items to order yet
                                                </p>
                                                <p className="text-sm">
                                                    Go back to Step 1 to select content
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )
                            })()}

                        {/* Step 3: Name & Share */}
                        {currentStep === 3 && (
                            <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800 space-y-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <TrophyIcon className="w-8 h-8 text-yellow-500" />
                                    <h2 className="text-2xl font-bold text-white">Name & Share</h2>
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
                                        {title.length}/{RANKING_CONSTRAINTS.MAX_TITLE_LENGTH}{' '}
                                        characters
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
                                        {description.length}/
                                        {RANKING_CONSTRAINTS.MAX_DESCRIPTION_LENGTH} characters
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
                </div>
            </div>
        </div>
    )
}

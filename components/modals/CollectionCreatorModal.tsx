'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '../../stores/appStore'
import { useSessionStore } from '../../stores/sessionStore'
import { useSmartSearchStore } from '../../stores/smartSearchStore'
import { useToast } from '../../hooks/useToast'
import {
    XMarkIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    SparklesIcon,
    MagnifyingGlassIcon,
} from '@heroicons/react/24/outline'
import IconPickerModal from './IconPickerModal'
import ColorPickerModal from './ColorPickerModal'
import InlineSearchBar from './InlineSearchBar'
import useUserData from '../../hooks/useUserData'
import Image from 'next/image'
import { Content, getTitle, getYear, isMovie } from '../../typings'
import { authenticatedFetch, AuthRequiredError } from '@/lib/authenticatedFetch'

const ITEMS_PER_PAGE = 8 // 2 rows x 4 columns

// Simplified content card for modal display
function SimpleContentCard({
    content,
    onRemove,
}: {
    content: Content
    onRemove: (e: React.MouseEvent) => void
}) {
    const [imageLoaded, setImageLoaded] = useState(false)

    return (
        <div className="relative group cursor-pointer">
            {/* Remove Button - Center Top with white circle and black X */}
            <button
                onClick={onRemove}
                onMouseEnter={(e) => e.stopPropagation()}
                onMouseLeave={(e) => e.stopPropagation()}
                className="
                    absolute top-2 left-1/2 -translate-x-1/2 z-50
                    w-10 h-10 rounded-full
                    bg-white shadow-lg
                    border-2 border-black
                    opacity-0 group-hover:opacity-100
                    transition-all duration-200
                    hover:scale-110
                    flex items-center justify-center
                "
                aria-label="Remove from collection"
            >
                <XMarkIcon className="h-6 w-6 text-black" />
            </button>

            {/* Poster Image */}
            <div className="relative aspect-[2/3] bg-gray-800 rounded-md overflow-hidden">
                {!imageLoaded && (
                    <div className="w-full h-full bg-gray-800 animate-pulse flex items-center justify-center">
                        <div className="w-6 h-6 border-2 border-gray-600 border-t-red-600 rounded-full animate-spin"></div>
                    </div>
                )}

                {content.poster_path && (
                    <Image
                        src={`https://image.tmdb.org/t/p/w342${content.poster_path}`}
                        alt={getTitle(content)}
                        fill
                        className="object-cover transition-transform group-hover:scale-105"
                        sizes="(max-width: 640px) 50vw, 150px"
                        onLoad={() => setImageLoaded(true)}
                    />
                )}
            </div>

            {/* Rating Badge */}
            {content.vote_average > 0 && imageLoaded && (
                <div className="absolute top-2 left-2 bg-black/80 backdrop-blur-sm rounded-full px-2 py-1 z-10">
                    <div className="flex items-center gap-1">
                        <span className="text-yellow-400 text-xs">⭐</span>
                        <span className="text-white text-xs font-medium">
                            {content.vote_average.toFixed(1)}
                        </span>
                    </div>
                </div>
            )}

            {/* Media Type Pill */}
            {imageLoaded && (
                <div className="absolute top-2 right-2 z-10">
                    <span
                        className={`px-2 py-0.5 text-xs rounded-full backdrop-blur-sm font-bold ${
                            isMovie(content)
                                ? 'bg-white/90 text-black'
                                : 'bg-black/90 text-white border border-white/50'
                        }`}
                    >
                        {isMovie(content) ? 'Movie' : 'TV'}
                    </span>
                </div>
            )}

            {/* Title on Hover */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity rounded-md">
                <div className="absolute bottom-0 left-0 right-0 p-2">
                    <p className="text-white text-xs font-medium line-clamp-2">
                        {getTitle(content)}
                    </p>
                </div>
            </div>
        </div>
    )
}

export default function CollectionCreatorModal() {
    const router = useRouter()
    const {
        collectionCreatorModal,
        closeCollectionCreatorModal,
        setCollectionCreatorName,
        addToCollectionCreator,
        removeFromCollectionCreator,
    } = useAppStore()
    const getUserId = useSessionStore((state) => state.getUserId)
    const { createList, addToList } = useUserData()
    const { showSuccess, showError } = useToast()
    const { query, mode, conversationHistory, addResults, addToConversation } =
        useSmartSearchStore()

    const [selectedEmoji, setSelectedEmoji] = useState('📺')
    const [selectedColor, setSelectedColor] = useState('#3b82f6') // blue-500
    const [showIconPicker, setShowIconPicker] = useState(false)
    const [showColorPicker, setShowColorPicker] = useState(false)
    const [isCreating, setIsCreating] = useState(false)
    const [isLoadingMore, setIsLoadingMore] = useState(false)
    const [currentPage, setCurrentPage] = useState(0)
    const [searchFilter, setSearchFilter] = useState('')
    const [displayAsRow, setDisplayAsRow] = useState(false)
    const [isPublic, setIsPublic] = useState(false)

    // Filter content based on search
    const filteredContent = useMemo(() => {
        if (!searchFilter.trim()) return collectionCreatorModal.content

        const searchLower = searchFilter.toLowerCase().trim()
        return collectionCreatorModal.content.filter((item) => {
            const title = getTitle(item).toLowerCase()
            return title.includes(searchLower)
        })
    }, [collectionCreatorModal.content, searchFilter])

    const totalPages = Math.ceil(filteredContent.length / ITEMS_PER_PAGE)
    const startIndex = currentPage * ITEMS_PER_PAGE
    const endIndex = startIndex + ITEMS_PER_PAGE
    const currentItems = filteredContent.slice(startIndex, endIndex)

    // Fill empty slots to maintain grid height (2 rows x 4 columns = 8 slots)
    const emptySlots = ITEMS_PER_PAGE - currentItems.length
    const fillerItems = Array(emptySlots).fill(null)

    const handleClose = () => {
        closeCollectionCreatorModal()
        setSelectedEmoji('📺')
        setSelectedColor('#3b82f6')
        setShowIconPicker(false)
        setShowColorPicker(false)
        setCurrentPage(0)
        setSearchFilter('')
        setDisplayAsRow(false)
        setIsPublic(false)
    }

    const handleCreate = async () => {
        const userId = getUserId()

        if (!userId) {
            showError('Please sign in to create collections')
            return
        }

        if (!collectionCreatorModal.name.trim()) {
            showError('Please enter a collection name')
            return
        }

        setIsCreating(true)

        try {
            // Create the list using useUserData hook
            const newListResult = createList({
                name: collectionCreatorModal.name.trim(),
                isPublic,
                emoji: selectedEmoji,
                color: selectedColor,
                displayAsRow,
                collectionType: 'ai-generated', // This is from smart search
                originalQuery: query, // Store the original search query
                canGenerateMore: true, // AI-generated collections can always generate more
                autoUpdateEnabled: false, // AI-generated collections don't auto-update
                updateFrequency: 'never',
            })

            // Handle both sync and async returns
            const listId = typeof newListResult === 'string' ? newListResult : await newListResult

            // Add all content items to the list and wait for completion
            await Promise.all(
                collectionCreatorModal.content.map((contentItem) => addToList(listId, contentItem))
            )

            showSuccess(
                'Collection saved!',
                `"${collectionCreatorModal.name}" with ${collectionCreatorModal.content.length} titles`
            )

            handleClose()

            // Navigate to collections page
            router.push('/collections')
        } catch (error: any) {
            console.error('Create collection error:', error)
            showError('Failed to create collection', error.message)
        } finally {
            setIsCreating(false)
        }
    }

    const handleAskForMore = async () => {
        setIsLoadingMore(true)

        try {
            const state = useSmartSearchStore.getState()

            // Create list of existing movies with title and year for better context
            const existingMovies = state.results.map((r) => ({
                title: getTitle(r),
                year: getYear(r),
            }))

            const response = await authenticatedFetch('/api/ai-suggestions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    query: query,
                    mode,
                    conversationHistory: state.conversationHistory,
                    existingMovies,
                }),
            })

            if (!response.ok) {
                if (response.status === 429) {
                    const data = await response.json().catch(() => ({}))
                    showError(
                        'AI limit reached',
                        data.error || 'Daily Gemini limit reached. Please try again tomorrow.'
                    )
                    throw new Error('AI limit reached')
                }
                if (response.status === 401) {
                    showError('Session expired', 'Please sign in again to continue.')
                    throw new Error('Authentication required')
                }
                throw new Error('Failed to get more suggestions')
            }

            const data = await response.json()

            // Create a Set of existing titles (normalized) for duplicate checking
            const existingTitlesSet = new Set(
                state.results.map((r) => {
                    const title = getTitle(r).toLowerCase().trim()
                    const year = getYear(r).trim()
                    return `${title}::${year}`
                })
            )

            // Filter out duplicates from new results
            const uniqueNewResults = data.results.filter((newItem: any) => {
                const title = getTitle(newItem).toLowerCase().trim()
                const year = getYear(newItem).trim()
                const key = `${title}::${year}`
                return !existingTitlesSet.has(key)
            })

            if (uniqueNewResults.length > 0) {
                addResults(uniqueNewResults)
                addToConversation({
                    role: 'user',
                    content: 'Show me more similar titles',
                })
                addToConversation({
                    role: 'assistant',
                    content: `Added ${uniqueNewResults.length} more suggestions`,
                })
                showSuccess('Added more suggestions', `Found ${uniqueNewResults.length} new titles`)
            } else {
                showError('No new suggestions found', 'All returned titles were duplicates')
            }
        } catch (error) {
            if (error instanceof AuthRequiredError) {
                showError('Please sign in', 'Smart Search requires a Net Trailers account.')
            } else {
                console.error('Ask for more error:', error)
                showError('Failed to get more suggestions')
            }
        } finally {
            setIsLoadingMore(false)
        }
    }

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && collectionCreatorModal.name.trim()) {
            handleCreate()
        } else if (e.key === 'Escape') {
            handleClose()
        }
    }

    const handlePrevPage = () => {
        setCurrentPage((prev) => Math.max(0, prev - 1))
    }

    const handleNextPage = () => {
        setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1))
    }

    const handleRemoveContent = (e: React.MouseEvent, contentId: number) => {
        e.stopPropagation()
        removeFromCollectionCreator(contentId)

        // If this was the last item, close the modal
        if (collectionCreatorModal.content.length === 1) {
            handleClose()
            showError('Collection is empty', 'Add some content to create a collection')
            return
        }

        // If we removed the last item on the current page and it's not the first page, go back one page
        if (currentItems.length === 1 && currentPage > 0) {
            setCurrentPage(currentPage - 1)
        }
    }

    if (!collectionCreatorModal.isOpen) return null

    return (
        <div className="fixed inset-0 z-[55000] flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

            {/* Modal - Narrower width */}
            <div className="relative bg-[#141414] rounded-lg shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-700">
                    <div>
                        <h2 className="text-xl font-semibold text-white">Create Collection</h2>
                        <p className="text-sm text-gray-400 mt-1">
                            {collectionCreatorModal.content.length} title
                            {collectionCreatorModal.content.length !== 1 ? 's' : ''} selected
                        </p>
                    </div>
                    {/* White circle with black X */}
                    <button
                        onClick={handleClose}
                        className="w-10 h-10 rounded-full bg-white hover:bg-gray-200 flex items-center justify-center transition-colors"
                    >
                        <XMarkIcon className="w-6 h-6 text-black" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 flex-1 overflow-y-auto">
                    <div className="space-y-6">
                        {/* Icon, Color Pickers, and Name Input - Centered */}
                        <div className="flex items-center justify-center space-x-3">
                            {/* Icon Picker */}
                            <div className="relative flex-shrink-0">
                                <button
                                    onClick={() => setShowIconPicker(true)}
                                    className="w-14 h-14 bg-gray-800 border border-gray-600 rounded-lg flex items-center justify-center text-3xl transition-all duration-200 hover:bg-gray-700 hover:border-gray-500"
                                    title="Choose an icon"
                                >
                                    {selectedEmoji}
                                </button>

                                <IconPickerModal
                                    isOpen={showIconPicker}
                                    selectedIcon={selectedEmoji}
                                    onSelectIcon={(emoji) => {
                                        setSelectedEmoji(emoji)
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
                                        style={{ backgroundColor: selectedColor }}
                                    />
                                </button>

                                <ColorPickerModal
                                    isOpen={showColorPicker}
                                    selectedColor={selectedColor}
                                    onSelectColor={(color) => {
                                        setSelectedColor(color)
                                        setShowColorPicker(false)
                                    }}
                                    onClose={() => setShowColorPicker(false)}
                                />
                            </div>

                            {/* Name Input - Fixed width */}
                            <div>
                                <input
                                    type="text"
                                    placeholder="Collection name"
                                    value={collectionCreatorModal.name}
                                    onChange={(e) => setCollectionCreatorName(e.target.value)}
                                    onKeyDown={handleKeyPress}
                                    className="w-96 h-14 px-4 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    autoFocus
                                />
                            </div>
                        </div>

                        {/* Collection Options - Centered */}
                        <div className="flex justify-center">
                            <div className="flex gap-6">
                                {/* Display as Row Checkbox */}
                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        checked={displayAsRow}
                                        onChange={(e) => setDisplayAsRow(e.target.checked)}
                                        className="w-5 h-5 rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer"
                                    />
                                    <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
                                        Display as row on home
                                    </span>
                                </label>

                                {/* Public Collection Checkbox */}
                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        checked={isPublic}
                                        onChange={(e) => setIsPublic(e.target.checked)}
                                        className="w-5 h-5 rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer"
                                    />
                                    <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
                                        Public collection
                                    </span>
                                </label>
                            </div>
                        </div>

                        {/* Inline Search Bar - Add Individual Content */}
                        <div className="flex justify-center">
                            <div className="w-full max-w-2xl">
                                <InlineSearchBar
                                    onAddContent={addToCollectionCreator}
                                    existingContentIds={collectionCreatorModal.content.map(
                                        (c) => c.id
                                    )}
                                    placeholder="Search to add movies or TV shows..."
                                />
                            </div>
                        </div>

                        {/* Search Filter Input - Centered */}
                        <div className="flex justify-center">
                            <div className="relative w-96">
                                <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Filter titles..."
                                    value={searchFilter}
                                    onChange={(e) => {
                                        setSearchFilter(e.target.value)
                                        setCurrentPage(0) // Reset to first page when filtering
                                    }}
                                    className="w-full h-12 pl-12 pr-4 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                                {searchFilter && (
                                    <button
                                        onClick={() => {
                                            setSearchFilter('')
                                            setCurrentPage(0)
                                        }}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                                    >
                                        <XMarkIcon className="h-5 w-5" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Content Grid - Centered */}
                        <div>
                            <div className="flex items-center justify-center mb-4">
                                <button
                                    onClick={handleAskForMore}
                                    disabled={isLoadingMore}
                                    className="
                                        flex items-center gap-2 px-4 py-2 rounded-md
                                        bg-white/10 text-white text-sm font-medium
                                        hover:bg-white/20
                                        disabled:opacity-50 disabled:cursor-not-allowed
                                        transition-all duration-200
                                    "
                                >
                                    <SparklesIcon
                                        className={`h-4 w-4 ${isLoadingMore ? 'animate-pulse' : ''}`}
                                    />
                                    {isLoadingMore ? 'Generating...' : 'Generate More'}
                                </button>
                            </div>

                            {/* Content Cards Grid - 2 rows x 4 columns, centered */}
                            <div className="flex justify-center">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 min-h-[620px]">
                                    {currentItems.map((item) => (
                                        <div key={item.id} className="w-44">
                                            <SimpleContentCard
                                                content={item}
                                                onRemove={(e) => handleRemoveContent(e, item.id)}
                                            />
                                        </div>
                                    ))}
                                    {/* Filler items to maintain grid height */}
                                    {fillerItems.map((_, index) => (
                                        <div
                                            key={`filler-${index}`}
                                            className="w-44 opacity-0 pointer-events-none"
                                        >
                                            <div className="w-full aspect-[2/3] bg-transparent"></div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-between mt-4">
                                    <button
                                        onClick={handlePrevPage}
                                        disabled={currentPage === 0}
                                        className="flex items-center gap-1 px-3 py-2 text-sm text-white bg-gray-800 rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronLeftIcon className="w-4 h-4" />
                                        Previous
                                    </button>
                                    <span className="text-sm text-gray-400">
                                        Page {currentPage + 1} of {totalPages}
                                    </span>
                                    <button
                                        onClick={handleNextPage}
                                        disabled={currentPage === totalPages - 1}
                                        className="flex items-center gap-1 px-3 py-2 text-sm text-white bg-gray-800 rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        Next
                                        <ChevronRightIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer with Action Buttons */}
                <div className="p-6 border-t border-gray-700">
                    <div className="flex space-x-3">
                        <button
                            onClick={handleCreate}
                            disabled={!collectionCreatorModal.name.trim() || isCreating}
                            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold transition-all duration-200 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isCreating ? 'Saving...' : 'Save'}
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
    )
}

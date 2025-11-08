'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '../../stores/appStore'
import { useSessionStore } from '../../stores/sessionStore'
import { useSmartSearchStore } from '../../stores/smartSearchStore'
import { useToast } from '../../hooks/useToast'
import {
    XMarkIcon,
    PlusIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    SparklesIcon,
} from '@heroicons/react/24/outline'
import IconPickerModal from './IconPickerModal'
import ColorPickerModal from './ColorPickerModal'
import useUserData from '../../hooks/useUserData'
import Image from 'next/image'
import { Content, getTitle, isMovie } from '../../typings'

const ITEMS_PER_PAGE = 12 // 2 rows x 6 columns

// Simplified content card for modal display
function SimpleContentCard({ content }: { content: Content }) {
    const [imageLoaded, setImageLoaded] = useState(false)

    return (
        <div className="relative group cursor-pointer">
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

export default function WatchlistCreatorModal() {
    const router = useRouter()
    const { watchlistCreatorModal, closeWatchlistCreatorModal, setWatchlistCreatorName } =
        useAppStore()
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

    if (!watchlistCreatorModal.isOpen) return null

    const totalPages = Math.ceil(watchlistCreatorModal.content.length / ITEMS_PER_PAGE)
    const startIndex = currentPage * ITEMS_PER_PAGE
    const endIndex = startIndex + ITEMS_PER_PAGE
    const currentItems = watchlistCreatorModal.content.slice(startIndex, endIndex)

    // Fill empty slots to maintain grid height (2 rows x 6 columns = 12 slots)
    const emptySlots = ITEMS_PER_PAGE - currentItems.length
    const fillerItems = Array(emptySlots).fill(null)

    const handleClose = () => {
        closeWatchlistCreatorModal()
        setSelectedEmoji('📺')
        setSelectedColor('#3b82f6')
        setShowIconPicker(false)
        setShowColorPicker(false)
        setCurrentPage(0)
    }

    const handleCreate = async () => {
        const userId = getUserId()

        if (!userId) {
            showError('Please sign in to create watchlists')
            return
        }

        if (!watchlistCreatorModal.name.trim()) {
            showError('Please enter a watchlist name')
            return
        }

        setIsCreating(true)

        try {
            // Create the list using useUserData hook
            const newList = createList({
                name: watchlistCreatorModal.name.trim(),
                isPublic: false,
                emoji: selectedEmoji,
                color: selectedColor,
            })

            // Add all content items to the list
            watchlistCreatorModal.content.forEach((contentItem) => {
                addToList(newList.id, contentItem)
            })

            showSuccess(
                'Watchlist created!',
                `"${watchlistCreatorModal.name}" with ${watchlistCreatorModal.content.length} titles`
            )

            handleClose()

            // Navigate to watchlists page
            router.push('/watchlists')
        } catch (error: any) {
            console.error('Create watchlist error:', error)
            showError('Failed to create watchlist', error.message)
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
                title: r.title || r.name || 'Unknown',
                year: r.release_date?.substring(0, 4) || r.first_air_date?.substring(0, 4) || '',
            }))

            const response = await fetch('/api/ai-suggestions', {
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
                throw new Error('Failed to get more suggestions')
            }

            const data = await response.json()

            // Create a Set of existing titles (normalized) for duplicate checking
            const existingTitlesSet = new Set(
                state.results.map((r) => {
                    const title = (r.title || r.name || '').toLowerCase().trim()
                    const year = (
                        r.release_date?.substring(0, 4) ||
                        r.first_air_date?.substring(0, 4) ||
                        ''
                    ).trim()
                    return `${title}::${year}`
                })
            )

            // Filter out duplicates from new results
            const uniqueNewResults = data.results.filter((newItem: any) => {
                const title = (newItem.title || newItem.name || '').toLowerCase().trim()
                const year = (
                    newItem.release_date?.substring(0, 4) ||
                    newItem.first_air_date?.substring(0, 4) ||
                    ''
                ).trim()
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
            console.error('Ask for more error:', error)
            showError('Failed to get more suggestions')
        } finally {
            setIsLoadingMore(false)
        }
    }

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && watchlistCreatorModal.name.trim()) {
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

    return (
        <div className="fixed inset-0 z-[55000] flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

            {/* Modal */}
            <div className="relative bg-[#141414] rounded-lg shadow-2xl max-w-7xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-700">
                    <div>
                        <h2 className="text-xl font-semibold text-white">Create Watchlist</h2>
                        <p className="text-sm text-gray-400 mt-1">
                            {watchlistCreatorModal.content.length} title
                            {watchlistCreatorModal.content.length !== 1 ? 's' : ''} selected
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
                                    placeholder="Watchlist name"
                                    value={watchlistCreatorModal.name}
                                    onChange={(e) => setWatchlistCreatorName(e.target.value)}
                                    onKeyDown={handleKeyPress}
                                    className="w-96 h-14 px-4 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    autoFocus
                                />
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

                            {/* Content Cards Grid - 2 rows x 6 columns, centered */}
                            <div className="flex justify-center">
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 min-h-[580px]">
                                    {currentItems.map((item) => (
                                        <SimpleContentCard key={item.id} content={item} />
                                    ))}
                                    {/* Filler items to maintain grid height */}
                                    {fillerItems.map((_, index) => (
                                        <div
                                            key={`filler-${index}`}
                                            className="opacity-0 pointer-events-none"
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
                            disabled={!watchlistCreatorModal.name.trim() || isCreating}
                            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold transition-all duration-200 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <PlusIcon className="w-5 h-5" />
                            {isCreating ? 'Creating...' : 'Create Watchlist'}
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

'use client'

import { useState, useEffect, useRef } from 'react'
import { SparklesIcon, PlusIcon, PencilIcon, CheckIcon } from '@heroicons/react/24/outline'
import { useSmartSearchStore } from '../../stores/smartSearchStore'
import { useSessionStore } from '../../stores/sessionStore'
import { useAppStore } from '../../stores/appStore'
import { useToast } from '../../hooks/useToast'
import { getTitle, getYear } from '../../typings'
import { fetchWithOptionalAuth } from '@/lib/authenticatedFetch'
import IconPickerModal from '../modals/IconPickerModal'
import ColorPickerModal from '../modals/ColorPickerModal'
import NetflixLoader from '../common/NetflixLoader'

interface SmartSearchActionsProps {
    showAskForMore?: boolean
    showOnlyAskForMore?: boolean
}

export default function SmartSearchActions({
    showAskForMore = true,
    showOnlyAskForMore = false,
}: SmartSearchActionsProps) {
    const {
        mode,
        query,
        results,
        generatedName,
        genreFallback,
        mediaType,
        emoji,
        color,
        setGeneratedName,
        setEmoji,
        setColor,
        addResults,
        addToConversation,
    } = useSmartSearchStore()

    const getUserId = useSessionStore((state) => state.getUserId)
    const openCollectionCreatorModal = useAppStore((state) => state.openCollectionCreatorModal)
    const { showSuccess, showError } = useToast()

    const [editedName, setEditedName] = useState(generatedName)
    const [editedEmoji, setEditedEmoji] = useState(emoji)
    const [editedColor, setEditedColor] = useState(color)
    const [isCreating, setIsCreating] = useState(false)
    const [isAskingMore, setIsAskingMore] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [isHovered, setIsHovered] = useState(false)
    const [showEmojiPicker, setShowEmojiPicker] = useState(false)
    const [showColorPicker, setShowColorPicker] = useState(false)

    const editContainerRef = useRef<HTMLDivElement>(null)

    // Click outside to save edit
    useEffect(() => {
        if (!isEditing) return

        const handleClickOutside = (event: MouseEvent) => {
            if (
                editContainerRef.current &&
                !editContainerRef.current.contains(event.target as Node)
            ) {
                // Save the edit when clicking outside
                setGeneratedName(editedName)
                setEmoji(editedEmoji)
                setColor(editedColor)
                setIsEditing(false)
            }
        }

        // Add listener with a small delay to avoid immediate trigger
        const timeoutId = setTimeout(() => {
            document.addEventListener('mousedown', handleClickOutside)
        }, 100)

        return () => {
            clearTimeout(timeoutId)
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [isEditing, editedName, editedEmoji, editedColor, setGeneratedName, setEmoji, setColor])

    // Sync edited values with store values
    useEffect(() => {
        setEditedName(generatedName)
        setEditedEmoji(emoji)
        setEditedColor(color)
    }, [generatedName, emoji, color])

    const handleSaveEdit = () => {
        setGeneratedName(editedName)
        setEmoji(editedEmoji)
        setColor(editedColor)
        setIsEditing(false)
    }

    const handleAskForMore = async () => {
        setIsAskingMore(true)
        // Don't set global loading state - we want inline loading only

        try {
            const state = useSmartSearchStore.getState()

            // Create list of existing movies with title and year for better context
            const existingMovies = state.results.map((r) => ({
                title: getTitle(r),
                year: getYear(r),
            }))

            const response = await fetchWithOptionalAuth('/api/ai-suggestions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    query: query, // Original query
                    mode,
                    conversationHistory: state.conversationHistory,
                    existingMovies, // Send movie titles and years instead of IDs
                }),
            })

            if (!response.ok) {
                // Try to parse error response
                const errorData = await response.json().catch(() => ({}))
                const errorMessage = errorData.error || 'An unexpected error occurred'

                if (response.status === 429) {
                    showError(
                        'AI limit reached',
                        errorMessage || 'Daily Gemini limit reached. Try again tomorrow.'
                    )
                    throw new Error('AI limit reached')
                }

                if (response.status === 503) {
                    showError(
                        'Service unavailable',
                        'AI service is currently unavailable. Please try again later.'
                    )
                    throw new Error('Service unavailable')
                }

                // Generic error with server message
                showError('Failed to get more suggestions', errorMessage)
                throw new Error(errorMessage)
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
                // The store's addResults already deduplicates by ID, but we've pre-filtered by title+year
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
            // Error already shown via showError in the if block above
            // Only show generic error if no error was shown yet
            if (
                error instanceof Error &&
                !error.message.includes('limit') &&
                !error.message.includes('unavailable')
            ) {
                // Error message already shown in the error handling above
            }
        } finally {
            setIsAskingMore(false)
        }
    }

    const handleCreateCollection = () => {
        const userId = getUserId()

        if (!userId) {
            showError('Please sign in to create collections')
            return
        }

        // Open the collection creator modal with smart search results
        // Map 'both' to 'all' for collection creator modal
        const collectionMediaType: 'movie' | 'tv' | 'all' = mediaType === 'both' ? 'all' : mediaType
        openCollectionCreatorModal(
            editedName || generatedName,
            results,
            collectionMediaType,
            emoji,
            color
        )
    }

    // If showing only "Ask for More", render just that section
    if (showOnlyAskForMore) {
        return (
            <div className="flex flex-col items-center gap-6">
                {!isAskingMore && (
                    <button
                        onClick={handleAskForMore}
                        disabled={isAskingMore}
                        className="
                            flex items-center justify-center gap-2 px-6 py-3 rounded-md
                            bg-white/10 text-white text-base font-medium
                            hover:bg-white/20
                            disabled:opacity-50 disabled:cursor-not-allowed
                            transition-all duration-200
                        "
                    >
                        <SparklesIcon className="h-5 w-5" />
                        Load More
                    </button>
                )}

                {/* Netflix loader when loading more */}
                {isAskingMore && (
                    <NetflixLoader
                        message="Finding more suggestions with AI..."
                        inline={true}
                        slowCounter={true}
                    />
                )}
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Title Section with Create Collection Button */}
            <div
                className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-4 p-4 rounded-2xl transition-all"
                style={{
                    backgroundColor: `${isEditing ? editedColor : color}10`,
                    border: `2px solid ${isEditing ? editedColor : color}40`,
                }}
            >
                {/* Title Container */}
                <div
                    className="group relative inline-block"
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                >
                    {isEditing ? (
                        <div ref={editContainerRef} className="flex items-center gap-4">
                            {/* Emoji picker button */}
                            <div className="relative">
                                <button
                                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                    className="text-4xl md:text-5xl flex items-center justify-center w-14 h-14 md:w-16 md:h-16 rounded-xl hover:scale-105 transition-transform hover:bg-white/10"
                                >
                                    {editedEmoji}
                                </button>
                                <IconPickerModal
                                    isOpen={showEmojiPicker}
                                    selectedIcon={editedEmoji}
                                    onSelectIcon={(icon) => {
                                        setEditedEmoji(icon)
                                        setShowEmojiPicker(false)
                                    }}
                                    onClose={() => setShowEmojiPicker(false)}
                                />
                            </div>

                            {/* Color picker button - next to emoji */}
                            <div className="relative">
                                <button
                                    onClick={() => setShowColorPicker(!showColorPicker)}
                                    className="w-8 h-8 rounded-lg hover:scale-110 transition-transform border-2 border-white/30"
                                    style={{ backgroundColor: editedColor }}
                                    title="Change color"
                                />
                                <ColorPickerModal
                                    isOpen={showColorPicker}
                                    selectedColor={editedColor}
                                    onSelectColor={(c) => {
                                        setEditedColor(c)
                                        setShowColorPicker(false)
                                    }}
                                    onClose={() => setShowColorPicker(false)}
                                />
                            </div>

                            {/* Name input */}
                            <input
                                type="text"
                                value={editedName}
                                onChange={(e) => setEditedName(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveEdit()
                                    if (e.key === 'Escape') {
                                        setEditedName(generatedName)
                                        setEditedEmoji(emoji)
                                        setEditedColor(color)
                                        setIsEditing(false)
                                    }
                                }}
                                autoFocus
                                className="
                                    px-3 py-2 rounded-md w-full sm:w-auto sm:min-w-[200px] max-w-md
                                    bg-white/10 text-white text-xl sm:text-2xl md:text-3xl font-bold
                                    border-2 focus:outline-none
                                "
                                style={{ borderColor: editedColor }}
                            />

                            {/* Save button */}
                            <button
                                onClick={handleSaveEdit}
                                className="p-2 rounded-md text-white hover:opacity-80 transition-colors"
                                style={{ backgroundColor: editedColor }}
                            >
                                <CheckIcon className="h-5 w-5" />
                            </button>
                        </div>
                    ) : (
                        <div
                            className="flex items-center gap-4 cursor-pointer"
                            onClick={() => setIsEditing(true)}
                        >
                            {/* Emoji - no background/border */}
                            <span className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl lg:text-6xl">
                                {emoji}
                            </span>
                            <h1 className="text-xl xs:text-2xl sm:text-3xl font-bold text-white md:text-4xl lg:text-5xl">
                                {editedName}
                            </h1>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    setIsEditing(true)
                                }}
                                className={`
                                    p-2 rounded-md bg-white/10 text-white hover:bg-white/20 transition-all
                                    ${isHovered ? 'opacity-100' : 'opacity-0'}
                                `}
                            >
                                <PencilIcon className="h-5 w-5" />
                            </button>
                        </div>
                    )}
                </div>

                {/* Create Collection Button - to the right of title */}
                <button
                    onClick={handleCreateCollection}
                    disabled={isCreating || results.length === 0}
                    className="
                        flex items-center gap-2 px-8 py-3 rounded-lg
                        bg-blue-600 text-white font-semibold text-base
                        hover:bg-blue-700
                        disabled:opacity-50 disabled:cursor-not-allowed
                        transition-all duration-200
                    "
                >
                    <PlusIcon className="h-6 w-6" />
                    {isCreating ? 'Creating...' : 'Create Collection'}
                </button>
            </div>

            {/* Ask for More Button - Conditionally rendered */}
            {showAskForMore && (
                <div className="flex flex-col items-center gap-6">
                    <button
                        onClick={handleAskForMore}
                        disabled={isAskingMore}
                        className="
                            flex items-center justify-center gap-2 px-4 py-2 rounded-md
                            bg-white/10 text-white text-sm font-medium
                            hover:bg-white/20
                            disabled:opacity-50 disabled:cursor-not-allowed
                            transition-all duration-200
                        "
                    >
                        <SparklesIcon
                            className={`h-4 w-4 ${isAskingMore ? 'animate-pulse' : ''}`}
                        />
                        {isAskingMore ? 'Finding More...' : 'Ask for More Suggestions'}
                    </button>

                    {/* Loading indicator below button - similar to Row.tsx */}
                    {isAskingMore && (
                        <div className="flex items-center justify-center py-4">
                            <div className="text-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-2"></div>
                                <div className="text-sm text-gray-400">
                                    Loading more suggestions...
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

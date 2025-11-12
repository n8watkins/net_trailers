'use client'

import { useState, useEffect } from 'react'
import { SparklesIcon, PlusIcon, PencilIcon, CheckIcon } from '@heroicons/react/24/outline'
import { useSmartSearchStore } from '../../stores/smartSearchStore'
import { useSessionStore } from '../../stores/sessionStore'
import { useAppStore } from '../../stores/appStore'
import { useToast } from '../../hooks/useToast'
import { getTitle, getYear } from '../../typings'
import { fetchWithOptionalAuth } from '@/lib/authenticatedFetch'

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
        setGeneratedName,
        addResults,
        addToConversation,
    } = useSmartSearchStore()

    const getUserId = useSessionStore((state) => state.getUserId)
    const openCollectionCreatorModal = useAppStore((state) => state.openCollectionCreatorModal)
    const { showSuccess, showError } = useToast()

    const [editedName, setEditedName] = useState(generatedName)
    const [isCreating, setIsCreating] = useState(false)
    const [isAskingMore, setIsAskingMore] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [isHovered, setIsHovered] = useState(false)

    // Sync edited name with generated name
    useEffect(() => {
        setEditedName(generatedName)
    }, [generatedName])

    const handleSaveEdit = () => {
        setGeneratedName(editedName)
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
                if (response.status === 429) {
                    const data = await response.json().catch(() => ({}))
                    showError(
                        'AI limit reached',
                        data.error || 'Daily Gemini limit reached. Try again tomorrow.'
                    )
                    throw new Error('AI limit reached')
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
            showError('Failed to get more suggestions')
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
        openCollectionCreatorModal(editedName || generatedName, results, collectionMediaType)
    }

    // If showing only "Ask for More", render just that section
    if (showOnlyAskForMore) {
        return (
            <div className="flex flex-col items-center gap-6">
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
                    <SparklesIcon className={`h-5 w-5 ${isAskingMore ? 'animate-pulse' : ''}`} />
                    {isAskingMore ? 'Finding More...' : 'Ask for More Suggestions'}
                </button>

                {/* Loading indicator below button - similar to Row.tsx */}
                {isAskingMore && (
                    <div className="flex items-center justify-center py-4">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-2"></div>
                            <div className="text-sm text-gray-400">Loading more suggestions...</div>
                        </div>
                    </div>
                )}
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Title Section */}
            <div
                className="group"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                {isEditing ? (
                    <div className="flex items-center gap-3">
                        <input
                            type="text"
                            value={editedName}
                            onChange={(e) => setEditedName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveEdit()
                                if (e.key === 'Escape') {
                                    setEditedName(generatedName)
                                    setIsEditing(false)
                                }
                            }}
                            autoFocus
                            className="
                                px-3 py-2 rounded-md w-auto max-w-md
                                bg-white/10 text-white text-3xl font-bold
                                border-2 border-red-500
                                focus:outline-none
                            "
                            style={{ minWidth: '300px' }}
                        />
                        <button
                            onClick={handleSaveEdit}
                            className="p-2 rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors"
                        >
                            <CheckIcon className="h-5 w-5" />
                        </button>
                    </div>
                ) : (
                    <div className="flex items-center gap-2">
                        <h1 className="text-3xl font-bold text-white md:text-4xl lg:text-5xl">
                            {editedName}
                        </h1>
                        <button
                            onClick={() => setIsEditing(true)}
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

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3">
                {/* Create Collection Button */}
                <button
                    onClick={handleCreateCollection}
                    disabled={isCreating || results.length === 0}
                    className="
                            flex items-center gap-2 px-6 py-2 rounded-md
                            bg-blue-600 text-white font-semibold text-sm
                            hover:bg-blue-700
                            disabled:opacity-50 disabled:cursor-not-allowed
                            transition-all duration-200
                        "
                >
                    <PlusIcon className="h-5 w-5" />
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

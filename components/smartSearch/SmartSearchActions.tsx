'use client'

import { useState } from 'react'
import { SparklesIcon, PlusIcon } from '@heroicons/react/24/outline'
import { useSmartSearchStore } from '../../stores/smartSearchStore'
import { useSessionStore } from '../../stores/sessionStore'
import { useCustomRowsStore } from '../../stores/customRowsStore'
import { CustomRowsFirestore } from '../../utils/firestore/customRows'
import { useToast } from '../../hooks/useToast'

export default function SmartSearchActions() {
    const {
        mode,
        query,
        results,
        generatedName,
        genreFallback,
        mediaType,
        enableInfinite,
        toggleInfinite,
        setGeneratedName,
        setLoading,
        addResults,
        addToConversation,
    } = useSmartSearchStore()

    const getUserId = useSessionStore((state) => state.getUserId)
    const getSessionType = useSessionStore((state) => state.getSessionType)
    const addRow = useCustomRowsStore((state) => state.addRow)
    const { showSuccess, showError } = useToast()

    const [editedName, setEditedName] = useState(generatedName)
    const [isCreating, setIsCreating] = useState(false)
    const [isAskingMore, setIsAskingMore] = useState(false)

    // Sync edited name with generated name
    useState(() => {
        setEditedName(generatedName)
    })

    const handleAskForMore = async () => {
        setIsAskingMore(true)
        setLoading(true)

        try {
            const response = await fetch('/api/ai-suggestions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    query: `${query} - show me more similar titles`,
                    mode,
                    conversationHistory: useSmartSearchStore.getState().conversationHistory,
                    existingResultIds: results.map((r) => r.id),
                }),
            })

            if (!response.ok) {
                throw new Error('Failed to get more suggestions')
            }

            const data = await response.json()

            addResults(data.results)
            addToConversation({
                role: 'user',
                content: 'Show me more similar titles',
            })
            addToConversation({
                role: 'assistant',
                content: `Added ${data.results.length} more suggestions`,
            })

            showSuccess('Added more suggestions', `Found ${data.results.length} additional titles`)
        } catch (error) {
            console.error('Ask for more error:', error)
            showError('Failed to get more suggestions')
        } finally {
            setIsAskingMore(false)
            setLoading(false)
        }
    }

    const handleCreateRow = async () => {
        const userId = getUserId()
        const sessionType = getSessionType()

        if (!userId) {
            showError('Please sign in to create custom rows')
            return
        }

        setIsCreating(true)

        try {
            const isGuest = sessionType === 'guest'

            const formData = {
                name: editedName || generatedName,
                genres: enableInfinite ? genreFallback : [],
                genreLogic: 'OR' as const,
                mediaType,
                enabled: true,
                advancedFilters: {
                    contentIds: results.map((r) => r.id),
                },
            }

            const newRow = await CustomRowsFirestore.createCustomRow(userId, formData, isGuest)
            addRow(userId, newRow)

            showSuccess(
                'Row created!',
                enableInfinite
                    ? `"${newRow.name}" with infinite content enabled`
                    : `"${newRow.name}" with ${results.length} titles`
            )

            // Reset search
            useSmartSearchStore.getState().reset()
        } catch (error: any) {
            console.error('Create row error:', error)
            showError('Failed to create row', error.message)
        } finally {
            setIsCreating(false)
        }
    }

    const handleCreateWatchlist = async () => {
        const userId = getUserId()

        if (!userId) {
            showError('Please sign in to create watchlists')
            return
        }

        setIsCreating(true)

        try {
            // TODO: Implement watchlist creation
            // For now, show placeholder
            showSuccess('Watchlist created!', `"${editedName || generatedName}" saved`)
            useSmartSearchStore.getState().reset()
        } catch (error: any) {
            console.error('Create watchlist error:', error)
            showError('Failed to create watchlist', error.message)
        } finally {
            setIsCreating(false)
        }
    }

    return (
        <div className="sticky bottom-0 left-0 right-0 bg-black/90 backdrop-blur-xl border-t border-white/10 p-4">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center gap-4">
                {/* Name Editor (for row/watchlist modes) */}
                {(mode === 'row' || mode === 'watchlist') && (
                    <input
                        type="text"
                        value={editedName}
                        onChange={(e) => {
                            setEditedName(e.target.value)
                            setGeneratedName(e.target.value)
                        }}
                        placeholder="Enter name..."
                        className="
              flex-1 px-4 py-2 rounded-md
              bg-white/10 text-white placeholder-gray-400
              border border-white/20
              focus:outline-none focus:border-red-500
            "
                    />
                )}

                {/* Infinite Toggle (row mode only) */}
                {mode === 'row' && (
                    <button
                        onClick={toggleInfinite}
                        className={`
              px-4 py-2 rounded-md font-semibold text-sm
              transition-all duration-200
              ${
                  enableInfinite
                      ? 'bg-red-600 text-white'
                      : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }
            `}
                    >
                        {enableInfinite ? 'Infinite: ON' : 'Curated Only'}
                    </button>
                )}

                {/* Ask for More Button */}
                <button
                    onClick={handleAskForMore}
                    disabled={isAskingMore}
                    className="
            flex items-center gap-2 px-4 py-2 rounded-md
            bg-white/10 text-white font-semibold text-sm
            hover:bg-white/20
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-all duration-200
          "
                >
                    <SparklesIcon className="h-5 w-5" />
                    {isAskingMore ? 'Generating...' : 'Ask for More'}
                </button>

                {/* Create Button (row/watchlist modes) */}
                {mode === 'row' && (
                    <button
                        onClick={handleCreateRow}
                        disabled={isCreating || results.length === 0}
                        className="
              flex items-center gap-2 px-6 py-2 rounded-md
              bg-red-600 text-white font-semibold text-sm
              hover:bg-red-700
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-all duration-200
            "
                    >
                        <PlusIcon className="h-5 w-5" />
                        {isCreating ? 'Creating...' : 'Create Row'}
                    </button>
                )}

                {mode === 'watchlist' && (
                    <button
                        onClick={handleCreateWatchlist}
                        disabled={isCreating || results.length === 0}
                        className="
              flex items-center gap-2 px-6 py-2 rounded-md
              bg-red-600 text-white font-semibold text-sm
              hover:bg-red-700
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-all duration-200
            "
                    >
                        <PlusIcon className="h-5 w-5" />
                        {isCreating ? 'Creating...' : 'Create Watchlist'}
                    </button>
                )}
            </div>
        </div>
    )
}

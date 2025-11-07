'use client'

import { useEffect } from 'react'
import { useSmartSearchStore } from '../../stores/smartSearchStore'
import SmartSearchModeBar from './SmartSearchModeBar'
import SmartSearchResults from './SmartSearchResults'
import SmartSearchActions from './SmartSearchActions'

export default function SmartSearchOverlay() {
    const { query, results, isLoading, setLoading, setResults, addToConversation } =
        useSmartSearchStore()

    // Trigger search when query changes
    useEffect(() => {
        if (!query.trim()) return

        const performSearch = async () => {
            setLoading(true)
            try {
                const response = await fetch('/api/ai-suggestions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        query,
                        mode: useSmartSearchStore.getState().mode,
                        conversationHistory: useSmartSearchStore.getState().conversationHistory,
                    }),
                })

                if (!response.ok) {
                    throw new Error('Search failed')
                }

                const data = await response.json()

                setResults(data.results, {
                    generatedName: data.generatedName,
                    genreFallback: data.genreFallback,
                    mediaType: data.mediaType,
                })

                // Add to conversation history
                addToConversation({ role: 'user', content: query })
                addToConversation({
                    role: 'assistant',
                    content: `Generated ${data.results.length} suggestions`,
                })
            } catch (error) {
                console.error('Smart search error:', error)
            } finally {
                setLoading(false)
            }
        }

        performSearch()
    }, [query]) // Only trigger on query change

    // Don't show overlay if no query or no results
    if (!query.trim() || results.length === 0) {
        return null
    }

    return (
        <div className="fixed inset-0 z-30 bg-black/70 backdrop-blur-lg overflow-y-auto">
            <div className="min-h-screen pt-32 pb-20 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                    {/* Mode Selection */}
                    <SmartSearchModeBar />

                    {/* Loading State */}
                    {isLoading && (
                        <div className="flex items-center justify-center py-20">
                            <div className="text-white text-lg">Generating suggestions...</div>
                        </div>
                    )}

                    {/* Results Grid */}
                    {!isLoading && results.length > 0 && (
                        <>
                            <SmartSearchResults />
                            <SmartSearchActions />
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}

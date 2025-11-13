'use client'

import { useEffect } from 'react'
import { useSmartSearchStore } from '../../stores/smartSearchStore'
import SmartSearchModeBar from './SmartSearchModeBar'
import SmartSearchResults from './SmartSearchResults'
import SmartSearchActions from './SmartSearchActions'
import { useToast } from '@/hooks/useToast'
import { fetchWithOptionalAuth } from '@/lib/authenticatedFetch'

export default function SmartSearchOverlay() {
    const { query, results, isLoading, setLoading, setResults, addToConversation } =
        useSmartSearchStore()
    const { showError } = useToast()

    // Trigger search when query changes
    useEffect(() => {
        if (!query.trim()) return

        const performSearch = async () => {
            setLoading(true)
            try {
                const response = await fetchWithOptionalAuth('/api/ai-suggestions', {
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
                    if (response.status === 429) {
                        const data = await response.json().catch(() => ({}))
                        showError(
                            'AI limit reached',
                            data.error || 'Daily Gemini limit reached. Try again tomorrow.'
                        )
                        throw new Error('AI limit reached')
                    }
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
    }, [query, setLoading, setResults, addToConversation]) // Only trigger on query change

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

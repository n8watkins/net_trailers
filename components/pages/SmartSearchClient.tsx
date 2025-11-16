'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { SparklesIcon } from '@heroicons/react/24/outline'
import Header from '../layout/Header'
import SmartSearchResults from '../smartSearch/SmartSearchResults'
import SmartSearchActions from '../smartSearch/SmartSearchActions'
import NetflixLoader from '../common/NetflixLoader'
import { useSmartSearchStore } from '../../stores/smartSearchStore'
import { useToast } from '@/hooks/useToast'
import { fetchWithOptionalAuth } from '@/lib/authenticatedFetch'

export default function SmartSearchClient() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const queryParam = searchParams?.get('q')

    const {
        query,
        results,
        isLoading,
        setQuery,
        setLoading,
        setResults,
        addToConversation,
        reset,
    } = useSmartSearchStore()
    const { showError } = useToast()

    // Reset store on unmount to clear old search results and query
    useEffect(() => {
        return () => {
            reset(true) // Clear query when navigating away
        }
    }, [reset])

    // Trigger search when query param changes
    useEffect(() => {
        if (!queryParam?.trim()) {
            // If no query param, redirect back to home
            router.push('/')
            return
        }

        // Update query in store if different
        if (queryParam !== query) {
            setQuery(queryParam)
        }

        const performSearch = async () => {
            setLoading(true)
            try {
                const response = await fetchWithOptionalAuth('/api/ai-suggestions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        query: queryParam,
                        mode: useSmartSearchStore.getState().mode,
                        conversationHistory: useSmartSearchStore.getState().conversationHistory,
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
                    showError('Search failed', errorMessage)
                    throw new Error(errorMessage)
                }

                const data = await response.json()

                setResults(data.results, {
                    generatedName: data.generatedName,
                    genreFallback: data.genreFallback,
                    mediaType: data.mediaType,
                })

                // Add to conversation history
                addToConversation({ role: 'user', content: queryParam })
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
    }, [queryParam]) // Only trigger on query param change

    return (
        <div className="relative min-h-screen bg-gradient-to-b from-black via-gray-900 to-black">
            <Header />

            <main className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
                <div className="max-w-[1600px] mx-auto">
                    {/* Header Section */}
                    <div className="mb-12">
                        <div className="flex items-center gap-3 mb-3">
                            <SparklesIcon className="h-7 w-7 text-red-500" />
                            <h1 className="text-2xl font-bold text-white">Smart Search</h1>
                        </div>
                        <p className="text-gray-400 text-sm">
                            Searching for:{' '}
                            <span className="text-white font-semibold">{queryParam}</span>
                        </p>
                    </div>

                    {/* Actions Bar - Above Results (without Ask for More button) */}
                    {!isLoading && results.length > 0 && (
                        <div className="mb-8">
                            <SmartSearchActions showAskForMore={false} />
                        </div>
                    )}

                    {/* Loading State */}
                    {isLoading && (
                        <NetflixLoader message="Our AI is analyzing your request" inline={true} />
                    )}

                    {/* Results Grid */}
                    {!isLoading && results.length > 0 && (
                        <div className="mb-12">
                            <SmartSearchResults />
                        </div>
                    )}

                    {/* Ask for More Button - Below Results */}
                    {!isLoading && results.length > 0 && (
                        <div className="mt-12">
                            <SmartSearchActions showOnlyAskForMore={true} />
                        </div>
                    )}

                    {/* No Results State */}
                    {!isLoading && results.length === 0 && query && (
                        <div className="flex flex-col items-center justify-center py-32">
                            <SparklesIcon className="h-16 w-16 text-gray-600 mb-4" />
                            <p className="text-white text-xl font-semibold mb-2">
                                No results found
                            </p>
                            <p className="text-gray-400 text-sm">Try refining your search query</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}

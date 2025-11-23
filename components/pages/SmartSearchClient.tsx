'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { SparklesIcon, PencilIcon, CheckIcon } from '@heroicons/react/24/outline'
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

    // Track last searched query to prevent duplicate API calls (React StrictMode runs effects twice)
    const lastSearchedQuery = useRef<string | null>(null)
    const abortControllerRef = useRef<AbortController | null>(null)

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

    // Editable query state
    const [isEditingQuery, setIsEditingQuery] = useState(false)
    const [editedQuery, setEditedQuery] = useState(queryParam || '')
    const editInputRef = useRef<HTMLInputElement>(null)
    const editContainerRef = useRef<HTMLDivElement>(null)

    // Sync edited query when queryParam changes
    useEffect(() => {
        setEditedQuery(queryParam || '')
    }, [queryParam])

    // Focus input when editing starts
    useEffect(() => {
        if (isEditingQuery && editInputRef.current) {
            editInputRef.current.focus()
            editInputRef.current.select()
        }
    }, [isEditingQuery])

    // Click outside to save edit
    useEffect(() => {
        if (!isEditingQuery) return

        const handleClickOutside = (event: MouseEvent) => {
            if (
                editContainerRef.current &&
                !editContainerRef.current.contains(event.target as Node)
            ) {
                handleSaveQuery()
            }
        }

        const timeoutId = setTimeout(() => {
            document.addEventListener('mousedown', handleClickOutside)
        }, 100)

        return () => {
            clearTimeout(timeoutId)
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [isEditingQuery, editedQuery])

    const handleSaveQuery = () => {
        const trimmedQuery = editedQuery.trim()
        if (trimmedQuery && trimmedQuery !== queryParam) {
            // Navigate to new search
            setLoading(true)
            router.push(`/smartsearch?q=${encodeURIComponent(trimmedQuery)}`)
        }
        setIsEditingQuery(false)
    }

    // Reset store on unmount to clear old search results and query
    useEffect(() => {
        return () => {
            reset(true) // Clear query when navigating away
            lastSearchedQuery.current = null
        }
    }, [reset])

    // Trigger search when query param changes
    useEffect(() => {
        if (!queryParam?.trim()) {
            // If no query param, redirect back to home
            router.push('/')
            return
        }

        // Prevent duplicate API calls for the same query (React StrictMode protection)
        if (lastSearchedQuery.current === queryParam) {
            return
        }

        // Update query in store if different
        if (queryParam !== query) {
            setQuery(queryParam)
        }

        // Cancel any in-flight request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort()
        }
        abortControllerRef.current = new AbortController()

        // Mark as pending BEFORE starting fetch to prevent React StrictMode duplicate calls
        lastSearchedQuery.current = queryParam

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
                    signal: abortControllerRef.current?.signal,
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
                    emoji: data.emoji,
                    color: data.color,
                })

                // Add to conversation history
                addToConversation({ role: 'user', content: queryParam })
                addToConversation({
                    role: 'assistant',
                    content: `Generated ${data.results.length} suggestions`,
                })
            } catch (error) {
                // Ignore abort errors
                if (error instanceof Error && error.name === 'AbortError') {
                    return
                }
                // Clear lastSearchedQuery on error to allow retry
                lastSearchedQuery.current = null
                console.error('Smart search error:', error)
            } finally {
                setLoading(false)
            }
        }

        performSearch()

        // Cleanup: abort request if component unmounts or query changes
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort()
            }
        }
    }, [queryParam]) // Only trigger on query param change

    return (
        <div className="relative min-h-screen bg-gradient-to-b from-black via-gray-900 to-black">
            <Header />

            <main className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
                <div className="max-w-[1600px] mx-auto">
                    {/* Header Section */}
                    <div className="mb-12">
                        <div className="flex items-center gap-3 mb-4">
                            <SparklesIcon className="h-8 w-8 text-red-500" />
                            <h1 className="text-2xl font-bold text-white">Smart Search</h1>
                        </div>

                        {/* Editable Search Query */}
                        <div className="group flex items-baseline gap-3" ref={editContainerRef}>
                            <span className="text-gray-400 text-lg leading-none">
                                Searching for:
                            </span>
                            {isEditingQuery ? (
                                <>
                                    <input
                                        ref={editInputRef}
                                        type="text"
                                        value={editedQuery}
                                        onChange={(e) => setEditedQuery(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleSaveQuery()
                                            if (e.key === 'Escape') {
                                                setEditedQuery(queryParam || '')
                                                setIsEditingQuery(false)
                                            }
                                        }}
                                        className="max-w-2xl bg-transparent text-white text-2xl md:text-3xl font-bold leading-none border-b-2 border-red-500 focus:outline-none py-0"
                                    />
                                    <button
                                        onClick={handleSaveQuery}
                                        className="p-1 rounded bg-red-600 text-white hover:bg-red-700 transition-colors self-center"
                                    >
                                        <CheckIcon className="h-4 w-4" />
                                    </button>
                                </>
                            ) : (
                                <>
                                    <h2
                                        className="text-2xl md:text-3xl font-bold text-white leading-none hover:text-red-400 transition-colors cursor-pointer border-b-2 border-transparent"
                                        onClick={() => setIsEditingQuery(true)}
                                    >
                                        {queryParam}
                                    </h2>
                                    <button
                                        onClick={() => setIsEditingQuery(true)}
                                        className="p-1 rounded bg-white/10 text-white opacity-0 group-hover:opacity-100 hover:bg-white/20 transition-all self-center"
                                    >
                                        <PencilIcon className="h-4 w-4" />
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Actions Bar - Above Results (without Ask for More button) */}
                    {!isLoading && results.length > 0 && (
                        <div className="mb-8">
                            <SmartSearchActions showAskForMore={false} />
                        </div>
                    )}

                    {/* Loading State - Inline loader below header */}
                    {/* Show loader when: loading OR (have queryParam but search hasn't completed yet) */}
                    {(isLoading ||
                        (queryParam && results.length === 0 && query !== queryParam)) && (
                        <NetflixLoader
                            message="Our AI is analyzing your request"
                            inline={true}
                            slowCounter={true}
                        />
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

'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from '@/components/common/Link'
import {
    SparklesIcon,
    PencilIcon,
    CheckIcon,
    MagnifyingGlassIcon,
} from '@heroicons/react/24/outline'
import Header from '../layout/Header'
import SmartSearchResults from '../smartSearch/SmartSearchResults'
import SmartSearchActions from '../smartSearch/SmartSearchActions'
import PageLoader from '../common/PageLoader'
import { useSmartSearchStore } from '../../stores/smartSearchStore'
import { fetchWithOptionalAuth } from '@/lib/authenticatedFetch'
import { getExampleMood } from '../../constants/exampleMoods'
import { useAiQuotaStore } from '../../stores/aiQuotaStore'
import ExampleMoodChips from '../smartSearch/ExampleMoodChips'
import type { Content } from '../../typings'

type AiSearchFailure = 'unavailable' | 'limit' | 'invalid'

class AiSearchError extends Error {
    constructor(public readonly kind: AiSearchFailure) {
        super(`AI search failed: ${kind}`)
        this.name = 'AiSearchError'
    }
}

const FAILURE_COPY: Record<AiSearchFailure, { title: string; body: string }> = {
    unavailable: {
        title: 'AI search is unavailable right now',
        body: 'Regular search still works: look titles up by name, actor or keyword.',
    },
    limit: {
        title: 'No AI searches left today',
        body: 'The example moods below still work, and so does regular search.',
    },
    invalid: {
        title: "AI search couldn't use that description",
        body: 'Try a shorter description, or use regular search instead.',
    },
}

export default function SmartSearchClient() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const exampleMood = getExampleMood(searchParams?.get('example'))
    const queryParam = exampleMood ? exampleMood.label : searchParams?.get('q')
    const setAiQuota = useAiQuotaStore((state) => state.setQuota)

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
    // Why the last AI search failed, shown inline instead of a misleading "No results"
    const [failure, setFailure] = useState<AiSearchFailure | null>(null)
    const [retryToken, setRetryToken] = useState(0)

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

        // Example moods load their saved results: instant, and no AI quota spent
        if (exampleMood) {
            lastSearchedQuery.current = null
            setFailure(null)
            setQuery(exampleMood.label)
            setLoading(true)
            fetch(`/example-moods/${exampleMood.id}.json`)
                .then((response) => {
                    if (!response.ok) throw new Error(`Example ${response.status}`)
                    return response.json() as Promise<{ results: Content[] }>
                })
                .then((data) => {
                    setResults(data.results, {
                        generatedName: exampleMood.label,
                        genreFallback: [],
                        mediaType: 'both',
                        emoji: exampleMood.emoji,
                        color: '#f59e0b',
                    })
                })
                .catch(() => setFailure('unavailable'))
                .finally(() => setLoading(false))
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
            setFailure(null)
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
                    if (response.status === 429) {
                        const body = await response.json().catch(() => null)
                        setAiQuota(body?.quota)
                        throw new AiSearchError('limit')
                    }
                    if (response.status >= 400 && response.status < 500) {
                        throw new AiSearchError('invalid')
                    }
                    throw new AiSearchError('unavailable')
                }

                const data = await response.json()
                setAiQuota(data.quota)

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
                // Network failures and server errors both mean AI search is unavailable
                setFailure(error instanceof AiSearchError ? error.kind : 'unavailable')
                useSmartSearchStore.setState({ results: [] })
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
    }, [queryParam, retryToken]) // Only trigger on query (or example) change or an explicit retry

    return (
        <div className="relative min-h-screen bg-gradient-to-b from-black via-gray-900 to-black">
            <Header />

            <main className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
                <div className="max-w-[1600px] mx-auto">
                    {/* Header Section */}
                    <div className="mb-12">
                        <div className="flex items-center gap-3 mb-4">
                            <SparklesIcon className="h-8 w-8 text-amber-400" />
                            <h1 className="text-2xl font-bold text-white">Smart Search</h1>
                        </div>

                        {/* Editable Search Query */}
                        <div className="group flex items-baseline gap-3" ref={editContainerRef}>
                            <span className="text-gray-400 text-lg leading-none">
                                {exampleMood ? 'Example mood:' : 'Searching for:'}
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
                                        className="max-w-2xl bg-transparent text-white text-2xl md:text-3xl font-bold leading-none border-b-2 border-amber-400 focus:outline-none py-0"
                                    />
                                    <button
                                        onClick={handleSaveQuery}
                                        className="p-1 rounded bg-amber-500 text-zinc-950 hover:bg-amber-600 transition-colors self-center"
                                    >
                                        <CheckIcon className="h-4 w-4" />
                                    </button>
                                </>
                            ) : (
                                <>
                                    <h2
                                        className="text-2xl md:text-3xl font-bold text-white leading-none hover:text-amber-300 transition-colors cursor-pointer border-b-2 border-transparent"
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
                        <PageLoader
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

                    {/* AI failure state: say what happened and offer regular search */}
                    {!isLoading && failure && queryParam && (
                        <div
                            role="alert"
                            className="mx-auto flex max-w-lg flex-col items-center py-24 text-center"
                        >
                            <SparklesIcon
                                className="mb-4 h-12 w-12 text-gray-600"
                                aria-hidden="true"
                            />
                            <h2 className="mb-2 text-xl font-semibold text-white">
                                {FAILURE_COPY[failure].title}
                            </h2>
                            <p className="mb-6 text-sm text-gray-400">
                                {FAILURE_COPY[failure].body}
                            </p>
                            <div className="flex flex-wrap items-center justify-center gap-3">
                                <Link
                                    href={`/search?q=${encodeURIComponent(queryParam)}`}
                                    className="inline-flex min-h-[44px] items-center gap-2 rounded-md bg-white px-5 text-sm font-semibold text-black transition-colors hover:bg-gray-200"
                                >
                                    <MagnifyingGlassIcon className="h-4 w-4" aria-hidden="true" />
                                    Search titles instead
                                </Link>
                                {failure === 'unavailable' && (
                                    <button
                                        type="button"
                                        onClick={() => setRetryToken((n) => n + 1)}
                                        className="inline-flex min-h-[44px] items-center rounded-md border border-white/20 px-5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                                    >
                                        Try again
                                    </button>
                                )}
                            </div>
                            {failure !== 'invalid' && (
                                <ExampleMoodChips
                                    label="Example moods:"
                                    className="mt-8 sm:justify-center"
                                />
                            )}
                        </div>
                    )}

                    {/* No Results State */}
                    {!isLoading && !failure && results.length === 0 && query && (
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

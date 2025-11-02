'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Header from '../../components/layout/Header'
import SearchResults from '../../components/search/SearchResults'
import SearchFilters from '../../components/search/SearchFilters'
import { useSearch } from '../../hooks/useSearch'
import { useAppStore } from '../../stores/appStore'
import { useToast } from '../../hooks/useToast'

export default function SearchPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { updateQuery, query, isLoading, isLoadingAll, hasSearched, results, isTruncated } =
        useSearch()
    const [isInitialLoad, setIsInitialLoad] = useState(true)
    const urlUpdateTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)
    const { modal } = useAppStore()
    const showModal = modal.isOpen
    const { showError } = useToast()

    // Loading animation states
    const [loadingCounter, setLoadingCounter] = useState(0)
    const [loadingMessage, setLoadingMessage] = useState('')
    const hasShownTruncationToast = useRef(false)

    // Update search query from URL parameter (only on initial load)
    useEffect(() => {
        const q = searchParams.get('q')
        if (isInitialLoad && q && typeof q === 'string' && q !== query) {
            updateQuery(q)
            setIsInitialLoad(false)
        } else if (isInitialLoad) {
            setIsInitialLoad(false)
        }
    }, [searchParams, query, updateQuery, isInitialLoad])

    // Loading animation effect
    useEffect(() => {
        if ((isLoading || isLoadingAll) && (!hasSearched || results.length === 0)) {
            setLoadingCounter(0)
            setLoadingMessage('🔍 Searching the database...')

            // Counter animation - faster to reach 100% before loading completes
            const counterInterval = setInterval(() => {
                setLoadingCounter((prev) => {
                    if (prev >= 100) {
                        clearInterval(counterInterval)
                        return 100
                    }
                    return prev + 2 // Increment by 2 for faster animation
                })
            }, 15) // Faster interval - completes in ~750ms

            // Message rotation - independent of counter
            const messages = [
                '🔍 Searching...',
                '🎬 Finding matches...',
                '🍿 Looking for titles...',
                '🎭 Checking database...',
                '📽️ Almost there...',
                '🌟 Loading results...',
                '✨ Ready!',
            ]

            let messageIndex = 0
            const messageInterval = setInterval(() => {
                messageIndex = (messageIndex + 1) % messages.length
                setLoadingMessage(messages[messageIndex])
            }, 500) // Change message every half second

            return () => {
                clearInterval(counterInterval)
                clearInterval(messageInterval)
            }
        }
    }, [isLoading, isLoadingAll, hasSearched, results.length])

    // Update URL when query changes (debounced to prevent interference with typing)
    useEffect(() => {
        if (!isInitialLoad && query) {
            // Check if the URL would actually change
            const currentQuery = searchParams.get('q')
            if (currentQuery === query) {
                return // Don't update if the URL query is already the same
            }

            // Clear any existing timeout
            if (urlUpdateTimeoutRef.current) {
                clearTimeout(urlUpdateTimeoutRef.current)
            }

            // Debounce URL updates to avoid interference with typing
            urlUpdateTimeoutRef.current = setTimeout(() => {
                const params = new URLSearchParams(searchParams.toString())
                params.set('q', query)
                router.replace(`/search?${params.toString()}`, { scroll: false })
            }, 500) // Wait 500ms after user stops typing
        }

        return () => {
            if (urlUpdateTimeoutRef.current) {
                clearTimeout(urlUpdateTimeoutRef.current)
            }
        }
    }, [query, router, searchParams, isInitialLoad])

    // Show toast notification when results are truncated
    useEffect(() => {
        if (isTruncated && !hasShownTruncationToast.current) {
            hasShownTruncationToast.current = true
            showError(
                'Search Results Incomplete',
                'Some results could not be loaded due to API limits or errors. Try narrowing your search.'
            )
        }

        // Reset flag when query changes
        if (!isTruncated) {
            hasShownTruncationToast.current = false
        }
    }, [isTruncated, showError])

    // Show fancy loading animation on initial load or when loading with no results
    const showFancyLoading = (isLoading || isLoadingAll) && (!hasSearched || results.length === 0)

    if (showFancyLoading) {
        return (
            <div className="relative min-h-screen bg-gradient-to-b from-gray-900/10 to-[#010511]">
                <Header />
                <main className="relative">
                    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
                        <div className="text-center max-w-md px-6">
                            <div className="flex space-x-3 justify-center mb-6">
                                <div className="w-6 h-6 bg-red-600 rounded-full animate-bounce"></div>
                                <div
                                    className="w-6 h-6 bg-red-600 rounded-full animate-bounce"
                                    style={{ animationDelay: '0.1s' }}
                                ></div>
                                <div
                                    className="w-6 h-6 bg-red-600 rounded-full animate-bounce"
                                    style={{ animationDelay: '0.2s' }}
                                ></div>
                            </div>
                            <div className="text-2xl font-bold text-white mb-6 font-mono">
                                {loadingCounter}%
                            </div>
                            <p className="text-white text-xl mb-2 min-h-[3rem] flex items-center justify-center">
                                {loadingMessage}
                            </p>
                            <p className="text-gray-400 text-sm">
                                {query ? `Searching for "${query}"` : 'Searching...'}
                            </p>
                        </div>
                    </div>
                </main>
            </div>
        )
    }

    return (
        <div
            className={`relative min-h-screen overflow-x-clip ${showModal && `overflow-y-hidden`} bg-gradient-to-b from-gray-900/10 to-[#010511]`}
        >
            <Header />

            <main className="relative pl-16 pb-32 lg:space-y-32 lg:pl-32 xl:pl-40">
                <div className="pt-32 lg:pt-40">
                    {/* Search Filters */}
                    <section className="mb-8">
                        <SearchFilters className="pr-16 lg:pr-32 xl:pr-40 mx-auto max-w-7xl" />
                    </section>

                    {/* Search Results */}
                    <section>
                        <SearchResults className="pr-16 lg:pr-32 xl:pr-40 mx-auto max-w-7xl" />
                    </section>
                </div>
            </main>
        </div>
    )
}

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Header from '../components/Header'
import SearchResults from '../components/SearchResults'
import SearchFilters from '../components/SearchFilters'
import { useSearch } from '../hooks/useSearch'
import { useAppStore } from '../stores/appStore'

interface Props {
    onOpenAboutModal?: () => void
    onOpenTutorial?: () => void
    onOpenKeyboardShortcuts?: () => void
}

export default function SearchPage({
    onOpenAboutModal,
    onOpenTutorial,
    onOpenKeyboardShortcuts,
}: Props) {
    const router = useRouter()
    const { updateQuery, query, isLoading, isLoadingAll, hasSearched, results } = useSearch()
    const [isInitialLoad, setIsInitialLoad] = useState(true)
    const urlUpdateTimeoutRef = useRef<NodeJS.Timeout>()
    const { modal } = useAppStore()
    const showModal = modal.isOpen

    // Loading animation states
    const [loadingCounter, setLoadingCounter] = useState(0)
    const [loadingMessage, setLoadingMessage] = useState('')

    // Update search query from URL parameter (only on initial load)
    useEffect(() => {
        const { q } = router.query
        if (isInitialLoad && q && typeof q === 'string' && q !== query) {
            updateQuery(q)
            setIsInitialLoad(false)
        } else if (isInitialLoad) {
            setIsInitialLoad(false)
        }
    }, [router.query, query, updateQuery, isInitialLoad])

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
            const currentQuery = router.query.q
            if (currentQuery === query) {
                return // Don't update if the URL query is already the same
            }

            // Clear any existing timeout
            if (urlUpdateTimeoutRef.current) {
                clearTimeout(urlUpdateTimeoutRef.current)
            }

            // Debounce URL updates to avoid interference with typing
            urlUpdateTimeoutRef.current = setTimeout(() => {
                router.replace(
                    {
                        pathname: '/search',
                        query: { q: query },
                    },
                    undefined,
                    { shallow: true }
                )
            }, 500) // Wait 500ms after user stops typing
        }

        return () => {
            if (urlUpdateTimeoutRef.current) {
                clearTimeout(urlUpdateTimeoutRef.current)
            }
        }
    }, [query, router, isInitialLoad])

    // Show fancy loading animation on initial load or when loading with no results
    const showFancyLoading = (isLoading || isLoadingAll) && (!hasSearched || results.length === 0)

    if (showFancyLoading) {
        return (
            <div className="relative min-h-screen bg-gradient-to-b from-gray-900/10 to-[#010511]">
                <Head>
                    <title>{query ? `Searching: ${query} - NetTrailer` : 'Searching - NetTrailer'}</title>
                </Head>
                <Header
                    onOpenAboutModal={onOpenAboutModal}
                    onOpenTutorial={onOpenTutorial}
                    onOpenKeyboardShortcuts={onOpenKeyboardShortcuts}
                />
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
            <Head>
                <title>{query ? `Search: ${query} - NetTrailer` : 'Search - NetTrailer'}</title>
                <meta
                    name="description"
                    content={
                        query
                            ? `Search results for "${query}" on NetTrailer`
                            : 'Search for movies and TV shows on NetTrailer'
                    }
                />
            </Head>

            <Header
                onOpenAboutModal={onOpenAboutModal}
                onOpenTutorial={onOpenTutorial}
                onOpenKeyboardShortcuts={onOpenKeyboardShortcuts}
            />

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

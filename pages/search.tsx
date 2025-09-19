import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Header from '../components/Header'
import SearchBar from '../components/SearchBar'
import SearchResults from '../components/SearchResults'
import { useSearch } from '../hooks/useSearch'

export default function SearchPage() {
    const router = useRouter()
    const { updateQuery, query } = useSearch()
    const [isInitialLoad, setIsInitialLoad] = useState(true)
    const urlUpdateTimeoutRef = useRef<NodeJS.Timeout>()

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

    // Update URL when query changes (debounced to prevent interference with typing)
    useEffect(() => {
        if (!isInitialLoad && query) {
            // Clear any existing timeout
            if (urlUpdateTimeoutRef.current) {
                clearTimeout(urlUpdateTimeoutRef.current)
            }

            // Debounce URL updates to avoid interference with typing
            urlUpdateTimeoutRef.current = setTimeout(() => {
                router.replace(
                    {
                        pathname: '/search',
                        query: { q: query }
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

    return (
        <div className="relative h-screen bg-gradient-to-b from-gray-900/10 to-[#010511] lg:h-[140vh]">
            <Head>
                <title>
                    {query ? `Search: ${query} - NetTrailer` : 'Search - NetTrailer'}
                </title>
                <meta
                    name="description"
                    content={
                        query
                            ? `Search results for "${query}" on NetTrailer`
                            : 'Search for movies and TV shows on NetTrailer'
                    }
                />
            </Head>

            <Header />

            <main className="relative pl-4 pb-24 lg:space-y-24 lg:pl-16">
                <div className="pt-24 lg:pt-32">
                    {/* Search Section */}
                    <section className="mb-8">
                        <div className="max-w-4xl">
                            <h1 className="text-3xl lg:text-4xl font-bold text-white mb-4">
                                Search Movies & TV Shows
                            </h1>
                            <p className="text-gray-300 text-lg mb-6">
                                Discover your next favorite movie or TV series from our extensive catalog
                            </p>
                            <SearchBar
                                placeholder="Search for movies, TV shows, actors..."
                                className="max-w-2xl"
                            />
                            <div className="mt-4 flex flex-wrap gap-2 text-sm text-gray-400">
                                <span className="flex items-center gap-1">
                                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                    Movies
                                </span>
                                <span className="flex items-center gap-1">
                                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                    TV Shows
                                </span>
                                <span className="text-gray-500">•</span>
                                <span>Search by title, actor, or genre</span>
                            </div>
                        </div>
                    </section>

                    {/* Search Results */}
                    <section>
                        <SearchResults className="pr-4 lg:pr-16" />
                    </section>
                </div>
            </main>
        </div>
    )
}
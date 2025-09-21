import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Header from '../components/Header'
import SearchResults from '../components/SearchResults'
import SearchFilters from '../components/SearchFilters'
import Modal from '../components/Modal'
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

    return (
        <div className="relative h-screen bg-gradient-to-b from-gray-900/10 to-[#010511] lg:h-[140vh]">
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

            {/* Modal for detailed movie/TV show view */}
            <Modal />
        </div>
    )
}

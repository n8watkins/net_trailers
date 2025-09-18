import { useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Header from '../components/Header'
import SearchBar from '../components/SearchBar'
import SearchResults from '../components/SearchResults'
import { useSearch } from '../hooks/useSearch'

export default function SearchPage() {
    const router = useRouter()
    const { updateQuery, query } = useSearch()

    // Update search query from URL parameter
    useEffect(() => {
        const { q } = router.query
        if (q && typeof q === 'string' && q !== query) {
            updateQuery(q)
        }
    }, [router.query, query, updateQuery])

    // Update URL when query changes
    useEffect(() => {
        if (query) {
            router.replace(
                {
                    pathname: '/search',
                    query: { q: query }
                },
                undefined,
                { shallow: true }
            )
        }
    }, [query, router])

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
                            <h1 className="text-3xl lg:text-4xl font-bold text-white mb-6">
                                Search Movies & TV Shows
                            </h1>
                            <SearchBar
                                placeholder="Search for movies, TV shows, actors..."
                                className="max-w-2xl"
                            />
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
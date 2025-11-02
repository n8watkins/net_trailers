import { Suspense } from 'react'
import type { Metadata } from 'next'
import { fetchHomeData } from '../../lib/serverData'
import MoviesClient from '../../components/pages/MoviesClient'
import NetflixLoader from '../../components/common/NetflixLoader'
import NetflixError from '../../components/common/NetflixError'

export const metadata: Metadata = {
    title: 'Movies - NetTrailer | Stream Trending Movies & Classics',
    description:
        'Discover trending movies, top-rated classics, action, comedy, horror, romance, and documentaries. Watch trailers and find your next favorite film.',
    keywords:
        'movies, trending movies, top rated movies, action movies, comedy movies, horror movies, romance movies, documentaries, movie trailers, netflix clone',
    openGraph: {
        title: 'Movies - NetTrailer',
        description:
            'Discover trending movies, top-rated classics, and watch trailers for thousands of films.',
        type: 'website',
    },
}

async function MoviesContent() {
    try {
        const data = await fetchHomeData('movies')

        // Check if we have any content
        const hasAnyContent =
            data.trending.length > 0 ||
            data.topRated.length > 0 ||
            data.genre1.length > 0 ||
            data.genre2.length > 0 ||
            data.genre3.length > 0 ||
            data.genre4.length > 0 ||
            data.documentaries.length > 0

        if (!hasAnyContent) {
            return <NetflixError />
        }

        return <MoviesClient data={data} />
    } catch (error) {
        console.error('Error fetching movies data:', error)
        return <NetflixError />
    }
}

export default function MoviesPage() {
    return (
        <Suspense fallback={<NetflixLoader message="Loading Movies..." />}>
            <MoviesContent />
        </Suspense>
    )
}

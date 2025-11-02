import { Suspense } from 'react'
import type { Metadata } from 'next'
import { fetchHomeData } from '../../lib/serverData'
import TVClient from '../../components/pages/TVClient'
import NetflixLoader from '../../components/common/NetflixLoader'
import NetflixError from '../../components/common/NetflixError'

export const metadata: Metadata = {
    title: 'TV Shows - NetTrailer | Stream Trending Series & Top Rated Shows',
    description:
        'Explore trending TV shows, top-rated series, action & adventure, comedy, sci-fi & fantasy, animation, and documentary shows. Watch trailers and discover your next binge-worthy series.',
    keywords:
        'tv shows, trending tv shows, top rated series, action tv shows, comedy series, sci-fi shows, fantasy shows, animation, documentaries, tv trailers, netflix clone',
    openGraph: {
        title: 'TV Shows - NetTrailer',
        description:
            'Explore trending TV shows, top-rated series, and watch trailers for thousands of shows.',
        type: 'website',
    },
}

async function TVContent() {
    try {
        const data = await fetchHomeData('tv')

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

        return <TVClient data={data} />
    } catch (error) {
        console.error('Error fetching TV data:', error)
        return <NetflixError />
    }
}

export default function TVPage() {
    return (
        <Suspense fallback={<NetflixLoader message="Loading TV Shows..." />}>
            <TVContent />
        </Suspense>
    )
}

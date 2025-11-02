import { Suspense } from 'react'
import { fetchHomeData } from '../../lib/serverData'
import MoviesClient from '../../components/pages/MoviesClient'
import NetflixLoader from '../../components/common/NetflixLoader'
import NetflixError from '../../components/common/NetflixError'

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

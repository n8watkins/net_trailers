import { Suspense } from 'react'
import { fetchHomeData } from '../../lib/serverData'
import TVClient from '../../components/pages/TVClient'
import NetflixLoader from '../../components/common/NetflixLoader'
import NetflixError from '../../components/common/NetflixError'

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

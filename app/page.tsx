import { Suspense } from 'react'
import { fetchHomeData } from '../lib/serverData'
import HomeClient from '../components/pages/HomeClient'
import PageLoader from '../components/common/PageLoader'
import PageError from '../components/common/PageError'

// Force dynamic rendering since we use cookies for child safety mode
export const dynamic = 'force-dynamic'

async function HomeContent() {
    try {
        const data = await fetchHomeData()

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
            return <PageError />
        }

        return <HomeClient data={data} />
    } catch (error) {
        console.error('Error fetching home data:', error)
        return <PageError />
    }
}

export default function Home() {
    return (
        <Suspense fallback={<PageLoader message="Loading NetTrailers..." />}>
            <HomeContent />
        </Suspense>
    )
}

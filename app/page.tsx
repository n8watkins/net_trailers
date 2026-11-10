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

        const hasAnyContent = data.trending.length > 0

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

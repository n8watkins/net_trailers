import { Suspense } from 'react'
import SmartSearchClient from '../../components/pages/SmartSearchClient'
import NetflixLoader from '../../components/common/NetflixLoader'

export const metadata = {
    title: 'Smart Search - Net Trailers',
    description: 'AI-powered content discovery',
}

export default function SmartSearchPage() {
    return (
        <Suspense fallback={<NetflixLoader message="Loading smart search..." />}>
            <SmartSearchClient />
        </Suspense>
    )
}

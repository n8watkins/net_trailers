import { Suspense } from 'react'
import SmartSearchClient from '../../components/pages/SmartSearchClient'
import PageLoader from '../../components/common/PageLoader'

export const metadata = {
    title: 'Smart Search - NetTrailers',
    description: 'AI-powered content discovery',
}

export default function SmartSearchPage() {
    return (
        <Suspense fallback={<PageLoader message="Loading smart search..." />}>
            <SmartSearchClient />
        </Suspense>
    )
}

import { Suspense } from 'react'
import { fetchHomeData } from '../lib/serverData'
import HomeClient from '../components/pages/HomeClient'
import NetflixLoader from '../components/common/NetflixLoader'
import NetflixError from '../components/common/NetflixError'

interface HomePageProps {
    searchParams: Promise<{ filter?: string }>
}

async function HomeContent({ searchParams }: HomePageProps) {
    const params = await searchParams
    const filter = params.filter

    try {
        const data = await fetchHomeData(filter)

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

        return <HomeClient data={data} filter={filter} />
    } catch (error) {
        console.error('Error fetching home data:', error)
        return <NetflixError />
    }
}

export default function Home(props: HomePageProps) {
    return (
        <Suspense fallback={<NetflixLoader message="Loading NetTrailer..." />}>
            <HomeContent {...props} />
        </Suspense>
    )
}

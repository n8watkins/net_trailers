import type { Metadata } from 'next'
import ForYouPage from '../../components/forYou/ForYouClient'

export const metadata: Metadata = {
    title: 'For you - NetTrailers',
    description: 'Pick 5 titles you love and get AI-ranked picks, each with a reason.',
}

export default function RecommendationsPage() {
    return <ForYouPage />
}

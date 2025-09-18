import Header from '../components/Header'
import requests from '../utils/requests'
import { Content } from '../typings'
import Banner from '../components/Banner'
import Row from '../components/Row'
import useAuth from '../hooks/useAuth'
import Modal from '../components/Modal'
import NetflixLoader from '../components/NetflixLoader'
import NetflixError from '../components/NetflixError'
import { useState, useEffect } from 'react'
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil'
import { modalState } from '../atoms/modalAtom'
import { contentLoadedSuccessfullyState } from '../atoms/userDataAtom'
import Head from 'next/head'
interface Props {
    trending: Content[]
    topRatedMovies: Content[]
    actionMovies: Content[]
    comedyMovies: Content[]
    horrorMovies: Content[]
    romanceMovies: Content[]
    documentaries: Content[]
    hasDataError?: boolean
}
const Home = ({
    trending,
    topRatedMovies,
    actionMovies,
    comedyMovies,
    horrorMovies,
    romanceMovies,
    documentaries,
    hasDataError = false,
}: Props) => {
    const { loading, error, user } = useAuth()
    const showModal = useRecoilValue(modalState)
    const [isPageLoading, setIsPageLoading] = useState(true)
    const setContentLoadedSuccessfully = useSetRecoilState(contentLoadedSuccessfullyState)

    // Check if we have any content at all
    const hasAnyContent = trending.length > 0 ||
                         topRatedMovies.length > 0 ||
                         actionMovies.length > 0 ||
                         comedyMovies.length > 0 ||
                         horrorMovies.length > 0 ||
                         romanceMovies.length > 0 ||
                         documentaries.length > 0

    useEffect(() => {
        // Realistic loading with API health check
        const checkApiHealth = async () => {
            try {
                // Quick health check on trending endpoint (3 second timeout)
                const controller = new AbortController()
                const timeoutId = setTimeout(() => controller.abort(), 3000)

                const response = await fetch('/api/movies/trending', {
                    signal: controller.signal
                })

                clearTimeout(timeoutId)

                if (!response.ok) {
                    throw new Error(`API responded with ${response.status}`)
                }

                // Success - show content after brief loading
                setTimeout(() => {
                    setIsPageLoading(false)
                    setContentLoadedSuccessfully(true)
                    // Prefetch login page in background for instant access
                    if (typeof window !== 'undefined') {
                        import('next/router').then(({ default: Router }) => {
                            Router.prefetch('/login')
                        })
                    }
                }, 1500)

            } catch (error) {
                console.log('API health check failed:', error)
                // Fail fast - show error after 2 seconds max
                setTimeout(() => {
                    setIsPageLoading(false)
                    setContentLoadedSuccessfully(false)
                }, 2000)
            }
        }

        checkApiHealth()
    }, [setContentLoadedSuccessfully])

    // Show loading screen during initial page load
    if (isPageLoading) {
        return <NetflixLoader message="Loading NetTrailer..." />
    }

    // Show error screen if no content is available
    if (!hasAnyContent || hasDataError) {
        return <NetflixError />
    }
    return (
        <div
            className={`relative h-screen overflow-x-clip ${
                showModal && `overflow-y-hidden`
            } `}
        >
            <Head>
                <title>NetTrailer - Movie Discovery Platform</title>
                <meta name="description" content="Browse trending movies, watch trailers, and manage your watchlist with NetTrailer's secure streaming platform" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <link rel="icon" href="/favicon.ico" />
            </Head>
            <Header />
            <main id="content" className="relative min-h-screen">
                <div className="relative h-[95vh] w-full">
                    <Banner trending={trending} />
                </div>
                <section className="relative -mt-48 z-10 pb-52 space-y-8">
                    <Row title="Trending" content={trending}></Row>
                    <Row title="Top Rated Movies" content={topRatedMovies}></Row>
                    <Row title="Action Movies" content={actionMovies}></Row>
                    <Row title="Comedy Movies" content={comedyMovies}></Row>
                    <Row title="Horror Movies" content={horrorMovies}></Row>
                    <Row title="Romance Movies" content={romanceMovies}></Row>
                    <Row title="Documentaries" content={documentaries}></Row>
                </section>
                {showModal && <Modal />}
            </main>
        </div>
    )
}

export default Home

export const getServerSideProps = async () => {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    try {
        const [
            trending,
            topRatedMovies1,
            topRatedMovies2,
            actionMovies,
            comedyMovies,
            horrorMovies,
            romanceMovies,
            documentaries,
        ] = await Promise.all([
            fetch(`${baseUrl}${requests.fetchTrending}`).then((res) => res.json()),
            fetch(`${baseUrl}${requests.fetchTopRatedMovies1}`).then((res) => res.json()),
            fetch(`${baseUrl}${requests.fetchTopRatedMovies2}`).then((res) => res.json()),
            fetch(`${baseUrl}${requests.fetchActionMovies}`).then((res) => res.json()),
            fetch(`${baseUrl}${requests.fetchComedyMovies}`).then((res) => res.json()),
            fetch(`${baseUrl}${requests.fetchHorrorMovies}`).then((res) => res.json()),
            fetch(`${baseUrl}${requests.fetchRomanceMovies}`).then((res) => res.json()),
            fetch(`${baseUrl}${requests.fetchDocumentaries}`).then((res) => res.json()),
        ])

        // Proper Fisher-Yates shuffle algorithm (unbiased randomization)
        const randomizeArray = (arr: Content[]) => {
            const shuffled = [...arr] // Create copy to avoid mutating original
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
            }
            return shuffled
        }

        return {
            props: {
                trending: randomizeArray(trending.results || []),
                topRatedMovies: randomizeArray([
                    ...(topRatedMovies1.results || []),
                    ...(topRatedMovies2.results || []),
                ]),
                actionMovies: randomizeArray(actionMovies.results || []),
                comedyMovies: randomizeArray(comedyMovies.results || []),
                horrorMovies: randomizeArray(horrorMovies.results || []),
                romanceMovies: randomizeArray(romanceMovies.results || []),
                documentaries: randomizeArray(documentaries.results || []),
            },
        }
    } catch (error) {
        console.error('Failed to fetch movie data:', error)

        // Return empty data with error flag
        return {
            props: {
                trending: [],
                topRatedMovies: [],
                actionMovies: [],
                comedyMovies: [],
                horrorMovies: [],
                romanceMovies: [],
                documentaries: [],
                hasDataError: true,
            },
        }
    }
}

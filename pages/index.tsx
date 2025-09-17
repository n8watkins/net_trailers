import Header from '../components/Header'
import requests from '../utils/requests'
import { Content } from '../typings'
import Banner from '../components/Banner'
import Row from '../components/Row'
import useAuth from '../hooks/useAuth'
import Modal from '../components/Modal'
import { useState } from 'react'
import { useRecoilState, useRecoilValue } from 'recoil'
import { modalState } from '../atoms/modalAtom'
import Head from 'next/head'
interface Props {
    trending: Content[]
    topRatedMovies: Content[]
    actionMovies: Content[]
    comedyMovies: Content[]
    horrorMovies: Content[]
    romanceMovies: Content[]
    documentaries: Content[]
}
const Home = ({
    trending,
    topRatedMovies,
    actionMovies,
    comedyMovies,
    horrorMovies,
    romanceMovies,
    documentaries,
}: Props) => {
    const { loading, error, user } = useAuth()
    const showModal = useRecoilValue(modalState)
    return (
        <div
            className={`relative h-screen overflow-x-clip ${
                showModal && `overflow-y-hidden`
            } `}
        >
            <Head>
                <title>Netflix</title>
                <link rel="icon" href="/netflix.png" />
            </Head>
            <Header />
            <main id="content" className="relative min-h-screen">
                <Banner trending={trending} />
                <section className="relative -mt-20 z-10 pb-52 space-y-8">
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

        // Return empty data on error
        return {
            props: {
                trending: [],
                topRatedMovies: [],
                actionMovies: [],
                comedyMovies: [],
                horrorMovies: [],
                romanceMovies: [],
                documentaries: [],
            },
        }
    }
}

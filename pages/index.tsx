import Head from 'next/head'
import Header from '../components/Header'
import requests from '../utils/requests'
import { Movie } from '../typings'
import Banner from '../components/Banner'
import Row from '../components/Row'
import useAuth from '../hooks/useAuth'
import Modal from '../components/Modal'
import { useState } from 'react'
import { useRecoilState, useRecoilValue } from 'recoil'
import { modalState } from '../atoms/modalAtom'

interface Props {
    trending: Movie[]
    topRatedMovies: Movie[]
    actionMovies: Movie[]
    comedyMovies: Movie[]
    horrorMovies: Movie[]
    romanceMovies: Movie[]
    documentaries: Movie[]
    // topRatedTV: TV[]
    // actionTV: TV[]
    // comedyTV: TV[]
    // horrorTV: TV[]
}
const Home = ({
    trending,
    topRatedMovies,
    actionMovies,
    comedyMovies,
    horrorMovies,
    romanceMovies,
    documentaries,
}: // topRatedTV,
// actionTV,
// comedyTV,
// horrorTV,
Props) => {
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
                <link rel="icon" href="/netflix-icon.png" />
            </Head>
            <Header />
            <main id="content" className="absolute top-0 h-screen w-screen  ">
                <Banner trending={trending} />
                <section className="absolute top-[50em] pb-52  ">
                    <Row title="Top Rated Movies" movies={topRatedMovies}></Row>
                    <Row title="Action Movies" movies={actionMovies}></Row>
                    <Row title="Comedy Movies" movies={comedyMovies}></Row>
                    <Row title="Horror Movies" movies={horrorMovies}></Row>
                    <Row title="Romance Movies" movies={romanceMovies}></Row>
                    <Row title="Documentaries" movies={documentaries}></Row>
                    {/* <Row title="Top Rated Movies" tv={topRatedTV}></Row>
                    <Row title="Top Rated Movies" tv={actionTV}></Row>
                    <Row title="Top Rated Movies" tv={comedyTV}></Row>
                    <Row title="Top Rated Movies" tv={horrorTV}></Row> 
                    */}
                </section>
                {showModal && <Modal />}
            </main>
        </div>
    )
}

export default Home

export const getServerSideProps = async () => {
    const [
        trending,
        topRatedMovies1,
        topRatedMovies2,
        actionMovies,
        comedyMovies,
        horrorMovies,
        romanceMovies,
        documentaries,
        topRatedTV,
        actionTV,
        comedyTV,
        horrorTV,
    ] = await Promise.all([
        fetch(requests.fetchTrending).then((res) => res.json()),
        fetch(requests.fetchTopRatedMovies1).then((res) => res.json()),
        fetch(requests.fetchTopRatedMovies2).then((res) => res.json()),
        fetch(requests.fetchActionMovies).then((res) => res.json()),
        fetch(requests.fetchComedyMovies).then((res) => res.json()),
        fetch(requests.fetchHorrorMovies).then((res) => res.json()),
        fetch(requests.fetchRomanceMovies).then((res) => res.json()),
        fetch(requests.fetchDocumentaries).then((res) => res.json()),
        fetch(requests.fetchTopRatedTV).then((res) => res.json()),
        fetch(requests.fetchActionTV).then((res) => res.json()),
        fetch(requests.fetchComedyTV).then((res) => res.json()),
        fetch(requests.fetchHorrorTV).then((res) => res.json()),
    ])
    //randomize array function
    const randomizeArray = (arr: Movie[]) => {
        return arr.sort(() => Math.random() - 0.5)
    }

    return {
        props: {
            trending: randomizeArray(trending.results),
            topRatedMovies: randomizeArray([
                ...topRatedMovies1.results,
                ...topRatedMovies2.results,
            ]),
            actionMovies: randomizeArray(actionMovies.results),
            comedyMovies: randomizeArray(comedyMovies.results),
            horrorMovies: randomizeArray(horrorMovies.results),
            romanceMovies: randomizeArray(romanceMovies.results),
            documentaries: randomizeArray(documentaries.results),
            topRatedTV: randomizeArray(topRatedTV.results),
            actionTV: randomizeArray(actionTV.results),
            comedyTV: randomizeArray(comedyTV.results),
            horrorTV: randomizeArray(horrorTV.results),
        },
    }
}

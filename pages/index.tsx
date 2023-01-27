import Head from 'next/head'
import Header from '../components/Header'
import requests from '../utils/requests'
import { Movie, TV } from '../typings'
import Banner from '../components/Banner'
import Row from '../components/Row'

interface Props {
    trending: Movie[]
    topRatedMovies: Movie[]
    actionMovies: Movie[]
    comedyMovies: Movie[]
    horrorMovies: Movie[]
    romanceMovies: Movie[]
    documentaries: Movie[]
    topRatedTV: TV[]
    actionTV: TV[]
    comedyTV: TV[]
    horrorTV: TV[]
}

const Home = ({
    trending,
    topRatedMovies,
    actionMovies,
    comedyMovies,
    horrorMovies,
    romanceMovies,
    documentaries,
    topRatedTV,
    actionTV,
    comedyTV,
    horrorTV,
}: Props) => {
    return (
        //
        <div className="relative h-screen overflow-x-clip   ">
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
            </main>
        </div>
    )
}

export default Home

export const getServerSideProps = async () => {
    const [
        trending,
        topRatedMovies,
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
        fetch(requests.fetchTopRatedMovies).then((res) => res.json()),
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
    return {
        props: {
            trending: trending.results,
            topRatedMovies: topRatedMovies.results,
            actionMovies: actionMovies.results,
            comedyMovies: comedyMovies.results,
            horrorMovies: horrorMovies.results,
            romanceMovies: romanceMovies.results,
            documentaries: documentaries.results,
            topRatedTV: topRatedTV.results,
            actionTV: actionTV.results,
            comedyTV: comedyTV.results,
            horrorTV: horrorTV.results,
        },
    }
}

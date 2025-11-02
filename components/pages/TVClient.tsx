'use client'

import Header from '../layout/Header'
import Banner from '../layout/Banner'
import Row from '../content/Row'
import { HomeData } from '../../lib/serverData'
import { useAppStore } from '../../stores/appStore'

interface TVClientProps {
    data: HomeData
}

export default function TVClient({ data }: TVClientProps) {
    const { modal } = useAppStore()
    const showModal = modal.isOpen

    const { trending, topRated, genre1, genre2, genre3, genre4, documentaries } = data

    return (
        <div
            className={`relative min-h-screen overflow-x-clip ${showModal && `overflow-y-hidden`} `}
        >
            <Header />
            <main id="content" className="relative">
                <div className="relative h-screen w-full">
                    <Banner trending={trending} variant="compact" />
                </div>
                <section className="relative -mt-[55vh] z-10 pb-52 space-y-8">
                    {trending.length > 0 && (
                        <div className="pt-8 sm:pt-12 md:pt-16">
                            <Row title="Trending TV Shows" content={trending} />
                        </div>
                    )}
                    {topRated.length > 0 && <Row title="Top Rated TV Shows" content={topRated} />}
                    {genre1.length > 0 && (
                        <Row title="Action & Adventure TV Shows" content={genre1} />
                    )}
                    {genre2.length > 0 && <Row title="Comedy TV Shows" content={genre2} />}
                    {genre3.length > 0 && (
                        <Row title="Sci-Fi & Fantasy TV Shows" content={genre3} />
                    )}
                    {genre4.length > 0 && <Row title="Animation TV Shows" content={genre4} />}
                    {documentaries.length > 0 && (
                        <Row title="Documentary TV Shows" content={documentaries} />
                    )}
                </section>
            </main>
        </div>
    )
}

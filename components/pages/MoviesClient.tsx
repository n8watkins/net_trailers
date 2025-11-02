'use client'

import Header from '../layout/Header'
import Banner from '../layout/Banner'
import Row from '../content/Row'
import { HomeData } from '../../lib/serverData'
import { useAppStore } from '../../stores/appStore'
import { getChildSafetyModeClient } from '../../lib/childSafetyCookieClient'

interface MoviesClientProps {
    data: HomeData
}

export default function MoviesClient({ data }: MoviesClientProps) {
    const { modal } = useAppStore()
    const showModal = modal.isOpen
    const childSafetyEnabled = getChildSafetyModeClient()

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
                            <Row title="Trending Movies" content={trending} />
                        </div>
                    )}
                    {topRated.length > 0 && <Row title="Top Rated Movies" content={topRated} />}
                    {genre1.length > 0 && (
                        <Row
                            title={childSafetyEnabled ? 'Animated Movies' : 'Action Movies'}
                            content={genre1}
                        />
                    )}
                    {genre2.length > 0 && (
                        <Row
                            title={childSafetyEnabled ? 'Family Movies' : 'Comedy Movies'}
                            content={genre2}
                        />
                    )}
                    {genre3.length > 0 && (
                        <Row
                            title={childSafetyEnabled ? 'Adventure Movies' : 'Horror Movies'}
                            content={genre3}
                        />
                    )}
                    {genre4.length > 0 && (
                        <Row
                            title={childSafetyEnabled ? 'Fantasy Movies' : 'Romance Movies'}
                            content={genre4}
                        />
                    )}
                    {documentaries.length > 0 && (
                        <Row title="Documentaries" content={documentaries} />
                    )}
                </section>
            </main>
        </div>
    )
}

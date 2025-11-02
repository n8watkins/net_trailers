'use client'

import Header from '../layout/Header'
import Banner from '../layout/Banner'
import Row from '../content/Row'
import { HomeData } from '../../lib/serverData'
import { useAppStore } from '../../stores/appStore'
import { getChildSafetyModeClient } from '../../lib/childSafetyCookieClient'

interface HomeClientProps {
    data: HomeData
    filter?: string
}

export default function HomeClient({ data, filter }: HomeClientProps) {
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
                    <Banner trending={trending} />
                </div>
                <section className="relative z-10 pb-52 space-y-8">
                    {trending.length > 0 && (
                        <Row
                            title={
                                filter === 'tv'
                                    ? 'Trending TV Shows'
                                    : filter === 'movies'
                                      ? 'Trending Movies'
                                      : 'Trending'
                            }
                            content={trending}
                        />
                    )}
                    {topRated.length > 0 && (
                        <Row
                            title={
                                filter === 'tv'
                                    ? 'Top Rated TV Shows'
                                    : filter === 'movies'
                                      ? 'Top Rated Movies'
                                      : 'Top Rated'
                            }
                            content={topRated}
                        />
                    )}
                    {genre1.length > 0 && (
                        <Row
                            title={
                                filter === 'tv'
                                    ? 'Action & Adventure TV Shows'
                                    : filter === 'movies'
                                      ? childSafetyEnabled
                                          ? 'Animated Movies'
                                          : 'Action Movies'
                                      : childSafetyEnabled
                                        ? 'Animation'
                                        : 'Action & Adventure'
                            }
                            content={genre1}
                        />
                    )}
                    {genre2.length > 0 && (
                        <Row
                            title={
                                filter === 'tv'
                                    ? 'Comedy TV Shows'
                                    : filter === 'movies'
                                      ? childSafetyEnabled
                                          ? 'Family Movies'
                                          : 'Comedy Movies'
                                      : childSafetyEnabled
                                        ? 'Family & Comedy'
                                        : 'Comedy'
                            }
                            content={genre2}
                        />
                    )}
                    {genre3.length > 0 && (
                        <Row
                            title={
                                filter === 'tv'
                                    ? 'Sci-Fi & Fantasy TV Shows'
                                    : filter === 'movies'
                                      ? childSafetyEnabled
                                          ? 'Adventure Movies'
                                          : 'Horror Movies'
                                      : childSafetyEnabled
                                        ? 'Adventure'
                                        : 'Horror & Sci-Fi'
                            }
                            content={genre3}
                        />
                    )}
                    {genre4.length > 0 && (
                        <Row
                            title={
                                filter === 'tv'
                                    ? 'Animation TV Shows'
                                    : filter === 'movies'
                                      ? childSafetyEnabled
                                          ? 'Fantasy Movies'
                                          : 'Romance Movies'
                                      : childSafetyEnabled
                                        ? 'Fantasy'
                                        : 'Animation'
                            }
                            content={genre4}
                        />
                    )}
                    {documentaries.length > 0 && (
                        <Row
                            title={
                                filter === 'tv'
                                    ? 'Documentary TV Shows'
                                    : filter === 'movies'
                                      ? 'Documentary Movies'
                                      : 'Documentaries'
                            }
                            content={documentaries}
                        />
                    )}
                </section>
            </main>
        </div>
    )
}

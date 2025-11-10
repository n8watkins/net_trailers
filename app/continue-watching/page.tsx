/**
 * Continue Watching Page
 *
 * Shows content the user has started watching
 */

'use client'

import { useEffect } from 'react'
import Header from '../../components/layout/Header'
import SubHeader from '../../components/common/SubHeader'
import { PlayIcon } from '@heroicons/react/24/outline'
import { useAppStore } from '../../stores/appStore'

export default function ContinueWatchingPage() {
    const { modal } = useAppStore()
    const showModal = modal.isOpen

    useEffect(() => {
        document.title = 'Continue Watching - NetTrailers'
    }, [])

    return (
        <div
            className={`relative min-h-screen overflow-x-clip ${showModal && `overflow-y-hidden`} bg-gradient-to-b`}
        >
            <Header />
            <SubHeader />

            <main className="relative pb-24 px-4 sm:px-6 lg:px-8">
                <div className="max-w-[1600px] mx-auto flex flex-col space-y-8 py-16 md:space-y-12 md:py-20 lg:py-24">
                    <div className="space-y-6">
                        <div className="flex items-center space-x-3 pt-8 sm:pt-10 md:pt-12">
                            <PlayIcon className="w-8 h-8 text-green-400" />
                            <h1 className="text-3xl font-bold text-white md:text-4xl lg:text-5xl">
                                Continue Watching
                            </h1>
                        </div>

                        <p className="text-gray-400 max-w-2xl">Pick up where you left off.</p>

                        <div className="text-center py-20">
                            <div className="text-6xl mb-4">▶️</div>
                            <h2 className="text-2xl font-semibold text-white mb-2">
                                No Content in Progress
                            </h2>
                            <p className="text-gray-400">
                                Start watching movies and TV shows to see them here.
                            </p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}

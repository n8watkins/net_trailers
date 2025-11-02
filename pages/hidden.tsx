import { useState } from 'react'
import { NextPage } from 'next'
import Head from 'next/head'
import Header from '../components/Header'
import useUserData from '../hooks/useUserData'
import { EyeSlashIcon, MagnifyingGlassIcon, ArrowDownTrayIcon } from '@heroicons/react/24/solid'
import { isMovie, isTVShow } from '../typings'
import { getTitle } from '../typings'
import ContentCard from '../components/ContentCard'
import { useAppStore } from '../stores/appStore'
import { exportUserDataToCSV } from '../utils/csvExport'
import { GuestModeNotification } from '../components/GuestModeNotification'
import { useAuthStatus } from '../hooks/useAuthStatus'

interface Props {
    onOpenAboutModal?: () => void
    onOpenTutorial?: () => void
    onOpenKeyboardShortcuts?: () => void
}

const Hidden: NextPage<Props> = ({ onOpenAboutModal, onOpenTutorial, onOpenKeyboardShortcuts }) => {
    const userData = useUserData()
    const { hiddenMovies } = userData
    const { isGuest, isInitialized } = useAuthStatus()
    const userSession = userData.sessionType === 'authenticated' ? userData.userSession : null

    const [searchQuery, setSearchQuery] = useState('')
    const { modal, openModal: _openModal } = useAppStore()
    const showModal = modal.isOpen

    // Get hidden content directly from hiddenMovies
    const hiddenContent = hiddenMovies.map((item) => ({
        contentId: item.id,
        rating: 'hidden',
        timestamp: Date.now(),
        content: item,
    }))

    // Apply search filter
    const filteredContent = searchQuery.trim()
        ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
          hiddenContent.filter((item: any) => {
              if (!item.content) return false
              const title = getTitle(item.content).toLowerCase()
              const query = searchQuery.toLowerCase()
              return title.includes(query)
          })
        : hiddenContent

    const handleExportCSV = () => {
        if (userSession?.preferences) {
            exportUserDataToCSV(userSession.preferences)
        }
    }

    // Separate content by media type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const moviesContent = filteredContent.filter((item: any) => {
        return item.content && isMovie(item.content)
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tvShowsContent = filteredContent.filter((item: any) => {
        return item.content && isTVShow(item.content)
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const renderContentGrid = (items: any[], title: string) => (
        <div>
            <h3 className="text-2xl font-bold text-white mb-6">{title}</h3>
            <div className="flex flex-wrap gap-x-4 gap-y-8 sm:gap-x-6 sm:gap-y-10 md:gap-x-8 md:gap-y-12">
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                {items.map((item: any) => (
                    <div key={item.contentId} className="relative mb-12 sm:mb-16 md:mb-20">
                        <ContentCard
                            content={item.content}
                            className="opacity-75 hover:opacity-100 transition-opacity duration-200"
                        />
                    </div>
                ))}
            </div>
        </div>
    )

    return (
        <div
            className={`relative min-h-screen overflow-x-clip ${showModal && `overflow-y-hidden`} bg-gradient-to-b`}
        >
            <Head>
                <title>Hidden Content - NetTrailer</title>
                <meta
                    name="description"
                    content="View all content you've hidden from recommendations"
                />
            </Head>

            <Header
                onOpenAboutModal={onOpenAboutModal}
                onOpenTutorial={onOpenTutorial}
                onOpenKeyboardShortcuts={onOpenKeyboardShortcuts}
            />

            <main className="relative pl-4 pb-24 lg:space-y-24 lg:pl-16">
                <div className="flex flex-col space-y-8 py-16 md:space-y-12 md:py-20 lg:py-24">
                    {/* Header Section */}
                    <div className="space-y-6">
                        <div className="flex items-center space-x-3 pt-8 sm:pt-10 md:pt-12">
                            <EyeSlashIcon className="w-8 h-8 text-gray-400" />
                            <h1 className="text-3xl font-bold text-white md:text-4xl lg:text-5xl">
                                Hidden Content
                            </h1>
                        </div>

                        <p className="text-gray-400 max-w-2xl">
                            Curate your recommendations! Hide content you&apos;re not interested in.
                        </p>

                        {isInitialized && isGuest && (
                            <GuestModeNotification onOpenTutorial={onOpenTutorial} align="left" />
                        )}

                        {/* Action Buttons */}
                        {hiddenContent.length > 0 && (
                            <div className="flex items-center space-x-4 py-3 mb-4 border-b border-gray-700/30">
                                {/* Stats */}
                                <div className="text-lg font-semibold text-white">
                                    {hiddenContent.length} items hidden
                                </div>

                                {/* Export Button */}
                                <button
                                    onClick={handleExportCSV}
                                    className="flex items-center space-x-2 px-5 py-2.5 bg-gray-800/50 hover:bg-white/10 text-white border border-gray-600 hover:border-gray-400 rounded-full text-sm font-medium transition-all duration-200"
                                >
                                    <ArrowDownTrayIcon className="w-4 h-4" />
                                    <span>Export to CSV</span>
                                </button>
                            </div>
                        )}

                        {/* Search Bar */}
                        <div className="max-w-md">
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Search hidden content..."
                                    className="w-full pl-10 pr-4 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent transition-all duration-200"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Content Sections */}
                    {filteredContent.length === 0 ? (
                        <div className="text-center py-16">
                            <div className="text-6xl mb-4">🙈</div>
                            <h2 className="text-2xl font-semibold text-white mb-2">
                                {hiddenContent.length === 0
                                    ? 'No hidden content yet'
                                    : 'No matching content found'}
                            </h2>
                            <p className="text-gray-400">
                                {hiddenContent.length === 0
                                    ? 'Content you mark as &quot;Not For Me&quot; will appear here.'
                                    : 'Try adjusting your search terms.'}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-12">
                            {moviesContent.length > 0 &&
                                renderContentGrid(moviesContent, 'Hidden Movies')}
                            {tvShowsContent.length > 0 &&
                                renderContentGrid(tvShowsContent, 'Hidden TV Shows')}
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}

export default Hidden

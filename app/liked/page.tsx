'use client'

import { useState } from 'react'
import SubPageLayout from '../../components/layout/SubPageLayout'
import useUserData from '../../hooks/useUserData'
import { CheckCircleIcon, MagnifyingGlassIcon, ArrowDownTrayIcon } from '@heroicons/react/24/solid'
import { isMovie, isTVShow } from '../../typings'
import { getTitle } from '../../typings'
import ContentCard from '../../components/common/ContentCard'
import { exportUserDataToCSV } from '../../utils/csvExport'
import { GuestModeNotification } from '../../components/auth/GuestModeNotification'
import { useAuthStatus } from '../../hooks/useAuthStatus'
import NetflixLoader from '../../components/common/NetflixLoader'

const Liked = () => {
    const userData = useUserData()
    const { likedMovies } = userData
    const { isGuest, isInitialized, isLoading } = useAuthStatus()
    const userSession = userData.sessionType === 'authenticated' ? userData.userSession : null

    const [searchQuery, setSearchQuery] = useState('')

    // Get liked content directly from likedMovies
    const likedContent = likedMovies.map((item) => ({
        contentId: item.id,
        rating: 'liked',
        timestamp: Date.now(),
        content: item,
    }))

    // Apply search filter
    const filteredContent = searchQuery.trim()
        ? likedContent.filter(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (item: any) => {
                  if (!item.content) return false
                  const title = getTitle(item.content).toLowerCase()
                  const query = searchQuery.toLowerCase()
                  return title.includes(query)
              }
          )
        : likedContent

    const handleExportCSV = () => {
        if (userSession?.preferences) {
            exportUserDataToCSV(userSession.preferences)
        }
    }

    // Separate content by media type
    const moviesContent = filteredContent.filter(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (item: any) => {
            return item.content && isMovie(item.content)
        }
    )

    const tvShowsContent = filteredContent.filter(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (item: any) => {
            return item.content && isTVShow(item.content)
        }
    )

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const renderContentGrid = (items: any[], title: string) => (
        <div>
            <h3 className="text-2xl font-bold text-white mb-6">{title}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {items.map(
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (item: any) => (
                        <div key={item.contentId}>
                            <ContentCard content={item.content} />
                        </div>
                    )
                )}
            </div>
        </div>
    )

    // Show loading state while user data is initializing
    if (isLoading) {
        return <NetflixLoader />
    }

    const headerActions = (
        <div className="space-y-4">
            {isInitialized && isGuest && <GuestModeNotification align="left" />}

            {/* Action Buttons */}
            {likedContent.length > 0 && (
                <div className="flex items-center space-x-4 py-3 mb-4 border-b border-gray-700/30">
                    {/* Stats */}
                    <div className="text-lg font-semibold text-white">
                        {likedContent.length} items liked
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
            <div className="relative w-full sm:w-64">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                    type="text"
                    placeholder="Search liked content..."
                    className="w-full pl-10 pr-4 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
        </div>
    )

    return (
        <SubPageLayout
            title="Liked Content"
            icon={<CheckCircleIcon />}
            iconColor="text-green-400"
            description="Movies and TV shows you've rated positively."
            headerActions={headerActions}
        >
            {/* Content Sections */}
            {filteredContent.length === 0 ? (
                <div className="text-center py-16">
                    <div className="text-6xl mb-4">💚</div>
                    <h2 className="text-2xl font-semibold text-white mb-2">
                        {likedContent.length === 0
                            ? 'No liked content yet'
                            : 'No matching content found'}
                    </h2>
                    <p className="text-gray-400">
                        {likedContent.length === 0
                            ? 'Start rating movies and TV shows with thumbs up to see them here!'
                            : 'Try adjusting your search terms.'}
                    </p>
                </div>
            ) : (
                <div className="space-y-12">
                    {moviesContent.length > 0 && renderContentGrid(moviesContent, 'Liked Movies')}
                    {tvShowsContent.length > 0 &&
                        renderContentGrid(tvShowsContent, 'Liked TV Shows')}
                </div>
            )}
        </SubPageLayout>
    )
}

export default Liked

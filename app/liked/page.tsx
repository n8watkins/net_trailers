'use client'

import { useState } from 'react'
import SubPageLayout from '../../components/layout/SubPageLayout'
import useUserData from '../../hooks/useUserData'
import { CheckCircleIcon, ArrowDownTrayIcon } from '@heroicons/react/24/solid'
import { isMovie, isTVShow } from '../../typings'
import { getTitle } from '../../typings'
import ContentCard from '../../components/common/ContentCard'
import EmptyState from '../../components/common/EmptyState'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import SearchBar from '../../components/common/SearchBar'
import StatsBar from '../../components/common/StatsBar'
import { exportUserDataToCSV } from '../../utils/csvExport'
import { GuestModeNotification } from '../../components/auth/GuestModeNotification'
import { useAuthStatus } from '../../hooks/useAuthStatus'

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
        return <LoadingSpinner color="green" />
    }

    const headerActions = (
        <div className="space-y-4">
            {isInitialized && isGuest && <GuestModeNotification align="left" />}

            {/* Stats and Actions */}
            <StatsBar
                count={likedContent.length}
                countLabel="items liked"
                actions={
                    <button
                        onClick={handleExportCSV}
                        className="flex items-center space-x-2 px-5 py-2.5 bg-gray-800/50 hover:bg-white/10 text-white border border-gray-600 hover:border-gray-400 rounded-full text-sm font-medium transition-all duration-200"
                    >
                        <ArrowDownTrayIcon className="w-4 h-4" />
                        <span>Export to CSV</span>
                    </button>
                }
            />

            {/* Search Bar */}
            <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search liked content..."
                focusColor="green"
            />
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
                <EmptyState
                    emoji="💚"
                    title={
                        likedContent.length === 0
                            ? 'No liked content yet'
                            : 'No matching content found'
                    }
                    description={
                        likedContent.length === 0
                            ? 'Start rating movies and TV shows with thumbs up to see them here!'
                            : 'Try adjusting your search terms.'
                    }
                />
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

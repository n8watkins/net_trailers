'use client'

import { useState } from 'react'
import SubPageLayout from '../../components/layout/SubPageLayout'
import useUserData from '../../hooks/useUserData'
import { EyeSlashIcon, MagnifyingGlassIcon, ArrowDownTrayIcon } from '@heroicons/react/24/solid'
import { isMovie, isTVShow } from '../../typings'
import { getTitle } from '../../typings'
import ContentCard from '../../components/common/ContentCard'
import { exportUserDataToCSV } from '../../utils/csvExport'
import { GuestModeNotification } from '../../components/auth/GuestModeNotification'
import { useAuthStatus } from '../../hooks/useAuthStatus'

const Hidden = () => {
    const userData = useUserData()
    const { hiddenMovies } = userData
    const { isGuest, isInitialized } = useAuthStatus()
    const userSession = userData.sessionType === 'authenticated' ? userData.userSession : null

    const [searchQuery, setSearchQuery] = useState('')

    // Get hidden content directly from hiddenMovies
    const hiddenContent = hiddenMovies.map((item) => ({
        contentId: item.id,
        rating: 'hidden',
        timestamp: Date.now(),
        content: item,
    }))

    // Apply search filter
    const filteredContent = searchQuery.trim()
        ? hiddenContent.filter(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (item: any) => {
                  if (!item.content) return false
                  const title = getTitle(item.content).toLowerCase()
                  const query = searchQuery.toLowerCase()
                  return title.includes(query)
              }
          )
        : hiddenContent

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
                            <ContentCard
                                content={item.content}
                                className="opacity-75 hover:opacity-100 transition-opacity duration-200"
                            />
                        </div>
                    )
                )}
            </div>
        </div>
    )

    const headerActions = (
        <div className="space-y-4">
            {isInitialized && isGuest && <GuestModeNotification align="left" />}

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
            <div className="relative w-full sm:w-64">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                    type="text"
                    placeholder="Search hidden content..."
                    className="w-full pl-10 pr-4 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent transition-all duration-200"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
        </div>
    )

    return (
        <SubPageLayout
            title="Hidden Content"
            icon={<EyeSlashIcon />}
            iconColor="text-gray-400"
            description="Curate your recommendations! Hide content you're not interested in."
            headerActions={headerActions}
        >
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
                    {moviesContent.length > 0 && renderContentGrid(moviesContent, 'Hidden Movies')}
                    {tvShowsContent.length > 0 &&
                        renderContentGrid(tvShowsContent, 'Hidden TV Shows')}
                </div>
            )}
        </SubPageLayout>
    )
}

export default Hidden

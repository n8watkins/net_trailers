'use client'

import { useState, useRef, useEffect } from 'react'
import SubPageLayout from '../../components/layout/SubPageLayout'
import useUserData from '../../hooks/useUserData'
import {
    BookmarkIcon,
    ArrowDownTrayIcon,
    Cog6ToothIcon,
    ChevronDownIcon,
} from '@heroicons/react/24/solid'
import { isMovie, isTVShow } from '../../typings'
import { getTitle } from '../../typings'
import ContentCard from '../../components/common/ContentCard'
import EmptyState from '../../components/common/EmptyState'
import NetflixLoader from '../../components/common/NetflixLoader'
import SearchBar from '../../components/common/SearchBar'
import StatsBar from '../../components/common/StatsBar'
import { exportUserDataToCSV } from '../../utils/csvExport'
import { GuestModeNotification } from '../../components/auth/GuestModeNotification'
import { useAuthStatus } from '../../hooks/useAuthStatus'

const WatchLater = () => {
    const userData = useUserData()
    const { defaultWatchlist } = userData
    const { isGuest, isInitialized, isLoading } = useAuthStatus()
    const userSession = userData.sessionType === 'authenticated' ? userData.userSession : null

    const [searchQuery, setSearchQuery] = useState('')
    const [showManageDropdown, setShowManageDropdown] = useState(false)
    const [mediaFilter, setMediaFilter] = useState<'all' | 'movies' | 'tv'>('all')
    const manageDropdownRef = useRef<HTMLDivElement>(null)

    // Get watch later content directly from defaultWatchlist
    const watchLaterContent = defaultWatchlist.map((item) => ({
        contentId: item.id,
        rating: 'watch-later',
        timestamp: Date.now(),
        content: item,
    }))

    // Apply search and media type filters
    const filteredContent = watchLaterContent.filter(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (item: any) => {
            if (!item.content) return false

            // Apply media type filter
            if (mediaFilter === 'movies' && !isMovie(item.content)) return false
            if (mediaFilter === 'tv' && !isTVShow(item.content)) return false

            // Apply search filter
            if (searchQuery.trim()) {
                const title = getTitle(item.content).toLowerCase()
                const query = searchQuery.toLowerCase()
                return title.includes(query)
            }

            return true
        }
    )

    const handleExportCSV = () => {
        if (userSession?.preferences) {
            exportUserDataToCSV(userSession.preferences)
        }
        setShowManageDropdown(false)
    }

    // Handle click outside to close dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                manageDropdownRef.current &&
                !manageDropdownRef.current.contains(event.target as Node)
            ) {
                setShowManageDropdown(false)
            }
        }

        if (showManageDropdown) {
            document.addEventListener('mousedown', handleClickOutside)
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [showManageDropdown])

    const titleActions = (
        <div className="relative" ref={manageDropdownRef}>
            <button
                onClick={() => setShowManageDropdown(!showManageDropdown)}
                className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 text-gray-400 hover:text-white transition-all duration-200"
            >
                <Cog6ToothIcon className="w-5 h-5" />
                <span className="font-medium">Manage</span>
                <ChevronDownIcon
                    className={`w-4 h-4 transition-transform ${
                        showManageDropdown ? 'rotate-180' : ''
                    }`}
                />
            </button>

            {/* Dropdown Menu */}
            {showManageDropdown && (
                <div className="absolute top-full mt-2 right-0 bg-[#1a1a1a] border border-gray-700 rounded-lg shadow-xl z-50 min-w-[200px] overflow-hidden">
                    <button
                        onClick={handleExportCSV}
                        className="w-full flex items-center space-x-3 px-4 py-3 text-white hover:bg-gray-800 transition-colors text-left"
                    >
                        <ArrowDownTrayIcon className="w-5 h-5 text-gray-400" />
                        <span>Export to CSV</span>
                    </button>
                </div>
            )}
        </div>
    )

    const headerActions = !isLoading ? (
        <div className="space-y-6">
            {isInitialized && isGuest && <GuestModeNotification align="left" />}

            {/* Stats */}
            {watchLaterContent.length > 0 && (
                <StatsBar
                    content={watchLaterContent}
                    totalLabel="Total Items"
                    variant="amber"
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    mediaFilter={mediaFilter}
                    onMediaFilterChange={setMediaFilter}
                    showFilters
                />
            )}
        </div>
    ) : undefined

    return (
        <SubPageLayout
            title="Watch Later"
            icon={<BookmarkIcon />}
            iconColor="text-amber-400"
            description="Your saved content to watch later"
            titleActions={titleActions}
            headerActions={headerActions}
        >
            {/* Content Sections */}
            {isLoading ? (
                <NetflixLoader message="Loading your watch later list..." inline />
            ) : filteredContent.length === 0 ? (
                <EmptyState
                    emoji="🔖"
                    title="No items in watch later yet"
                    description="Start adding movies and TV shows to watch later!"
                />
            ) : (
                <div className="space-y-12">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 md:gap-5 lg:gap-6 xl:gap-8">
                        {filteredContent.map(
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            (item: any) => (
                                <div key={item.contentId}>
                                    <ContentCard content={item.content} />
                                </div>
                            )
                        )}
                    </div>
                </div>
            )}
        </SubPageLayout>
    )
}

export default WatchLater

'use client'

import { useState, useRef, useEffect } from 'react'
import SubPageLayout from '../../components/layout/SubPageLayout'
import useUserData from '../../hooks/useUserData'
import {
    CheckCircleIcon,
    ArrowDownTrayIcon,
    Cog6ToothIcon,
    ChevronDownIcon,
} from '@heroicons/react/24/solid'
import { isMovie, isTVShow } from '../../typings'
import { getTitle } from '../../typings'
import ContentCard from '../../components/common/ContentCard'
import ContentGridSpacer from '../../components/common/ContentGridSpacer'
import EmptyState from '../../components/common/EmptyState'
import NetflixLoader from '../../components/common/NetflixLoader'
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
    const [showManageDropdown, setShowManageDropdown] = useState(false)
    const [mediaFilter, setMediaFilter] = useState<'all' | 'movies' | 'tv'>('all')
    const manageDropdownRef = useRef<HTMLDivElement>(null)

    // Get liked content directly from likedMovies
    const likedContent = likedMovies.map((item) => ({
        contentId: item.id,
        rating: 'liked',
        timestamp: Date.now(),
        content: item,
    }))

    // Calculate counts by media type
    const movieCount = likedContent.filter((item) => item.content && isMovie(item.content)).length
    const tvCount = likedContent.filter((item) => item.content && isTVShow(item.content)).length

    // Apply search and media type filters
    const filteredContent = likedContent.filter(
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
                type="button"
                onClick={() => setShowManageDropdown(!showManageDropdown)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-white transition-colors cursor-pointer"
            >
                <Cog6ToothIcon className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium">Manage</span>
                <ChevronDownIcon
                    className={`w-4 h-4 flex-shrink-0 transition-transform ${
                        showManageDropdown ? 'rotate-180' : ''
                    }`}
                />
            </button>

            {/* Dropdown Menu */}
            {showManageDropdown && (
                <div className="absolute top-full mt-2 right-0 bg-[#1a1a1a] border border-gray-700 rounded-lg shadow-xl z-50 min-w-[200px] overflow-hidden">
                    <button
                        type="button"
                        onClick={handleExportCSV}
                        className="w-full flex items-center gap-3 px-4 py-3 text-white hover:bg-gray-800 transition-colors"
                    >
                        <ArrowDownTrayIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        <span>Export to CSV</span>
                    </button>
                </div>
            )}
        </div>
    )

    const headerActions = !isLoading ? (
        <div className="space-y-4">
            {isInitialized && isGuest && <GuestModeNotification align="left" />}

            {/* Stats */}
            <StatsBar count={likedContent.length} countLabel="items liked" />

            {/* Media Type Filter Pills */}
            <div className="flex flex-wrap gap-2">
                {[
                    { value: 'all', label: 'All', count: likedContent.length },
                    { value: 'movies', label: 'Movies', count: movieCount },
                    { value: 'tv', label: 'TV Shows', count: tvCount },
                ].map((option) => (
                    <button
                        key={option.value}
                        onClick={() => setMediaFilter(option.value as 'all' | 'movies' | 'tv')}
                        className={`rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${
                            mediaFilter === option.value
                                ? 'bg-green-600 text-white shadow-lg scale-105'
                                : 'bg-gray-800/80 text-gray-300 hover:bg-gray-700/80 hover:scale-105'
                        }`}
                    >
                        {option.label}
                        {option.count > 0 && ` (${option.count})`}
                    </button>
                ))}
            </div>

            {/* Search Bar */}
            <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search liked content..."
                focusColor="green"
                voiceInput
            />
        </div>
    ) : undefined

    return (
        <SubPageLayout
            title="Liked Content"
            icon={<CheckCircleIcon />}
            iconColor="text-green-400"
            description="Movies and TV shows you've rated positively."
            titleActions={titleActions}
            headerActions={headerActions}
        >
            {/* Content Sections */}
            {isLoading ? (
                <NetflixLoader message="Loading your liked content..." inline />
            ) : filteredContent.length === 0 ? (
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
                <div className="flex flex-wrap justify-between gap-x-6 sm:gap-x-8 md:gap-x-10 lg:gap-x-12 gap-y-3 sm:gap-y-4 md:gap-y-5 [&>*]:flex-none">
                    {filteredContent.map(
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        (item: any) => (
                            <div key={item.contentId}>
                                <ContentCard content={item.content} />
                            </div>
                        )
                    )}
                    <ContentGridSpacer />
                </div>
            )}
        </SubPageLayout>
    )
}

export default Liked

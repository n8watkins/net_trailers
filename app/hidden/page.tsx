'use client'

import { useState, useRef, useEffect } from 'react'
import SubPageLayout from '../../components/layout/SubPageLayout'
import useUserData from '../../hooks/useUserData'
import {
    EyeSlashIcon,
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

const Hidden = () => {
    const userData = useUserData()
    const { hiddenMovies } = userData
    const { isGuest, isInitialized, isLoading } = useAuthStatus()
    const userSession = userData.sessionType === 'authenticated' ? userData.userSession : null

    const [searchQuery, setSearchQuery] = useState('')
    const [showManageDropdown, setShowManageDropdown] = useState(false)
    const [mediaFilter, setMediaFilter] = useState<'all' | 'movies' | 'tv'>('all')
    const manageDropdownRef = useRef<HTMLDivElement>(null)

    // Get hidden content directly from hiddenMovies
    const hiddenContent = hiddenMovies.map((item) => ({
        contentId: item.id,
        rating: 'hidden',
        timestamp: Date.now(),
        content: item,
    }))

    // Apply search and media type filters
    const filteredContent = hiddenContent.filter(
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
            <StatsBar count={hiddenContent.length} countLabel="items hidden" />

            {/* Media Type Filter Pills */}
            <div className="flex flex-wrap gap-2">
                {[
                    { value: 'all', label: 'All' },
                    { value: 'movies', label: 'Movies' },
                    { value: 'tv', label: 'TV Shows' },
                ].map((option) => (
                    <button
                        key={option.value}
                        onClick={() => setMediaFilter(option.value as 'all' | 'movies' | 'tv')}
                        className={`rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${
                            mediaFilter === option.value
                                ? 'bg-gray-600 text-white shadow-lg scale-105'
                                : 'bg-gray-800/80 text-gray-300 hover:bg-gray-700/80 hover:scale-105'
                        }`}
                    >
                        {option.label}
                    </button>
                ))}
            </div>

            {/* Search Bar */}
            <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search hidden content..."
                focusColor="gray"
                voiceInput
            />
        </div>
    ) : undefined

    return (
        <SubPageLayout
            title="Hidden Content"
            icon={<EyeSlashIcon />}
            iconColor="text-gray-400"
            description="Curate your recommendations! Hide content you're not interested in."
            titleActions={titleActions}
            headerActions={headerActions}
        >
            {/* Content Sections */}
            {isLoading ? (
                <NetflixLoader message="Loading hidden content..." inline />
            ) : filteredContent.length === 0 ? (
                <EmptyState
                    emoji="🙈"
                    title={
                        hiddenContent.length === 0
                            ? 'No hidden content yet'
                            : 'No matching content found'
                    }
                    description={
                        hiddenContent.length === 0
                            ? 'Content you mark as "Not For Me" will appear here.'
                            : 'Try adjusting your search terms.'
                    }
                />
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 md:gap-5 lg:gap-6 xl:gap-8">
                    {filteredContent.map(
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
            )}
        </SubPageLayout>
    )
}

export default Hidden

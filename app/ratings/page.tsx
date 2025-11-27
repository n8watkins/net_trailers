'use client'

import React, { useState, useMemo, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAuthStore } from '../../stores/authStore'
import { useGuestStore } from '../../stores/guestStore'
import { useSessionStore } from '../../stores/sessionStore'
import { useToast } from '../../hooks/useToast'
import { RatedContent } from '../../types/shared'
import SubPageLayout from '../../components/layout/SubPageLayout'
import ContentCard from '../../components/common/ContentCard'
import ContentGridSpacer from '../../components/common/ContentGridSpacer'
import {
    HandThumbDownIcon,
    TrashIcon,
    MagnifyingGlassIcon,
    SwatchIcon,
    FilmIcon,
} from '@heroicons/react/24/solid'
import { XMarkIcon, HandThumbUpIcon, StarIcon } from '@heroicons/react/24/outline'
import NetflixLoader from '../../components/common/NetflixLoader'
import GenrePreferenceModal from '../../components/recommendations/GenrePreferenceModal'
import TitlePreferenceModal from '../../components/recommendations/TitlePreferenceModal'

type RatingValue = 'like' | 'dislike'
type FilterValue = RatingValue

// Wrapper component to handle Suspense for useSearchParams
export default function RatingsPage() {
    return (
        <Suspense fallback={<NetflixLoader message="Loading ratings..." />}>
            <RatingsPageContent />
        </Suspense>
    )
}

function RatingsPageContent() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const { showSuccess, showError } = useToast()

    // Get session type
    const sessionType = useSessionStore((state) => state.sessionType)
    const isGuest = sessionType === 'guest'

    // Get ratings from stores (new myRatings system)
    const authMyRatings = useAuthStore((state) => state.myRatings)
    const guestMyRatings = useGuestStore((state) => state.myRatings)
    const myRatings = isGuest ? guestMyRatings : authMyRatings

    const authUpdatePreferences = useAuthStore((state) => state.updatePreferences)
    const guestUpdatePreferences = useGuestStore((state) => state.updatePreferences)

    // Get genre and content preferences for quizzes
    const authGenrePreferences = useAuthStore((state) => state.genrePreferences)
    const guestGenrePreferences = useGuestStore((state) => state.genrePreferences)
    const genrePreferences = isGuest ? guestGenrePreferences : authGenrePreferences

    const authVotedContent = useAuthStore((state) => state.votedContent)
    const guestVotedContent = useGuestStore((state) => state.votedContent)
    const votedContent = isGuest ? guestVotedContent : authVotedContent

    // Get initial filter from URL params (default to 'like')
    const urlFilter = searchParams.get('filter')
    const initialFilter: FilterValue = urlFilter === 'disliked' ? 'dislike' : 'like'

    // State
    const [filter, setFilter] = useState<FilterValue>(initialFilter)
    const [searchQuery, setSearchQuery] = useState('')
    const [showResetConfirm, setShowResetConfirm] = useState(false)
    const [isResetting, setIsResetting] = useState(false)
    const [showGenreModal, setShowGenreModal] = useState(false)
    const [showTitleModal, setShowTitleModal] = useState(false)
    const [isLoadingRatings, setIsLoadingRatings] = useState(true)

    // Sync filter state with URL params
    useEffect(() => {
        const currentFilter = searchParams.get('filter')
        const newFilter: FilterValue = currentFilter === 'disliked' ? 'dislike' : 'like'
        setFilter(newFilter)
    }, [searchParams])

    // Manage loading state for ratings
    useEffect(() => {
        if (myRatings !== undefined) {
            setIsLoadingRatings(false)
        }
    }, [myRatings])

    // Update URL when filter changes
    const handleFilterChange = (newFilter: FilterValue) => {
        setFilter(newFilter)
        const url = new URL(window.location.href)
        if (newFilter === 'like') {
            url.searchParams.delete('filter')
        } else {
            url.searchParams.set('filter', 'disliked')
        }
        router.replace(url.pathname + url.search, { scroll: false })
    }

    // Filter and search ratings
    const filteredRatings = useMemo(() => {
        if (!myRatings) return []

        let filtered = [...myRatings].sort((a, b) => b.ratedAt - a.ratedAt)

        // Apply rating filter
        filtered = filtered.filter((r) => r.rating === filter)

        // Apply search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim()
            filtered = filtered.filter((r) => {
                const title =
                    r.content.media_type === 'movie'
                        ? r.content.title || r.content.original_title || ''
                        : r.content.name || r.content.original_name || ''
                return title.toLowerCase().includes(query)
            })
        }

        return filtered
    }, [myRatings, filter, searchQuery])

    // Handle reset all ratings
    const handleResetAllRatings = async () => {
        setIsResetting(true)
        try {
            if (isGuest) {
                guestUpdatePreferences({ myRatings: [], likedMovies: [], hiddenMovies: [] })
            } else {
                await authUpdatePreferences({ myRatings: [], likedMovies: [], hiddenMovies: [] })
            }
            setShowResetConfirm(false)
            showSuccess('All ratings have been reset')
        } catch (error) {
            console.error('Failed to reset ratings:', error)
            showError('Failed to reset ratings')
        } finally {
            setIsResetting(false)
        }
    }

    // Get rating stats
    const ratingStats = useMemo(() => {
        if (!myRatings) return { total: 0, liked: 0, disliked: 0 }
        return {
            total: myRatings.length,
            liked: myRatings.filter((r) => r.rating === 'like').length,
            disliked: myRatings.filter((r) => r.rating === 'dislike').length,
        }
    }, [myRatings])

    const titleActions =
        ratingStats.total > 0 ? (
            <button
                onClick={() => setShowResetConfirm(true)}
                className="flex items-center gap-2 px-3 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-colors text-sm"
            >
                <TrashIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Reset All</span>
            </button>
        ) : undefined

    const handleSaveGenrePreferences = async (preferences: any[]) => {
        if (isGuest) {
            guestUpdatePreferences({ genrePreferences: preferences })
        } else {
            await authUpdatePreferences({ genrePreferences: preferences })
        }
        showSuccess('Genre preferences saved')
    }

    const handleSaveTitlePreferences = async (preferences: any[]) => {
        if (isGuest) {
            guestUpdatePreferences({ votedContent: preferences })
        } else {
            await authUpdatePreferences({ votedContent: preferences })
        }
        showSuccess('Title preferences saved')
    }

    const headerActions = (
        <div className="space-y-4">
            {/* Filter buttons with quiz buttons on the right */}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                {/* Filter buttons */}
                <div className="flex gap-3 flex-wrap">
                    {(['like', 'dislike'] as FilterValue[]).map((f) => (
                        <button
                            key={f}
                            onClick={() => handleFilterChange(f)}
                            className={`px-5 py-2.5 rounded-lg text-base font-medium transition-colors ${
                                filter === f
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                            }`}
                        >
                            {f === 'like' ? 'Liked' : 'Disliked'} (
                            {f === 'like' ? ratingStats.liked : ratingStats.disliked})
                        </button>
                    ))}
                </div>

                {/* Quiz buttons */}
                <div className="flex gap-2">
                    {/* Genre Quiz */}
                    <button
                        onClick={() => setShowGenreModal(true)}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-600/20 border border-purple-500/50 hover:bg-purple-600/30 hover:border-purple-500 transition-all duration-200"
                        title="Rate Genres"
                    >
                        <SwatchIcon className="w-5 h-5 text-purple-400" />
                        <span className="hidden sm:inline text-sm font-medium text-purple-300">
                            Rate Genres
                        </span>
                    </button>

                    {/* Title Quiz */}
                    <button
                        onClick={() => setShowTitleModal(true)}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-pink-600/20 border border-pink-500/50 hover:bg-pink-600/30 hover:border-pink-500 transition-all duration-200"
                        title="Rate Titles"
                    >
                        <FilmIcon className="w-5 h-5 text-pink-400" />
                        <span className="hidden sm:inline text-sm font-medium text-pink-300">
                            Rate Titles
                        </span>
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="relative max-w-2xl">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                    type="text"
                    placeholder="Search your ratings..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-[#0a0a0a] border border-gray-700/50 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50"
                />
                {searchQuery && (
                    <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                    >
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                )}
            </div>
        </div>
    )

    return (
        <SubPageLayout
            title="My Ratings"
            icon={<StarIcon />}
            iconColor="text-purple-400"
            description="View and manage your content ratings. These ratings help personalize your recommendations."
            titleActions={titleActions}
            headerActions={headerActions}
        >
            {/* Content */}
            {isLoadingRatings ? (
                <div className="flex items-center justify-center py-32">
                    <NetflixLoader />
                </div>
            ) : filteredRatings.length === 0 ? (
                <div className="text-center py-16 bg-[#0a0a0a] rounded-lg border border-gray-700/50">
                    <StarIcon className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400 mb-2">
                        {searchQuery
                            ? 'No ratings match your search'
                            : `No ${filter === 'like' ? 'liked' : 'disliked'} titles`}
                    </p>
                    <p className="text-gray-500 text-sm">
                        {searchQuery
                            ? 'Try a different search term'
                            : filter === 'like'
                              ? 'Like titles to add them here'
                              : 'Disliked titles will appear here'}
                    </p>
                </div>
            ) : (
                <div className="flex flex-wrap justify-between gap-x-6 sm:gap-x-8 md:gap-x-10 lg:gap-x-12 gap-y-3 sm:gap-y-4 md:gap-y-5 [&>*]:flex-none">
                    {filteredRatings.map((rating) => (
                        <div key={rating.content.id} className="overflow-visible">
                            <ContentCard content={rating.content} />
                        </div>
                    ))}
                    <ContentGridSpacer />
                </div>
            )}

            {/* Reset Confirmation Modal */}
            {showResetConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="fixed inset-0 bg-black/80"
                        onClick={() => setShowResetConfirm(false)}
                    />
                    <div className="relative bg-[#0a0a0a] border border-gray-700/50 rounded-xl p-6 max-w-md w-full">
                        <h3 className="text-xl font-bold text-white mb-2">Reset All Ratings?</h3>
                        <p className="text-gray-400 mb-6">
                            This will remove all {ratingStats.total} of your ratings. This action
                            cannot be undone.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowResetConfirm(false)}
                                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleResetAllRatings}
                                disabled={isResetting}
                                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
                            >
                                {isResetting ? 'Resetting...' : 'Reset All'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Genre Preference Modal */}
            <GenrePreferenceModal
                isOpen={showGenreModal}
                onClose={() => setShowGenreModal(false)}
                onSave={handleSaveGenrePreferences}
                existingPreferences={genrePreferences || []}
            />

            {/* Title Preference Modal */}
            <TitlePreferenceModal
                isOpen={showTitleModal}
                onClose={() => setShowTitleModal(false)}
                onSave={handleSaveTitlePreferences}
                existingVotes={votedContent || []}
            />
        </SubPageLayout>
    )
}

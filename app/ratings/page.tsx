'use client'

import React, { useState, useMemo, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useRef } from 'react'
import { useAuthStore } from '../../stores/authStore'
import { useGuestStore } from '../../stores/guestStore'
import { useSessionStore } from '../../stores/sessionStore'
import { useToast } from '../../hooks/useToast'
import { VotedContent, SkippedContent } from '../../types/shared'
import SubPageLayout from '../../components/layout/SubPageLayout'
import ContentCard from '../../components/common/ContentCard'
import ContentGridSpacer from '../../components/common/ContentGridSpacer'
import {
    TrashIcon,
    MagnifyingGlassIcon,
    FilmIcon,
    HandThumbUpIcon,
    HandThumbDownIcon,
    Cog6ToothIcon,
    ChevronDownIcon,
} from '@heroicons/react/24/solid'
import { XMarkIcon, StarIcon } from '@heroicons/react/24/outline'
import NetflixLoader from '../../components/common/NetflixLoader'
import TitlePreferenceModal from '../../components/recommendations/TitlePreferenceModal'

type RatingValue = 'like' | 'dislike'
type FilterValue = RatingValue

// Wrapper component to handle Suspense for useSearchParams
export default function RatingsPage() {
    return (
        <SubPageLayout hideHeader>
            <Suspense
                fallback={
                    <div className="relative -mt-20 -mx-6 sm:-mx-8 lg:-mx-12 min-h-screen">
                        <div className="fixed inset-0 pointer-events-none">
                            <div className="absolute inset-0 bg-black" />
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[800px] bg-gradient-radial from-purple-900/20 via-transparent to-transparent opacity-50" />
                        </div>
                        <div className="relative z-10 flex items-center justify-center py-32">
                            <NetflixLoader />
                        </div>
                    </div>
                }
            >
                <RatingsPageContent />
            </Suspense>
        </SubPageLayout>
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

    // Get content preferences for title quiz
    const authVotedContent = useAuthStore((state) => state.votedContent)
    const guestVotedContent = useGuestStore((state) => state.votedContent)
    const votedContent = isGuest ? guestVotedContent : authVotedContent

    const authSkippedContent = useAuthStore((state) => state.skippedContent)
    const guestSkippedContent = useGuestStore((state) => state.skippedContent)
    const skippedContent = isGuest ? guestSkippedContent : authSkippedContent

    // Memoize stable empty arrays to prevent infinite loops in child components
    const stableVotedContent = useMemo(() => votedContent || [], [votedContent])
    const stableSkippedContent = useMemo(() => skippedContent || [], [skippedContent])

    // Get initial filter from URL params (default to 'like')
    const urlFilter = searchParams.get('filter')
    const initialFilter: FilterValue = urlFilter === 'disliked' ? 'dislike' : 'like'

    // State
    const [filter, setFilter] = useState<FilterValue>(initialFilter)
    const [searchQuery, setSearchQuery] = useState('')
    const [showResetConfirm, setShowResetConfirm] = useState(false)
    const [isResetting, setIsResetting] = useState(false)
    const [showTitleModal, setShowTitleModal] = useState(false)
    const [isLoadingRatings, setIsLoadingRatings] = useState(true)
    const [showManageDropdown, setShowManageDropdown] = useState(false)
    const manageDropdownRef = useRef<HTMLDivElement>(null)

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

    const handleSaveTitlePreferences = async (preferences: VotedContent[]) => {
        if (isGuest) {
            guestUpdatePreferences({ votedContent: preferences })
        } else {
            await authUpdatePreferences({ votedContent: preferences })
        }
        showSuccess('Title preferences saved')
    }

    const handleSkipContent = async (skipped: SkippedContent) => {
        const updatedSkippedContent = [...(skippedContent || []), skipped]
        if (isGuest) {
            guestUpdatePreferences({ skippedContent: updatedSkippedContent })
        } else {
            await authUpdatePreferences({ skippedContent: updatedSkippedContent })
        }
    }

    return (
        <div className="relative -mt-20 -mx-6 sm:-mx-8 lg:-mx-12">
            {/* Atmospheric Background */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute inset-0 bg-black" />
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[800px] bg-gradient-radial from-purple-900/20 via-transparent to-transparent opacity-50" />
                <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-black opacity-60" />
            </div>

            {/* Content Container */}
            <div className="relative z-10">
                {/* Cinematic Hero Header */}
                <div className="relative overflow-hidden pt-4">
                    {/* Animated Background Gradients */}
                    <div className="absolute inset-0 bg-gradient-to-br from-black via-zinc-900/80 to-black" />
                    <div
                        className="absolute inset-0 bg-gradient-to-t from-purple-900/20 via-violet-900/10 to-black/50 animate-pulse"
                        style={{ animationDuration: '4s' }}
                    />
                    <div className="absolute inset-0 bg-gradient-radial from-purple-500/10 via-purple-900/5 to-transparent" />

                    {/* Soft edge vignetting for subtle blending */}
                    <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/80" />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-black/60" />

                    {/* Hero Content */}
                    <div className="relative z-10 flex flex-col items-center justify-start px-6 pt-8 pb-6">
                        {/* Star Icon with glow */}
                        <div className="relative mb-4">
                            <div className="absolute inset-0 bg-purple-500/30 blur-2xl scale-150" />
                            <StarIcon className="relative w-16 h-16 text-purple-400 drop-shadow-[0_0_20px_rgba(168,85,247,0.5)]" />
                        </div>

                        {/* Title */}
                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-2 text-center tracking-tight">
                            <span className="bg-gradient-to-r from-purple-200 via-violet-100 to-purple-200 bg-clip-text text-transparent drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]">
                                My Ratings
                            </span>
                        </h1>

                        {/* Subtitle */}
                        <p className="text-base sm:text-lg text-gray-300 mb-6 text-center max-w-2xl">
                            View and manage your content ratings. These ratings help personalize
                            your recommendations.
                        </p>

                        {/* Filter Row - Pills on left, Actions on right */}
                        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between w-full max-w-3xl mb-5 px-4">
                            {/* Category Pills - Liked/Disliked */}
                            <div className="flex gap-2 items-center">
                                {[
                                    {
                                        value: 'like',
                                        label: 'Liked',
                                        icon: HandThumbUpIcon,
                                        count: ratingStats.liked,
                                    },
                                    {
                                        value: 'dislike',
                                        label: 'Disliked',
                                        icon: HandThumbDownIcon,
                                        count: ratingStats.disliked,
                                    },
                                ].map((option) => {
                                    const Icon = option.icon
                                    const isSelected = filter === option.value

                                    return (
                                        <button
                                            key={option.value}
                                            onClick={() =>
                                                handleFilterChange(option.value as FilterValue)
                                            }
                                            className={`group relative rounded-full px-5 py-2.5 text-sm font-bold transition-all duration-300 backdrop-blur-md border flex items-center gap-2 ${
                                                isSelected
                                                    ? 'bg-purple-500/90 text-white border-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.3)] scale-105'
                                                    : 'bg-zinc-900/40 text-gray-300 border-zinc-700/50 hover:bg-zinc-800/60 hover:border-zinc-600 hover:scale-105 hover:shadow-[0_0_8px_rgba(255,255,255,0.08)]'
                                            }`}
                                        >
                                            <Icon
                                                className={`w-4 h-4 ${isSelected ? 'text-white' : ''}`}
                                            />
                                            <span className="relative z-10">
                                                {option.label} ({option.count})
                                            </span>
                                            {isSelected && (
                                                <div className="absolute inset-0 rounded-full bg-purple-500 blur-md opacity-15 animate-pulse" />
                                            )}
                                        </button>
                                    )
                                })}
                            </div>

                            {/* Action Buttons - Rate Titles & Manage */}
                            <div className="flex gap-2 items-center">
                                {/* Rate Titles */}
                                <button
                                    onClick={() => setShowTitleModal(true)}
                                    className="group relative rounded-full px-5 py-2.5 text-sm font-bold transition-all duration-300 backdrop-blur-md border flex items-center gap-2 bg-zinc-900/40 text-gray-300 border-zinc-700/50 hover:bg-pink-600/30 hover:border-pink-500 hover:scale-105 hover:shadow-[0_0_10px_rgba(236,72,153,0.2)]"
                                    title="Rate Titles"
                                >
                                    <FilmIcon className="w-4 h-4 text-pink-400" />
                                    <span>Rate Titles</span>
                                </button>

                                {/* Manage dropdown */}
                                <div className="relative" ref={manageDropdownRef}>
                                    <button
                                        type="button"
                                        onClick={() => setShowManageDropdown(!showManageDropdown)}
                                        className="group relative rounded-full px-5 py-2.5 text-sm font-bold transition-all duration-300 backdrop-blur-md border flex items-center gap-2 bg-zinc-900/40 text-gray-300 border-zinc-700/50 hover:bg-zinc-800/60 hover:border-zinc-600 hover:scale-105 hover:shadow-[0_0_8px_rgba(255,255,255,0.08)]"
                                    >
                                        <Cog6ToothIcon className="w-4 h-4 text-gray-400" />
                                        <span>Manage</span>
                                        <ChevronDownIcon
                                            className={`w-4 h-4 transition-transform ${
                                                showManageDropdown ? 'rotate-180' : ''
                                            }`}
                                        />
                                    </button>

                                    {/* Dropdown Menu */}
                                    {showManageDropdown && (
                                        <div className="absolute top-full mt-2 right-0 bg-zinc-900/95 backdrop-blur-lg border border-zinc-700/50 rounded-xl shadow-2xl z-50 min-w-[200px] overflow-hidden">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    router.push('/settings/recommendations')
                                                    setShowManageDropdown(false)
                                                }}
                                                className="w-full flex items-center gap-3 px-4 py-3 text-white hover:bg-zinc-800/80 transition-colors"
                                            >
                                                <Cog6ToothIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                                                <span>Settings</span>
                                            </button>
                                            {ratingStats.total > 0 && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setShowResetConfirm(true)
                                                        setShowManageDropdown(false)
                                                    }}
                                                    className="w-full flex items-center gap-3 px-4 py-3 text-white hover:bg-zinc-800/80 transition-colors"
                                                >
                                                    <TrashIcon className="w-5 h-5 text-red-400 flex-shrink-0" />
                                                    <span>Reset All Ratings</span>
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Enhanced Search Bar */}
                        <div className="w-full max-w-3xl relative">
                            <div className="relative group">
                                <MagnifyingGlassIcon className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400 z-10 transition-colors group-focus-within:text-purple-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search your ratings..."
                                    className="w-full pl-14 pr-14 py-4 bg-zinc-900/40 backdrop-blur-lg border border-zinc-800/50 rounded-2xl text-white text-lg placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:shadow-[0_0_25px_rgba(168,85,247,0.3)] transition-all duration-300 hover:bg-zinc-900/60 hover:border-zinc-700"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-5 top-1/2 -translate-y-1/2 z-10 text-gray-400 hover:text-white transition-colors"
                                    >
                                        <XMarkIcon className="w-6 h-6" />
                                    </button>
                                )}

                                {/* Glowing border effect on focus */}
                                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-500 to-violet-500 opacity-0 group-focus-within:opacity-20 blur-xl transition-opacity duration-300 -z-10" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="px-6 sm:px-8 lg:px-12 py-8 space-y-6">
                    {/* Loading state */}
                    {isLoadingRatings && (
                        <div className="py-16">
                            <NetflixLoader inline={true} message="Loading ratings..." />
                        </div>
                    )}

                    {/* Empty state */}
                    {!isLoadingRatings && filteredRatings.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="relative mb-6">
                                <div className="absolute inset-0 bg-purple-500/20 blur-2xl scale-150" />
                                <div className="relative w-24 h-24 rounded-full bg-zinc-900/60 backdrop-blur-lg flex items-center justify-center border-2 border-zinc-800/50">
                                    <StarIcon className="w-12 h-12 text-purple-500" />
                                </div>
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-3">
                                {searchQuery
                                    ? 'No ratings match your search'
                                    : `No ${filter === 'like' ? 'liked' : 'disliked'} titles`}
                            </h3>
                            <p className="text-gray-400 mb-8 max-w-md text-lg">
                                {searchQuery
                                    ? 'Try a different search term'
                                    : filter === 'like'
                                      ? 'Like titles from the content cards to add them here'
                                      : 'Disliked titles will appear here'}
                            </p>
                        </div>
                    )}

                    {/* Content Grid */}
                    {!isLoadingRatings && filteredRatings.length > 0 && (
                        <div className="flex flex-wrap justify-between gap-x-6 sm:gap-x-8 md:gap-x-10 lg:gap-x-12 gap-y-3 sm:gap-y-4 md:gap-y-5 [&>*]:flex-none">
                            {filteredRatings.map((rating, index) => (
                                <div
                                    key={rating.content.id}
                                    className="overflow-visible animate-fadeInUp"
                                    style={{
                                        animationDelay: `${Math.min(index * 50, 500)}ms`,
                                        animationFillMode: 'both',
                                    }}
                                >
                                    <ContentCard content={rating.content} />
                                </div>
                            ))}
                            <ContentGridSpacer />
                        </div>
                    )}
                </div>
            </div>

            {/* Add keyframe animation for fade-in */}
            <style jsx>{`
                @keyframes fadeInUp {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                :global(.animate-fadeInUp) {
                    animation: fadeInUp 0.5s ease-out;
                }
            `}</style>

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

            {/* Title Preference Modal */}
            <TitlePreferenceModal
                isOpen={showTitleModal}
                onClose={() => setShowTitleModal(false)}
                onSave={handleSaveTitlePreferences}
                existingVotes={stableVotedContent}
                skippedContent={stableSkippedContent}
                onSkip={handleSkipContent}
            />
        </div>
    )
}

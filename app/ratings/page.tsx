'use client'

import React, { useState, useMemo, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
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
    FilmIcon,
    HandThumbUpIcon,
    HandThumbDownIcon,
    Cog6ToothIcon,
} from '@heroicons/react/24/solid'
import { StarIcon } from '@heroicons/react/24/outline'
import PageLoader from '../../components/common/PageLoader'
import PageHeader from '../../components/layout/PageHeader'
import PageEmptyState, { emptyStateActionClass } from '../../components/layout/PageEmptyState'
import { FilterPills, ListSearchInput, ManageMenu } from '../../components/layout/PageToolbar'
import Link from '@/components/common/Link'
import TitlePreferenceModal from '../../components/recommendations/TitlePreferenceModal'

type RatingValue = 'like' | 'dislike'
type FilterValue = RatingValue

// Wrapper component to handle Suspense for useSearchParams
export default function RatingsPage() {
    return (
        <SubPageLayout hideHeader>
            <Suspense fallback={<PageLoader inline={true} message="Loading ratings..." />}>
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

    const hasRatings = ratingStats.total > 0

    return (
        <div className="space-y-6">
            <PageHeader
                title="My Ratings"
                icon={<StarIcon />}
                actions={
                    hasRatings && (
                        <>
                            <button
                                type="button"
                                onClick={() => setShowTitleModal(true)}
                                className="inline-flex h-9 items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900 px-4 text-sm font-medium text-gray-300 transition-colors hover:border-zinc-500 hover:text-white"
                            >
                                <FilmIcon className="h-4 w-4 text-amber-400" />
                                Rate titles
                            </button>
                            <ManageMenu
                                items={[
                                    {
                                        label: 'Settings',
                                        icon: Cog6ToothIcon,
                                        onSelect: () => router.push('/settings/recommendations'),
                                    },
                                    {
                                        label: 'Reset all ratings',
                                        icon: TrashIcon,
                                        danger: true,
                                        onSelect: () => setShowResetConfirm(true),
                                    },
                                ]}
                            />
                        </>
                    )
                }
            >
                {hasRatings && (
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <FilterPills<FilterValue>
                            label="Show"
                            value={filter}
                            onChange={handleFilterChange}
                            options={[
                                {
                                    value: 'like',
                                    label: (
                                        <>
                                            <HandThumbUpIcon className="h-4 w-4" />
                                            Liked ({ratingStats.liked})
                                        </>
                                    ),
                                },
                                {
                                    value: 'dislike',
                                    label: (
                                        <>
                                            <HandThumbDownIcon className="h-4 w-4" />
                                            Disliked ({ratingStats.disliked})
                                        </>
                                    ),
                                },
                            ]}
                        />
                        <ListSearchInput
                            value={searchQuery}
                            onChange={setSearchQuery}
                            placeholder="Search your ratings..."
                            voiceSourceId="ratings-search"
                        />
                    </div>
                )}
            </PageHeader>

            {isLoadingRatings && (
                <div className="py-16">
                    <PageLoader inline={true} message="Loading ratings..." />
                </div>
            )}

            {!isLoadingRatings && !hasRatings && (
                <PageEmptyState
                    icon={<StarIcon />}
                    title="No ratings yet"
                    description="Like or dislike titles and they show up here. Your ratings also shape your recommendations."
                    action={
                        <Link href="/#trending" className={emptyStateActionClass}>
                            Rate a few titles
                        </Link>
                    }
                />
            )}

            {!isLoadingRatings && hasRatings && filteredRatings.length === 0 && (
                <p className="py-12 text-center text-gray-400">
                    {searchQuery
                        ? 'No ratings match your search.'
                        : filter === 'like'
                          ? 'No liked titles yet.'
                          : 'No disliked titles yet.'}
                </p>
            )}

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
                                className="flex-1 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-zinc-950 rounded-lg transition-colors disabled:opacity-50"
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

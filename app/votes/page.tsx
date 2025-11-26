'use client'

import React, { useState, useMemo } from 'react'
import Image from 'next/image'
import { useAuthStore } from '../../stores/authStore'
import { useGuestStore } from '../../stores/guestStore'
import { useSessionStore } from '../../stores/sessionStore'
import { useToast } from '../../hooks/useToast'
import { RatedContent } from '../../types/shared'
import SubPageLayout from '../../components/layout/SubPageLayout'
import {
    HandThumbDownIcon,
    FilmIcon,
    TvIcon,
    TrashIcon,
    MagnifyingGlassIcon,
} from '@heroicons/react/24/solid'
import { XMarkIcon, HandThumbUpIcon, StarIcon } from '@heroicons/react/24/outline'
import { getTitle } from '../../typings'

type RatingValue = 'like' | 'dislike'
type FilterValue = 'all' | RatingValue

export default function RatingsPage() {
    const { showSuccess, showError } = useToast()

    // Get session type
    const sessionType = useSessionStore((state) => state.sessionType)
    const isGuest = sessionType === 'guest'

    // Get ratings from stores (new myRatings system)
    const authMyRatings = useAuthStore((state) => state.myRatings)
    const guestMyRatings = useGuestStore((state) => state.myRatings)
    const myRatings = isGuest ? guestMyRatings : authMyRatings

    // Get rating actions
    const authRateContent = useAuthStore((state) => state.rateContent)
    const guestRateContent = useGuestStore((state) => state.rateContent)
    const rateContent = isGuest ? guestRateContent : authRateContent

    const authRemoveRating = useAuthStore((state) => state.removeRating)
    const guestRemoveRating = useGuestStore((state) => state.removeRating)
    const removeRating = isGuest ? guestRemoveRating : authRemoveRating

    const authUpdatePreferences = useAuthStore((state) => state.updatePreferences)
    const guestUpdatePreferences = useGuestStore((state) => state.updatePreferences)

    // State
    const [filter, setFilter] = useState<FilterValue>('all')
    const [searchQuery, setSearchQuery] = useState('')
    const [editingRating, setEditingRating] = useState<number | null>(null)
    const [showResetConfirm, setShowResetConfirm] = useState(false)
    const [isResetting, setIsResetting] = useState(false)

    // Filter and search ratings
    const filteredRatings = useMemo(() => {
        if (!myRatings) return []

        let filtered = [...myRatings].sort((a, b) => b.ratedAt - a.ratedAt)

        // Apply rating filter
        if (filter !== 'all') {
            filtered = filtered.filter((r) => r.rating === filter)
        }

        // Apply search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim()
            filtered = filtered.filter((r) => {
                const title = getTitle(r.content).toLowerCase()
                return title.includes(query)
            })
        }

        return filtered
    }, [myRatings, filter, searchQuery])

    // Handle rating change
    const handleRatingChange = async (rating: RatedContent, newRatingValue: RatingValue) => {
        try {
            await rateContent(rating.content, newRatingValue)
            setEditingRating(null)
            showSuccess(`Rating updated to "${newRatingValue === 'like' ? 'Liked' : 'Disliked'}"`)
        } catch (error) {
            console.error('Failed to update rating:', error)
            showError('Failed to update rating')
        }
    }

    // Handle rating removal
    const handleRemoveRating = async (contentId: number) => {
        try {
            await removeRating(contentId)
            setEditingRating(null)
            showSuccess('Rating removed')
        } catch (error) {
            console.error('Failed to remove rating:', error)
            showError('Failed to remove rating')
        }
    }

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

    // Get rating icon
    const getRatingIcon = (rating: RatingValue, className: string = 'w-5 h-5') => {
        switch (rating) {
            case 'like':
                return <HandThumbUpIcon className={`${className} text-green-500`} />
            case 'dislike':
                return <HandThumbDownIcon className={`${className} text-red-500`} />
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

    const headerActions = (
        <div className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
                <div className="bg-[#0a0a0a] rounded-lg border border-gray-700/50 p-3 text-center">
                    <p className="text-2xl font-bold text-white">{ratingStats.total}</p>
                    <p className="text-xs text-gray-500">Total</p>
                </div>
                <div className="bg-[#0a0a0a] rounded-lg border border-gray-700/50 p-3 text-center">
                    <p className="text-2xl font-bold text-green-500">{ratingStats.liked}</p>
                    <p className="text-xs text-gray-500">Liked</p>
                </div>
                <div className="bg-[#0a0a0a] rounded-lg border border-gray-700/50 p-3 text-center">
                    <p className="text-2xl font-bold text-red-500">{ratingStats.disliked}</p>
                    <p className="text-xs text-gray-500">Disliked</p>
                </div>
            </div>

            {/* Search */}
            <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                    type="text"
                    placeholder="Search your ratings..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-[#0a0a0a] border border-gray-700/50 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50"
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

            {/* Filter */}
            <div className="flex items-center gap-2">
                <div className="flex gap-2 flex-wrap">
                    {(['all', 'like', 'dislike'] as FilterValue[]).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                                filter === f
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                            }`}
                        >
                            {f === 'all'
                                ? 'All'
                                : f === 'like'
                                  ? 'Liked'
                                  : 'Disliked'}
                        </button>
                    ))}
                </div>
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
            {filteredRatings.length === 0 ? (
                <div className="text-center py-16 bg-[#0a0a0a] rounded-lg border border-gray-700/50">
                    <StarIcon className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400 mb-2">
                        {searchQuery
                            ? 'No ratings match your search'
                            : filter === 'all'
                              ? 'No ratings yet'
                              : `No ${filter === 'like' ? 'liked' : 'disliked'} titles`}
                    </p>
                    <p className="text-gray-500 text-sm">
                        {searchQuery
                            ? 'Try a different search term'
                            : 'Rate titles to improve your recommendations'}
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredRatings.map((rating) => {
                        const content = rating.content
                        const isEditing = editingRating === content.id
                        const title = getTitle(content)
                        const year = content.media_type === 'movie'
                            ? content.release_date?.slice(0, 4)
                            : content.first_air_date?.slice(0, 4)

                        return (
                            <div
                                key={content.id}
                                className="bg-[#0a0a0a] rounded-lg border border-gray-700/50 p-4 flex items-center gap-4"
                            >
                                {/* Poster */}
                                <div className="relative w-16 h-24 rounded overflow-hidden bg-gray-800 shrink-0">
                                    {content.poster_path ? (
                                        <Image
                                            src={`https://image.tmdb.org/t/p/w185${content.poster_path}`}
                                            alt={title}
                                            fill
                                            className="object-cover"
                                        />
                                    ) : (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            {content.media_type === 'movie' ? (
                                                <FilmIcon className="w-8 h-8 text-gray-600" />
                                            ) : (
                                                <TvIcon className="w-8 h-8 text-gray-600" />
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-white font-medium truncate">
                                        {title}
                                    </h3>
                                    <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                                        <span className="uppercase text-[10px] px-1.5 py-0.5 bg-gray-800 rounded">
                                            {content.media_type === 'movie' ? 'Movie' : 'Series'}
                                        </span>
                                        {year && <span>{year}</span>}
                                        {content.vote_average && content.vote_average > 0 && (
                                            <span className="text-yellow-500">
                                                {content.vote_average.toFixed(1)}/10
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-600 mt-1">
                                        Rated {new Date(rating.ratedAt).toLocaleDateString()}
                                    </p>
                                </div>

                                {/* Rating/Edit */}
                                {isEditing ? (
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleRatingChange(rating, 'like')}
                                            className={`p-2 rounded-full transition-colors ${
                                                rating.rating === 'like'
                                                    ? 'bg-green-600'
                                                    : 'bg-gray-700 hover:bg-green-600/50'
                                            }`}
                                        >
                                            <HandThumbUpIcon className="w-5 h-5 text-white" />
                                        </button>
                                        <button
                                            onClick={() => handleRatingChange(rating, 'dislike')}
                                            className={`p-2 rounded-full transition-colors ${
                                                rating.rating === 'dislike'
                                                    ? 'bg-red-600'
                                                    : 'bg-gray-700 hover:bg-red-600/50'
                                            }`}
                                        >
                                            <HandThumbDownIcon className="w-5 h-5 text-white" />
                                        </button>
                                        <button
                                            onClick={() => handleRemoveRating(content.id)}
                                            className="p-2 rounded-full bg-gray-700 hover:bg-gray-600 transition-colors ml-1"
                                            title="Remove rating"
                                        >
                                            <XMarkIcon className="w-5 h-5 text-gray-400" />
                                        </button>
                                        <button
                                            onClick={() => setEditingRating(null)}
                                            className="text-sm text-gray-500 hover:text-white ml-2"
                                        >
                                            Done
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setEditingRating(content.id)}
                                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
                                    >
                                        {getRatingIcon(rating.rating)}
                                        <span className="text-sm text-gray-300 capitalize">
                                            {rating.rating === 'dislike' ? 'Disliked' : 'Liked'}
                                        </span>
                                    </button>
                                )}
                            </div>
                        )
                    })}
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
        </SubPageLayout>
    )
}

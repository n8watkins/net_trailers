'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import Image from 'next/image'
import { useAuthStore } from '../../stores/authStore'
import { useGuestStore } from '../../stores/guestStore'
import { useSessionStore } from '../../stores/sessionStore'
import { useToast } from '../../hooks/useToast'
import { VotedContent } from '../../types/shared'
import SubPageLayout from '../../components/layout/SubPageLayout'
import {
    HeartIcon,
    HandThumbDownIcon,
    MinusIcon,
    FilmIcon,
    TvIcon,
    TrashIcon,
} from '@heroicons/react/24/solid'
import { XMarkIcon, HandThumbUpIcon } from '@heroicons/react/24/outline'

type VoteValue = 'love' | 'neutral' | 'not_for_me'
type FilterValue = 'all' | VoteValue

interface ContentDetails {
    id: number
    title: string
    poster_path: string | null
    media_type: 'movie' | 'tv'
    vote_average: number
    release_date?: string
}

export default function VotesPage() {
    const { showSuccess, showError } = useToast()

    // Get session type
    const sessionType = useSessionStore((state) => state.sessionType)
    const isGuest = sessionType === 'guest'

    // Get voted content from stores
    const authVotedContent = useAuthStore((state) => state.votedContent)
    const guestVotedContent = useGuestStore((state) => state.votedContent)
    const votedContent = isGuest ? guestVotedContent : authVotedContent

    // Get update functions
    const authUpdatePreferences = useAuthStore((state) => state.updatePreferences)
    const guestUpdatePreferences = useGuestStore((state) => state.updatePreferences)

    // State
    const [filter, setFilter] = useState<FilterValue>('all')
    const [contentDetails, setContentDetails] = useState<Map<string, ContentDetails>>(new Map())
    const [isLoading, setIsLoading] = useState(true)
    const [editingVote, setEditingVote] = useState<string | null>(null)
    const [showResetConfirm, setShowResetConfirm] = useState(false)
    const [isResetting, setIsResetting] = useState(false)

    // Filter votes
    const filteredVotes = useMemo(() => {
        if (!votedContent) return []
        const sorted = [...votedContent].sort((a, b) => b.votedAt - a.votedAt)
        if (filter === 'all') return sorted
        return sorted.filter((v) => v.vote === filter)
    }, [votedContent, filter])

    // Fetch content details for voted items
    useEffect(() => {
        if (!votedContent || votedContent.length === 0) {
            setIsLoading(false)
            return
        }

        const fetchDetails = async () => {
            setIsLoading(true)
            const newDetails = new Map<string, ContentDetails>()

            // Fetch in batches of 5
            const batches: VotedContent[][] = []
            for (let i = 0; i < votedContent.length; i += 5) {
                batches.push(votedContent.slice(i, i + 5))
            }

            for (const batch of batches) {
                const promises = batch.map(async (vote) => {
                    const key = `${vote.contentId}-${vote.mediaType}`
                    if (contentDetails.has(key)) return

                    try {
                        const response = await fetch(
                            `/api/${vote.mediaType === 'movie' ? 'movies' : 'tv'}/${vote.contentId}`
                        )
                        if (response.ok) {
                            const data = await response.json()
                            newDetails.set(key, {
                                id: data.id,
                                title: data.title || data.name,
                                poster_path: data.poster_path,
                                media_type: vote.mediaType,
                                vote_average: data.vote_average,
                                release_date: data.release_date || data.first_air_date,
                            })
                        }
                    } catch (error) {
                        console.error(`Failed to fetch details for ${key}:`, error)
                    }
                })

                await Promise.all(promises)
            }

            setContentDetails((prev) => new Map([...prev, ...newDetails]))
            setIsLoading(false)
        }

        fetchDetails()
    }, [votedContent])

    // Handle vote change
    const handleVoteChange = useCallback(
        async (contentId: number, mediaType: 'movie' | 'tv', newVote: VoteValue) => {
            try {
                const updatedVotes = (votedContent || []).map((v) => {
                    if (v.contentId === contentId && v.mediaType === mediaType) {
                        return { ...v, vote: newVote, votedAt: Date.now() }
                    }
                    return v
                })

                if (isGuest) {
                    guestUpdatePreferences({ votedContent: updatedVotes })
                } else {
                    await authUpdatePreferences({ votedContent: updatedVotes })
                }

                setEditingVote(null)
                showSuccess(
                    `Vote updated to "${newVote === 'love' ? 'Love' : newVote === 'not_for_me' ? 'Not for me' : 'Neutral'}"`
                )
            } catch (error) {
                console.error('Failed to update vote:', error)
                showError('Failed to update vote')
            }
        },
        [
            votedContent,
            isGuest,
            authUpdatePreferences,
            guestUpdatePreferences,
            showSuccess,
            showError,
        ]
    )

    // Handle vote removal
    const handleRemoveVote = useCallback(
        async (contentId: number, mediaType: 'movie' | 'tv') => {
            try {
                const updatedVotes = (votedContent || []).filter(
                    (v) => !(v.contentId === contentId && v.mediaType === mediaType)
                )

                if (isGuest) {
                    guestUpdatePreferences({ votedContent: updatedVotes })
                } else {
                    await authUpdatePreferences({ votedContent: updatedVotes })
                }

                setEditingVote(null)
                showSuccess('Vote removed')
            } catch (error) {
                console.error('Failed to remove vote:', error)
                showError('Failed to remove vote')
            }
        },
        [
            votedContent,
            isGuest,
            authUpdatePreferences,
            guestUpdatePreferences,
            showSuccess,
            showError,
        ]
    )

    // Handle reset all votes
    const handleResetAllVotes = useCallback(async () => {
        setIsResetting(true)
        try {
            if (isGuest) {
                guestUpdatePreferences({ votedContent: [] })
            } else {
                await authUpdatePreferences({ votedContent: [] })
            }
            setContentDetails(new Map())
            setShowResetConfirm(false)
            showSuccess('All votes have been reset')
        } catch (error) {
            console.error('Failed to reset votes:', error)
            showError('Failed to reset votes')
        } finally {
            setIsResetting(false)
        }
    }, [isGuest, authUpdatePreferences, guestUpdatePreferences, showSuccess, showError])

    // Get vote icon
    const getVoteIcon = (vote: VoteValue, className: string = 'w-5 h-5') => {
        switch (vote) {
            case 'love':
                return <HeartIcon className={`${className} text-green-500`} />
            case 'not_for_me':
                return <HandThumbDownIcon className={`${className} text-red-500`} />
            case 'neutral':
                return <MinusIcon className={`${className} text-gray-400`} />
        }
    }

    // Get vote stats
    const voteStats = useMemo(() => {
        if (!votedContent) return { total: 0, love: 0, neutral: 0, not_for_me: 0 }
        return {
            total: votedContent.length,
            love: votedContent.filter((v) => v.vote === 'love').length,
            neutral: votedContent.filter((v) => v.vote === 'neutral').length,
            not_for_me: votedContent.filter((v) => v.vote === 'not_for_me').length,
        }
    }, [votedContent])

    const titleActions =
        voteStats.total > 0 ? (
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
            <div className="grid grid-cols-4 gap-3">
                <div className="bg-[#0a0a0a] rounded-lg border border-gray-700/50 p-3 text-center">
                    <p className="text-2xl font-bold text-white">{voteStats.total}</p>
                    <p className="text-xs text-gray-500">Total</p>
                </div>
                <div className="bg-[#0a0a0a] rounded-lg border border-gray-700/50 p-3 text-center">
                    <p className="text-2xl font-bold text-green-500">{voteStats.love}</p>
                    <p className="text-xs text-gray-500">Loved</p>
                </div>
                <div className="bg-[#0a0a0a] rounded-lg border border-gray-700/50 p-3 text-center">
                    <p className="text-2xl font-bold text-gray-400">{voteStats.neutral}</p>
                    <p className="text-xs text-gray-500">Neutral</p>
                </div>
                <div className="bg-[#0a0a0a] rounded-lg border border-gray-700/50 p-3 text-center">
                    <p className="text-2xl font-bold text-red-500">{voteStats.not_for_me}</p>
                    <p className="text-xs text-gray-500">Not for me</p>
                </div>
            </div>

            {/* Filter */}
            <div className="flex items-center gap-2">
                <div className="flex gap-2 flex-wrap">
                    {(['all', 'love', 'neutral', 'not_for_me'] as FilterValue[]).map((f) => (
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
                                : f === 'love'
                                  ? 'Loved'
                                  : f === 'not_for_me'
                                    ? 'Not for me'
                                    : 'Neutral'}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    )

    return (
        <SubPageLayout
            title="Voted Titles"
            icon={<HandThumbUpIcon />}
            iconColor="text-purple-400"
            description="View and manage how you've rated titles. These votes help personalize your recommendations."
            titleActions={titleActions}
            headerActions={headerActions}
        >
            {/* Content */}
            {isLoading ? (
                <div className="flex items-center justify-center py-16">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500" />
                </div>
            ) : filteredVotes.length === 0 ? (
                <div className="text-center py-16 bg-[#0a0a0a] rounded-lg border border-gray-700/50">
                    <MinusIcon className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400 mb-2">
                        {filter === 'all'
                            ? 'No votes yet'
                            : `No titles voted as "${filter === 'love' ? 'Love' : filter === 'not_for_me' ? 'Not for me' : 'Neutral'}"`}
                    </p>
                    <p className="text-gray-500 text-sm">
                        Rate titles to improve your recommendations
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredVotes.map((vote) => {
                        const key = `${vote.contentId}-${vote.mediaType}`
                        const details = contentDetails.get(key)
                        const isEditing = editingVote === key

                        return (
                            <div
                                key={key}
                                className="bg-[#0a0a0a] rounded-lg border border-gray-700/50 p-4 flex items-center gap-4"
                            >
                                {/* Poster */}
                                <div className="relative w-16 h-24 rounded overflow-hidden bg-gray-800 shrink-0">
                                    {details?.poster_path ? (
                                        <Image
                                            src={`https://image.tmdb.org/t/p/w185${details.poster_path}`}
                                            alt={details.title || 'Poster'}
                                            fill
                                            className="object-cover"
                                        />
                                    ) : (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            {vote.mediaType === 'movie' ? (
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
                                        {details?.title || `Loading...`}
                                    </h3>
                                    <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                                        <span className="uppercase text-[10px] px-1.5 py-0.5 bg-gray-800 rounded">
                                            {vote.mediaType === 'movie' ? 'Movie' : 'Series'}
                                        </span>
                                        {details?.release_date && (
                                            <span>{details.release_date.slice(0, 4)}</span>
                                        )}
                                        {details?.vote_average && details.vote_average > 0 && (
                                            <span className="text-yellow-500">
                                                {details.vote_average.toFixed(1)}/10
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-600 mt-1">
                                        Voted {new Date(vote.votedAt).toLocaleDateString()}
                                    </p>
                                </div>

                                {/* Vote/Edit */}
                                {isEditing ? (
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() =>
                                                handleVoteChange(
                                                    vote.contentId,
                                                    vote.mediaType,
                                                    'love'
                                                )
                                            }
                                            className={`p-2 rounded-full transition-colors ${
                                                vote.vote === 'love'
                                                    ? 'bg-green-600'
                                                    : 'bg-gray-700 hover:bg-green-600/50'
                                            }`}
                                        >
                                            <HeartIcon className="w-5 h-5 text-white" />
                                        </button>
                                        <button
                                            onClick={() =>
                                                handleVoteChange(
                                                    vote.contentId,
                                                    vote.mediaType,
                                                    'neutral'
                                                )
                                            }
                                            className={`p-2 rounded-full transition-colors ${
                                                vote.vote === 'neutral'
                                                    ? 'bg-gray-600'
                                                    : 'bg-gray-700 hover:bg-gray-600/50'
                                            }`}
                                        >
                                            <MinusIcon className="w-5 h-5 text-white" />
                                        </button>
                                        <button
                                            onClick={() =>
                                                handleVoteChange(
                                                    vote.contentId,
                                                    vote.mediaType,
                                                    'not_for_me'
                                                )
                                            }
                                            className={`p-2 rounded-full transition-colors ${
                                                vote.vote === 'not_for_me'
                                                    ? 'bg-red-600'
                                                    : 'bg-gray-700 hover:bg-red-600/50'
                                            }`}
                                        >
                                            <HandThumbDownIcon className="w-5 h-5 text-white" />
                                        </button>
                                        <button
                                            onClick={() =>
                                                handleRemoveVote(vote.contentId, vote.mediaType)
                                            }
                                            className="p-2 rounded-full bg-gray-700 hover:bg-gray-600 transition-colors ml-1"
                                            title="Remove vote"
                                        >
                                            <XMarkIcon className="w-5 h-5 text-gray-400" />
                                        </button>
                                        <button
                                            onClick={() => setEditingVote(null)}
                                            className="text-sm text-gray-500 hover:text-white ml-2"
                                        >
                                            Done
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setEditingVote(key)}
                                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
                                    >
                                        {getVoteIcon(vote.vote)}
                                        <span className="text-sm text-gray-300 capitalize">
                                            {vote.vote === 'not_for_me' ? 'Not for me' : vote.vote}
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
                        <h3 className="text-xl font-bold text-white mb-2">Reset All Votes?</h3>
                        <p className="text-gray-400 mb-6">
                            This will remove all {voteStats.total} of your title votes. This action
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
                                onClick={handleResetAllVotes}
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

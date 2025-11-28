/**
 * PollCard Component
 *
 * Displays a poll with voting options
 * Clean, professional design
 * Memoized to prevent unnecessary re-renders when other polls change
 */

'use client'

import { memo, useCallback } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Poll, PollSummary } from '@/types/forum'
import { getCategoryInfo } from '@/utils/forumCategories'
import { ChartBarIcon, ClockIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import { formatDistanceToNow } from 'date-fns'
import { Timestamp } from 'firebase/firestore'

// Helper to convert Firebase Timestamp to Date
const toDate = (timestamp: Timestamp | Date | number | null): Date => {
    if (!timestamp) return new Date()
    if (timestamp instanceof Timestamp) {
        return timestamp.toDate()
    }
    if (timestamp instanceof Date) {
        return timestamp
    }
    return new Date(timestamp)
}

interface PollCardProps {
    poll: Poll | PollSummary
    userVote?: string[] // IDs of options user has voted for
    onVote?: (pollId: string, optionIds: string[]) => void
}

function PollCardComponent({ poll, userVote = [], onVote }: PollCardProps) {
    const router = useRouter()
    const category = getCategoryInfo(poll.category)
    const hasVoted = userVote.length > 0
    const isExpired = poll.expiresAt ? toDate(poll.expiresAt) < new Date() : false

    const handleCardClick = () => {
        router.push(`/community/polls/${poll.id}`)
    }

    const handleVote = (optionId: string, e: React.MouseEvent) => {
        e.preventDefault() // Prevent default button behavior
        e.stopPropagation() // Prevent card click navigation
        if (isExpired || !onVote) return

        if (poll.isMultipleChoice) {
            // Toggle option in multiple choice
            if (userVote.includes(optionId)) {
                onVote(
                    poll.id,
                    userVote.filter((id) => id !== optionId)
                )
            } else {
                onVote(poll.id, [...userVote, optionId])
            }
        } else {
            // Single choice - allow changing vote
            onVote(poll.id, [optionId])
        }
    }

    // Category color mapping
    const getCategoryColor = () => {
        switch (poll.category) {
            case 'movies':
                return 'border-l-blue-500'
            case 'tv-shows':
                return 'border-l-purple-500'
            case 'recommendations':
                return 'border-l-yellow-500'
            case 'rankings':
                return 'border-l-orange-500'
            case 'announcements':
                return 'border-l-red-500'
            default:
                return 'border-l-gray-400'
        }
    }

    const getCategoryGlow = () => {
        switch (poll.category) {
            case 'movies':
                return 'shadow-[0_0_30px_rgba(59,130,246,0.15)]'
            case 'tv-shows':
                return 'shadow-[0_0_30px_rgba(168,85,247,0.15)]'
            case 'recommendations':
                return 'shadow-[0_0_30px_rgba(234,179,8,0.15)]'
            case 'rankings':
                return 'shadow-[0_0_30px_rgba(249,115,22,0.15)]'
            case 'announcements':
                return 'shadow-[0_0_30px_rgba(239,68,68,0.15)]'
            default:
                return 'shadow-[0_0_30px_rgba(156,163,175,0.15)]'
        }
    }

    return (
        <div
            onClick={handleCardClick}
            className={`group relative bg-zinc-900/60 backdrop-blur-xl border-l-4 border-y border-r border-zinc-800/50 rounded-2xl p-4 sm:p-5 cursor-pointer transition-all duration-300 hover:bg-zinc-900/80 hover:border-zinc-700/80 hover:scale-[1.02] ${getCategoryColor()} ${getCategoryGlow()} hover:shadow-[0_0_50px_rgba(0,0,0,0.5)]`}
        >
            {/* Glowing rim effect on hover */}
            <div
                className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                style={{
                    background: 'linear-gradient(90deg, rgba(236,72,153,0.1) 0%, transparent 50%)',
                }}
            />

            {/* Header */}
            <div className="relative z-10 flex items-start gap-3 mb-3">
                {/* Author avatar */}
                {poll.userAvatar ? (
                    <Image
                        src={poll.userAvatar}
                        alt={poll.userName}
                        width={40}
                        height={40}
                        className="rounded-full ring-2 ring-zinc-800/50"
                    />
                ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-red-500 flex items-center justify-center text-sm font-bold shadow-lg">
                        {poll.userName[0]?.toUpperCase() || '?'}
                    </div>
                )}

                {/* Title and meta */}
                <div className="flex-1 min-w-0">
                    <h3 className="text-base sm:text-lg font-bold text-white leading-tight mb-1 group-hover:text-pink-300 transition-colors">
                        {poll.question}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                        <span className="font-medium">{poll.userName}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                            <ClockIcon className="w-3.5 h-3.5" />
                            {formatDistanceToNow(toDate(poll.createdAt), { addSuffix: true })}
                        </span>
                    </div>
                </div>
            </div>

            {/* Category Badge - Below question */}
            {category && (
                <div className="mb-4 inline-flex">
                    <div className="px-3 py-1.5 bg-zinc-800/60 backdrop-blur-sm rounded-full border border-zinc-700/50 flex items-center gap-1.5">
                        <span className="text-sm">{category.icon}</span>
                        <span className={`text-xs font-semibold ${category.color}`}>
                            {category.name}
                        </span>
                    </div>
                </div>
            )}

            {/* Description */}
            {'description' in poll && poll.description && (
                <p className="text-gray-400 text-sm mb-4 line-clamp-2 leading-relaxed">
                    {poll.description}
                </p>
            )}

            {/* Poll options with gradient bars */}
            <div className="space-y-3 mb-4">
                {poll.options.map((option) => {
                    const isSelected = userVote.includes(option.id)
                    const showResults = hasVoted || isExpired

                    return (
                        <button
                            type="button"
                            key={option.id}
                            onClick={(e) => handleVote(option.id, e)}
                            disabled={isExpired}
                            className={`relative w-full rounded-lg overflow-hidden transition-all duration-500 ${
                                isExpired ? 'cursor-default' : 'cursor-pointer'
                            } group/option`}
                        >
                            {/* Background gradient bar */}
                            {showResults && (
                                <div
                                    className={`absolute inset-0 transition-all duration-500 ${
                                        isSelected
                                            ? 'bg-gradient-to-r from-pink-500 to-red-500'
                                            : 'bg-gradient-to-r from-zinc-700 to-zinc-800'
                                    }`}
                                    style={{ width: `${option.percentage}%` }}
                                />
                            )}

                            {/* Option content */}
                            <div
                                className={`relative z-10 flex items-center justify-between px-4 py-3 border rounded-lg transition-all duration-300 ${
                                    isSelected
                                        ? 'border-pink-500 bg-pink-500/10'
                                        : 'border-zinc-700/50 bg-zinc-800/30 hover:bg-zinc-800/50 hover:border-zinc-600 group-hover/option:scale-[1.02]'
                                }`}
                            >
                                <div className="flex items-center gap-2">
                                    {isSelected && (
                                        <CheckCircleIcon className="w-5 h-5 text-pink-400" />
                                    )}
                                    <span
                                        className={`text-sm sm:text-base font-semibold ${
                                            isSelected ? 'text-white' : 'text-gray-200'
                                        }`}
                                    >
                                        {option.text}
                                    </span>
                                </div>
                                {showResults && (
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-gray-400">
                                            {option.votes} votes
                                        </span>
                                        <span className="text-base font-bold text-white">
                                            {option.percentage}%
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Ambient glow under selected option */}
                            {isSelected && showResults && (
                                <div className="absolute -bottom-2 left-0 right-0 h-8 bg-pink-500/20 blur-xl" />
                            )}
                        </button>
                    )
                })}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-zinc-800/50 text-xs">
                <div className="flex items-center gap-3 text-gray-400">
                    <div className="flex items-center gap-1.5">
                        <ChartBarIcon className="w-4 h-4" />
                        <span className="font-medium">{poll.totalVotes} votes</span>
                    </div>
                    {poll.isMultipleChoice && (
                        <span className="bg-zinc-800/60 px-2 py-1 rounded-full text-[10px] font-semibold border border-zinc-700/50">
                            Multiple Choice
                        </span>
                    )}
                </div>

                {isExpired ? (
                    <span className="text-red-400 font-semibold">Expired</span>
                ) : poll.expiresAt ? (
                    <span className="text-gray-500">
                        Expires {formatDistanceToNow(toDate(poll.expiresAt), { addSuffix: true })}
                    </span>
                ) : null}
            </div>

            {/* Tags */}
            {'tags' in poll && poll.tags && poll.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-zinc-800/50">
                    {poll.tags.map((tag: string) => (
                        <span
                            key={tag}
                            className="px-2.5 py-1 bg-zinc-800/60 backdrop-blur-sm text-gray-400 text-[10px] font-medium rounded-full hover:bg-zinc-700/60 hover:text-gray-300 transition-colors border border-zinc-700/50"
                        >
                            {tag}
                        </span>
                    ))}
                </div>
            )}
        </div>
    )
}

// Custom comparison to only re-render when this poll's data changes
function arePropsEqual(prevProps: PollCardProps, nextProps: PollCardProps): boolean {
    // Check if poll ID changed
    if (prevProps.poll.id !== nextProps.poll.id) return false

    // Check if poll data changed (totalVotes, options)
    if (prevProps.poll.totalVotes !== nextProps.poll.totalVotes) return false

    // Check options votes/percentages
    if (prevProps.poll.options.length !== nextProps.poll.options.length) return false
    for (let i = 0; i < prevProps.poll.options.length; i++) {
        if (prevProps.poll.options[i].votes !== nextProps.poll.options[i].votes) return false
        if (prevProps.poll.options[i].percentage !== nextProps.poll.options[i].percentage)
            return false
    }

    // Check if user vote changed (safely handle non-array values)
    const prevVote = Array.isArray(prevProps.userVote) ? prevProps.userVote : []
    const nextVote = Array.isArray(nextProps.userVote) ? nextProps.userVote : []
    if (prevVote.length !== nextVote.length) return false
    if (prevVote.join(',') !== nextVote.join(',')) return false

    // Props are equal, no re-render needed
    return true
}

export const PollCard = memo(PollCardComponent, arePropsEqual)

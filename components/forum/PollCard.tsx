/**
 * PollCard Component
 *
 * Displays a poll with voting options
 * Clean, professional design
 */

'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Poll } from '@/types/forum'
import { getCategoryInfo } from '@/utils/forumCategories'
import { ChartBarIcon, ClockIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import { formatDistanceToNow } from 'date-fns'
import { Timestamp } from 'firebase/firestore'

// Helper to convert Firebase Timestamp to Date
const toDate = (timestamp: Timestamp | Date | number): Date => {
    if (timestamp instanceof Timestamp) {
        return timestamp.toDate()
    }
    if (timestamp instanceof Date) {
        return timestamp
    }
    return new Date(timestamp)
}

interface PollCardProps {
    poll: Poll
    userVote?: string[] // IDs of options user has voted for
    onVote?: (optionIds: string[]) => void
}

export function PollCard({ poll, userVote = [], onVote }: PollCardProps) {
    const router = useRouter()
    const category = getCategoryInfo(poll.category)
    const hasVoted = userVote.length > 0
    const isExpired = poll.expiresAt ? toDate(poll.expiresAt) < new Date() : false

    const handleCardClick = () => {
        router.push(`/community/polls/${poll.id}`)
    }

    const handleVote = (optionId: string, e: React.MouseEvent) => {
        e.stopPropagation() // Prevent card click
        if (hasVoted || isExpired || !onVote) return

        if (poll.isMultipleChoice) {
            // Toggle option in multiple choice
            if (userVote.includes(optionId)) {
                onVote(userVote.filter((id) => id !== optionId))
            } else {
                onVote([...userVote, optionId])
            }
        } else {
            // Single choice
            onVote([optionId])
        }
    }

    return (
        <div
            onClick={handleCardClick}
            className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 sm:p-4 hover:border-zinc-700 transition-colors cursor-pointer"
        >
            {/* Header */}
            <div className="flex items-start gap-3 mb-4">
                {/* Author avatar */}
                {poll.userAvatar ? (
                    <Image
                        src={poll.userAvatar}
                        alt={poll.userName}
                        width={40}
                        height={40}
                        className="rounded-full"
                    />
                ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-red-500 flex items-center justify-center text-sm font-bold">
                        {poll.userName[0]?.toUpperCase() || '?'}
                    </div>
                )}

                {/* Title and meta */}
                <div className="flex-1 min-w-0">
                    <h3 className="text-base sm:text-lg font-semibold text-white mb-1">
                        {poll.question}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                        <span>{poll.userName}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                            <ClockIcon className="w-4 h-4" />
                            {formatDistanceToNow(toDate(poll.createdAt), { addSuffix: true })}
                        </span>
                        {category && (
                            <>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                    <span>{category.icon}</span>
                                    <span className={category.color}>{category.name}</span>
                                </span>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Description */}
            {poll.description && <p className="text-gray-400 text-sm mb-4">{poll.description}</p>}

            {/* Poll options */}
            <div className="space-y-2 mb-4">
                {poll.options.map((option) => {
                    const isSelected = userVote.includes(option.id)
                    const showResults = hasVoted || isExpired

                    return (
                        <button
                            key={option.id}
                            onClick={(e) => handleVote(option.id, e)}
                            disabled={hasVoted || isExpired}
                            className={`w-full text-left p-3 rounded-lg border transition-colors ${
                                isSelected
                                    ? 'border-blue-500 bg-blue-500/10'
                                    : 'border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/50'
                            } ${hasVoted || isExpired ? 'cursor-default' : 'cursor-pointer'}`}
                        >
                            <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                    {isSelected && (
                                        <CheckCircleIcon className="w-5 h-5 text-blue-500" />
                                    )}
                                    <span
                                        className={`font-medium ${isSelected ? 'text-blue-400' : 'text-white'}`}
                                    >
                                        {option.text}
                                    </span>
                                </div>
                                {showResults && (
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-gray-400">
                                            {option.votes} votes
                                        </span>
                                        <span className="text-sm font-semibold text-white">
                                            {option.percentage}%
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Progress bar */}
                            {showResults && (
                                <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                                    <div
                                        className={`h-full ${isSelected ? 'bg-blue-500' : 'bg-zinc-600'} transition-all duration-300`}
                                        style={{ width: `${option.percentage}%` }}
                                    />
                                </div>
                            )}
                        </button>
                    )
                })}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-zinc-800 text-sm">
                <div className="flex items-center gap-3 text-gray-400">
                    <div className="flex items-center gap-1">
                        <ChartBarIcon className="w-4 h-4" />
                        <span>{poll.totalVotes} votes</span>
                    </div>
                    {poll.isMultipleChoice && (
                        <span className="text-xs bg-zinc-800 px-2 py-0.5 rounded">
                            Multiple choice
                        </span>
                    )}
                </div>

                {isExpired ? (
                    <span className="text-xs text-red-400">Expired</span>
                ) : poll.expiresAt ? (
                    <span className="text-xs text-gray-500">
                        Expires {formatDistanceToNow(toDate(poll.expiresAt), { addSuffix: true })}
                    </span>
                ) : null}
            </div>

            {/* Tags */}
            {poll.tags && poll.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-zinc-800">
                    {poll.tags.map((tag) => (
                        <span
                            key={tag}
                            className="px-2 py-0.5 bg-zinc-800 text-gray-400 text-xs rounded hover:bg-zinc-700 transition-colors"
                        >
                            {tag}
                        </span>
                    ))}
                </div>
            )}
        </div>
    )
}

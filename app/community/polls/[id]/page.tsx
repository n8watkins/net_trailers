/**
 * Poll Detail Page
 *
 * Shows full poll with voting interface and results visualization
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import SubPageLayout from '@/components/layout/SubPageLayout'
import { useForumStore } from '@/stores/forumStore'
import { useSessionStore } from '@/stores/sessionStore'
import { useAuthStatus } from '@/hooks/useAuthStatus'
import { getCategoryInfo } from '@/utils/forumCategories'
import NetflixLoader from '@/components/common/NetflixLoader'
import { formatDistanceToNow } from 'date-fns'
import { Timestamp } from 'firebase/firestore'
import {
    ChartBarIcon,
    ArrowLeftIcon,
    TrashIcon,
    CheckCircleIcon,
    ClockIcon,
    XCircleIcon,
} from '@heroicons/react/24/outline'

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

interface PollDetailPageProps {
    params: {
        id: string
    }
}

export default function PollDetailPage({ params }: PollDetailPageProps) {
    const router = useRouter()
    const { isGuest, isInitialized } = useAuthStatus()
    const getUserId = useSessionStore((state) => state.getUserId)
    const userId = getUserId()

    const { currentPoll, isLoadingPolls, loadPollById, voteOnPoll, deletePoll, getUserVote } =
        useForumStore()

    const [selectedOptions, setSelectedOptions] = useState<string[]>([])
    const [hasVoted, setHasVoted] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Load poll
    useEffect(() => {
        if (isInitialized && params.id) {
            loadPollById(params.id)
        }
    }, [isInitialized, params.id])

    // Check if user has already voted
    useEffect(() => {
        const checkUserVote = async () => {
            if (currentPoll && userId) {
                const userVote = await getUserVote(userId, currentPoll.id)
                if (userVote) {
                    setHasVoted(true)
                    setSelectedOptions(userVote)
                } else {
                    setHasVoted(false)
                    setSelectedOptions([])
                }
            }
        }
        checkUserVote()
    }, [currentPoll, userId, getUserVote])

    const handleOptionToggle = (optionId: string) => {
        if (hasVoted || isExpired || isGuest) return

        if (currentPoll?.isMultipleChoice) {
            // Multiple choice - toggle selection
            setSelectedOptions((prev) =>
                prev.includes(optionId) ? prev.filter((id) => id !== optionId) : [...prev, optionId]
            )
        } else {
            // Single choice - replace selection
            setSelectedOptions([optionId])
        }
    }

    const handleVote = async () => {
        if (!currentPoll || selectedOptions.length === 0 || isGuest || hasVoted || !userId) return

        setIsSubmitting(true)
        try {
            await voteOnPoll(userId, currentPoll.id, selectedOptions)
            setHasVoted(true)
            await loadPollById(currentPoll.id) // Reload to show updated results
        } catch (error) {
            console.error('Failed to vote:', error)
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleDelete = async () => {
        if (!currentPoll || currentPoll.userId !== userId) return

        if (confirm('Are you sure you want to delete this poll?')) {
            try {
                await deletePoll(userId, currentPoll.id)
                router.push('/community?tab=polls')
            } catch (error) {
                console.error('Failed to delete poll:', error)
            }
        }
    }

    if (isLoadingPolls || !currentPoll) {
        return (
            <SubPageLayout title="Loading..." icon={<ChartBarIcon className="w-8 h-8" />}>
                <NetflixLoader />
            </SubPageLayout>
        )
    }

    const category = getCategoryInfo(currentPoll.category)
    const isOwner = currentPoll.userId === userId
    const isExpired = currentPoll.expiresAt ? toDate(currentPoll.expiresAt) < new Date() : false
    const showResults = hasVoted || isExpired

    return (
        <SubPageLayout
            title="Poll"
            icon={<ChartBarIcon className="w-8 h-8" />}
            iconColor="text-pink-500"
        >
            {/* Back button */}
            <button
                onClick={() => router.back()}
                className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6"
            >
                <ArrowLeftIcon className="w-5 h-5" />
                <span>Back to Community</span>
            </button>

            {/* Poll content */}
            <div className="max-w-4xl mx-auto">
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mb-6">
                    {/* Header */}
                    <div className="flex items-start gap-4 mb-6">
                        {currentPoll.userAvatar ? (
                            <Image
                                src={currentPoll.userAvatar}
                                alt={currentPoll.userName}
                                width={50}
                                height={50}
                                className="rounded-full"
                            />
                        ) : (
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-red-500 flex items-center justify-center text-lg font-bold">
                                {currentPoll.userName[0]?.toUpperCase() || '?'}
                            </div>
                        )}

                        <div className="flex-1">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h1 className="text-2xl font-bold text-white mb-2">
                                        {currentPoll.question}
                                    </h1>
                                    <div className="flex items-center gap-2 text-sm text-gray-400">
                                        <span>{currentPoll.userName}</span>
                                        <span>•</span>
                                        <span>
                                            {formatDistanceToNow(toDate(currentPoll.createdAt), {
                                                addSuffix: true,
                                            })}
                                        </span>
                                        {category && (
                                            <>
                                                <span>•</span>
                                                <span className="flex items-center gap-1">
                                                    <span>{category.icon}</span>
                                                    <span className={category.color}>
                                                        {category.name}
                                                    </span>
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {isOwner && (
                                    <button
                                        onClick={handleDelete}
                                        className="px-3 py-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition-colors flex items-center gap-2"
                                    >
                                        <TrashIcon className="w-5 h-5" />
                                        <span className="text-sm">Delete</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Description */}
                    {currentPoll.description && (
                        <div className="mb-6 p-4 bg-zinc-800/50 rounded-lg">
                            <p className="text-gray-300">{currentPoll.description}</p>
                        </div>
                    )}

                    {/* Poll status badges */}
                    <div className="flex flex-wrap gap-2 mb-6">
                        {currentPoll.isMultipleChoice && (
                            <span className="px-3 py-1 bg-blue-500/10 border border-blue-500/30 rounded-full text-sm text-blue-400 flex items-center gap-1">
                                <CheckCircleIcon className="w-4 h-4" />
                                Multiple Choice
                            </span>
                        )}
                        {isExpired ? (
                            <span className="px-3 py-1 bg-red-500/10 border border-red-500/30 rounded-full text-sm text-red-400 flex items-center gap-1">
                                <XCircleIcon className="w-4 h-4" />
                                Expired
                            </span>
                        ) : currentPoll.expiresAt ? (
                            <span className="px-3 py-1 bg-yellow-500/10 border border-yellow-500/30 rounded-full text-sm text-yellow-400 flex items-center gap-1">
                                <ClockIcon className="w-4 h-4" />
                                Expires{' '}
                                {formatDistanceToNow(toDate(currentPoll.expiresAt), {
                                    addSuffix: true,
                                })}
                            </span>
                        ) : null}
                        {hasVoted && (
                            <span className="px-3 py-1 bg-green-500/10 border border-green-500/30 rounded-full text-sm text-green-400 flex items-center gap-1">
                                <CheckCircleIcon className="w-4 h-4" />
                                You voted
                            </span>
                        )}
                    </div>

                    {/* Voting options */}
                    <div className="space-y-3 mb-6">
                        <h2 className="text-lg font-semibold text-white mb-3">
                            {showResults
                                ? 'Results'
                                : currentPoll.isMultipleChoice
                                  ? 'Select one or more options'
                                  : 'Select an option'}
                        </h2>

                        {currentPoll.options.map((option) => {
                            const isSelected = selectedOptions.includes(option.id)
                            const percentage = option.percentage || 0

                            return (
                                <div
                                    key={option.id}
                                    onClick={() => handleOptionToggle(option.id)}
                                    className={`relative overflow-hidden rounded-lg border transition-all ${
                                        isSelected
                                            ? 'border-pink-500 bg-pink-500/10'
                                            : 'border-zinc-700 hover:border-zinc-600 bg-zinc-800/50'
                                    } ${
                                        showResults || isGuest ? 'cursor-default' : 'cursor-pointer'
                                    }`}
                                >
                                    {/* Background progress bar for results */}
                                    {showResults && (
                                        <div
                                            className={`absolute inset-0 ${
                                                isSelected ? 'bg-pink-500/20' : 'bg-zinc-700/30'
                                            } transition-all duration-500`}
                                            style={{ width: `${percentage}%` }}
                                        />
                                    )}

                                    <div className="relative p-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                {/* Selection indicator */}
                                                {!showResults && (
                                                    <div
                                                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                                                            isSelected
                                                                ? 'border-pink-500 bg-pink-500'
                                                                : 'border-zinc-600'
                                                        }`}
                                                    >
                                                        {isSelected && (
                                                            <CheckCircleIcon className="w-4 h-4 text-white" />
                                                        )}
                                                    </div>
                                                )}

                                                <span
                                                    className={`font-medium ${
                                                        isSelected ? 'text-pink-400' : 'text-white'
                                                    }`}
                                                >
                                                    {option.text}
                                                </span>
                                            </div>

                                            {/* Vote counts */}
                                            {showResults && (
                                                <div className="flex items-center gap-3">
                                                    <span className="text-sm text-gray-400">
                                                        {option.votes}{' '}
                                                        {option.votes === 1 ? 'vote' : 'votes'}
                                                    </span>
                                                    <span className="text-lg font-bold text-white min-w-[3rem] text-right">
                                                        {percentage}%
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {/* Vote button */}
                    {!showResults && !isGuest && (
                        <button
                            onClick={handleVote}
                            disabled={selectedOptions.length === 0 || isSubmitting}
                            className="w-full px-6 py-3 bg-pink-500 hover:bg-pink-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting
                                ? 'Submitting...'
                                : `Submit ${currentPoll.isMultipleChoice ? 'Votes' : 'Vote'}`}
                        </button>
                    )}

                    {/* Guest message */}
                    {!showResults && isGuest && (
                        <div className="text-center py-6 bg-zinc-800/50 rounded-lg">
                            <p className="text-gray-400">Please sign in to vote on this poll</p>
                        </div>
                    )}

                    {/* Total votes */}
                    <div className="flex items-center justify-center gap-2 mt-6 pt-6 border-t border-zinc-800 text-gray-400">
                        <ChartBarIcon className="w-5 h-5" />
                        <span className="text-lg font-semibold">
                            {currentPoll.totalVotes} total{' '}
                            {currentPoll.totalVotes === 1 ? 'vote' : 'votes'}
                        </span>
                    </div>

                    {/* Tags */}
                    {currentPoll.tags && currentPoll.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-6 pt-6 border-t border-zinc-800">
                            {currentPoll.tags.map((tag) => (
                                <span
                                    key={tag}
                                    className="px-3 py-1 bg-zinc-800 text-gray-400 text-sm rounded-full"
                                >
                                    {tag}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {/* Related polls or additional info could go here */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
                    <h2 className="text-xl font-bold text-white mb-4">Poll Information</h2>
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between py-2 border-b border-zinc-800">
                            <span className="text-gray-400">Created by</span>
                            <span className="text-white font-medium">{currentPoll.userName}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-zinc-800">
                            <span className="text-gray-400">Created</span>
                            <span className="text-white">
                                {formatDistanceToNow(toDate(currentPoll.createdAt), {
                                    addSuffix: true,
                                })}
                            </span>
                        </div>
                        {currentPoll.expiresAt && (
                            <div className="flex justify-between py-2 border-b border-zinc-800">
                                <span className="text-gray-400">
                                    {isExpired ? 'Expired' : 'Expires'}
                                </span>
                                <span className={isExpired ? 'text-red-400' : 'text-white'}>
                                    {formatDistanceToNow(toDate(currentPoll.expiresAt), {
                                        addSuffix: true,
                                    })}
                                </span>
                            </div>
                        )}
                        <div className="flex justify-between py-2 border-b border-zinc-800">
                            <span className="text-gray-400">Category</span>
                            <span className="text-white flex items-center gap-1">
                                {category?.icon} {category?.name}
                            </span>
                        </div>
                        <div className="flex justify-between py-2">
                            <span className="text-gray-400">Type</span>
                            <span className="text-white">
                                {currentPoll.isMultipleChoice ? 'Multiple Choice' : 'Single Choice'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </SubPageLayout>
    )
}

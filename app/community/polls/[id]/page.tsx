/**
 * Poll Detail Page
 *
 * Shows full poll with voting interface and results visualization
 */

'use client'

import { useState, useEffect, use } from 'react'
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
    PencilIcon,
    EyeIcon,
    EyeSlashIcon,
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
    params: Promise<{
        id: string
    }>
}

export default function PollDetailPage({ params }: PollDetailPageProps) {
    const resolvedParams = use(params)
    const router = useRouter()
    const { isGuest, isInitialized } = useAuthStatus()
    const getUserId = useSessionStore((state) => state.getUserId)
    const userId = getUserId()

    const {
        currentPoll,
        isLoadingPolls,
        loadPollById,
        voteOnPoll,
        deletePoll,
        getUserVote,
        updatePoll,
        hidePoll,
        unhidePoll,
        canEditPoll,
    } = useForumStore()

    const [selectedOptions, setSelectedOptions] = useState<string[]>([])
    const [hasVoted, setHasVoted] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isEditMode, setIsEditMode] = useState(false)
    const [editQuestion, setEditQuestion] = useState('')
    const [editOptions, setEditOptions] = useState<string[]>([])
    const [editTimeLeft, setEditTimeLeft] = useState<number>(0)

    // Load poll
    useEffect(() => {
        if (isInitialized && resolvedParams.id) {
            loadPollById(resolvedParams.id)
        }
    }, [isInitialized, resolvedParams.id, loadPollById])

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

    // Track edit time remaining (5 minutes from creation)
    useEffect(() => {
        if (!currentPoll) return

        const calculateTimeLeft = () => {
            const createdAt =
                currentPoll.createdAt instanceof Timestamp
                    ? currentPoll.createdAt.toMillis()
                    : typeof currentPoll.createdAt === 'number'
                      ? currentPoll.createdAt
                      : new Date(currentPoll.createdAt).getTime()
            const fiveMinutes = 5 * 60 * 1000
            const timeLeft = createdAt + fiveMinutes - Date.now()
            return Math.max(0, timeLeft)
        }

        setEditTimeLeft(calculateTimeLeft())

        const interval = setInterval(() => {
            const timeLeft = calculateTimeLeft()
            setEditTimeLeft(timeLeft)
            if (timeLeft === 0) {
                clearInterval(interval)
                setIsEditMode(false) // Exit edit mode if time expires
            }
        }, 1000)

        return () => clearInterval(interval)
    }, [currentPoll])

    // Initialize edit form when entering edit mode
    const handleStartEdit = () => {
        if (!currentPoll || !canEditPoll(currentPoll)) return
        setEditQuestion(currentPoll.question)
        setEditOptions(currentPoll.options.map((opt) => opt.text))
        setIsEditMode(true)
    }

    const handleCancelEdit = () => {
        setIsEditMode(false)
        setEditQuestion('')
        setEditOptions([])
    }

    const handleSaveEdit = async () => {
        if (!currentPoll || !userId) return
        const validOptions = editOptions.filter((opt) => opt.trim().length > 0)
        if (!editQuestion.trim() || validOptions.length < 2) return

        setIsSubmitting(true)
        try {
            await updatePoll(userId, currentPoll.id, {
                question: editQuestion,
                options: validOptions,
            })
            setIsEditMode(false)
            setHasVoted(false) // Reset vote state since votes are cleared
            setSelectedOptions([])
        } catch (error) {
            console.error('Failed to update poll:', error)
            alert(error instanceof Error ? error.message : 'Failed to update poll')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleToggleHidden = async () => {
        if (!currentPoll || !userId || currentPoll.userId !== userId) return

        setIsSubmitting(true)
        try {
            if (currentPoll.isHidden) {
                await unhidePoll(userId, currentPoll.id)
            } else {
                await hidePoll(userId, currentPoll.id)
            }
        } catch (error) {
            console.error('Failed to toggle poll visibility:', error)
        } finally {
            setIsSubmitting(false)
        }
    }

    const addEditOption = () => {
        if (editOptions.length < 10) {
            setEditOptions([...editOptions, ''])
        }
    }

    const removeEditOption = (index: number) => {
        if (editOptions.length > 2) {
            setEditOptions(editOptions.filter((_, i) => i !== index))
        }
    }

    const updateEditOption = (index: number, value: string) => {
        const newOptions = [...editOptions]
        newOptions[index] = value
        setEditOptions(newOptions)
    }

    const formatTimeLeft = (ms: number) => {
        const totalSeconds = Math.floor(ms / 1000)
        const minutes = Math.floor(totalSeconds / 60)
        const seconds = totalSeconds % 60
        return `${minutes}:${seconds.toString().padStart(2, '0')}`
    }

    const submitVote = async (optionIds: string[]) => {
        if (!currentPoll || optionIds.length === 0 || isGuest || hasVoted || !userId) return

        setIsSubmitting(true)
        try {
            await voteOnPoll(userId, currentPoll.id, optionIds)
            setHasVoted(true)
            // No need to reload - store updates optimistically
        } catch (error) {
            console.error('Failed to vote:', error)
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleOptionToggle = async (optionId: string) => {
        if (hasVoted || isExpired || isGuest || !currentPoll || isSubmitting) return

        if (currentPoll.isMultipleChoice) {
            setSelectedOptions((prev) =>
                prev.includes(optionId) ? prev.filter((id) => id !== optionId) : [...prev, optionId]
            )
        } else {
            const choice = [optionId]
            setSelectedOptions(choice)
            await submitVote(choice)
        }
    }

    const handleDelete = async () => {
        if (!currentPoll || currentPoll.userId !== userId) return

        if (confirm('Are you sure you want to delete this poll?')) {
            try {
                await deletePoll(userId, currentPoll.id)
                router.push('/community/polls')
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
    const canEdit = isOwner && canEditPoll(currentPoll)

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
                                    <div className="flex items-center gap-2">
                                        {/* Edit button - only within 5 minutes */}
                                        {canEdit && !isEditMode && (
                                            <button
                                                onClick={handleStartEdit}
                                                disabled={isSubmitting}
                                                className="px-3 py-2 text-blue-400 hover:text-blue-300 hover:bg-blue-900/20 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                                                title={`Edit available for ${formatTimeLeft(editTimeLeft)}`}
                                            >
                                                <PencilIcon className="w-5 h-5" />
                                                <span className="text-sm">
                                                    Edit ({formatTimeLeft(editTimeLeft)})
                                                </span>
                                            </button>
                                        )}

                                        {/* Hide/Unhide button */}
                                        <button
                                            onClick={handleToggleHidden}
                                            disabled={isSubmitting}
                                            className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 ${
                                                currentPoll.isHidden
                                                    ? 'text-green-400 hover:text-green-300 hover:bg-green-900/20'
                                                    : 'text-yellow-400 hover:text-yellow-300 hover:bg-yellow-900/20'
                                            }`}
                                        >
                                            {currentPoll.isHidden ? (
                                                <>
                                                    <EyeIcon className="w-5 h-5" />
                                                    <span className="text-sm">Show</span>
                                                </>
                                            ) : (
                                                <>
                                                    <EyeSlashIcon className="w-5 h-5" />
                                                    <span className="text-sm">Hide</span>
                                                </>
                                            )}
                                        </button>

                                        {/* Delete button */}
                                        <button
                                            onClick={handleDelete}
                                            disabled={isSubmitting}
                                            className="px-3 py-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                                        >
                                            <TrashIcon className="w-5 h-5" />
                                            <span className="text-sm">Delete</span>
                                        </button>
                                    </div>
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
                        {currentPoll.isHidden && (
                            <span className="px-3 py-1 bg-orange-500/10 border border-orange-500/30 rounded-full text-sm text-orange-400 flex items-center gap-1">
                                <EyeSlashIcon className="w-4 h-4" />
                                Hidden from public
                            </span>
                        )}
                    </div>

                    {/* Edit Mode UI */}
                    {isEditMode && (
                        <div className="mb-6 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-blue-400">
                                    Editing Poll
                                </h3>
                                <span className="text-sm text-blue-300">
                                    Time remaining: {formatTimeLeft(editTimeLeft)}
                                </span>
                            </div>
                            <p className="text-sm text-blue-300 mb-4">
                                Note: Saving changes will reset all votes.
                            </p>

                            {/* Edit Question */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-white mb-2">
                                    Question
                                </label>
                                <input
                                    type="text"
                                    value={editQuestion}
                                    onChange={(e) => setEditQuestion(e.target.value)}
                                    placeholder="Poll question"
                                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    maxLength={200}
                                />
                            </div>

                            {/* Edit Options */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-white mb-2">
                                    Options (min 2, max 10)
                                </label>
                                <div className="space-y-2">
                                    {editOptions.map((option, index) => (
                                        <div key={index} className="flex gap-2">
                                            <input
                                                type="text"
                                                value={option}
                                                onChange={(e) =>
                                                    updateEditOption(index, e.target.value)
                                                }
                                                placeholder={`Option ${index + 1}`}
                                                className="flex-1 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                maxLength={100}
                                            />
                                            {editOptions.length > 2 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeEditOption(index)}
                                                    className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                                                >
                                                    <TrashIcon className="w-5 h-5" />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                    {editOptions.length < 10 && (
                                        <button
                                            type="button"
                                            onClick={addEditOption}
                                            className="w-full px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-gray-400 rounded-lg transition-colors text-sm"
                                        >
                                            + Add Option
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Edit Actions */}
                            <div className="flex gap-3">
                                <button
                                    onClick={handleCancelEdit}
                                    disabled={isSubmitting}
                                    className="flex-1 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg transition-colors disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveEdit}
                                    disabled={
                                        isSubmitting ||
                                        !editQuestion.trim() ||
                                        editOptions.filter((o) => o.trim()).length < 2
                                    }
                                    className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSubmitting ? 'Saving...' : 'Save & Reset Votes'}
                                </button>
                            </div>
                        </div>
                    )}

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
                                        showResults || isGuest || isSubmitting
                                            ? 'cursor-default'
                                            : 'cursor-pointer'
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
                                        <div className="flex items-center justify-between min-h-[28px]">
                                            <div className="flex items-center gap-3">
                                                {/* Selection indicator - always reserve space, hide when showing results */}
                                                <div
                                                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors shrink-0 ${
                                                        showResults
                                                            ? 'opacity-0'
                                                            : isSelected
                                                              ? 'border-pink-500 bg-pink-500'
                                                              : 'border-zinc-600'
                                                    }`}
                                                >
                                                    {isSelected && !showResults && (
                                                        <CheckCircleIcon className="w-4 h-4 text-white" />
                                                    )}
                                                </div>

                                                <span
                                                    className={`font-medium ${
                                                        isSelected ? 'text-pink-400' : 'text-white'
                                                    }`}
                                                >
                                                    {option.text}
                                                </span>
                                            </div>

                                            {/* Vote counts - always reserve space, hide when not showing results */}
                                            <div
                                                className={`flex items-center gap-3 shrink-0 transition-opacity ${
                                                    showResults ? 'opacity-100' : 'opacity-0'
                                                }`}
                                            >
                                                <span className="text-sm text-gray-400">
                                                    {option.votes}{' '}
                                                    {option.votes === 1 ? 'vote' : 'votes'}
                                                </span>
                                                <span className="text-lg font-bold text-white min-w-[3rem] text-right">
                                                    {percentage}%
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {/* Vote button for multi-choice polls */}
                    {!showResults && !isGuest && currentPoll.isMultipleChoice && (
                        <button
                            onClick={() => submitVote(selectedOptions)}
                            disabled={selectedOptions.length === 0 || isSubmitting}
                            className="w-full px-6 py-3 bg-pink-500 hover:bg-pink-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? 'Submitting...' : 'Submit Votes'}
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
            </div>
        </SubPageLayout>
    )
}

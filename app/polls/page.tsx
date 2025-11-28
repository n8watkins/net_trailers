'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import SubPageLayout from '@/components/layout/SubPageLayout'
import { PollCard } from '@/components/forum/PollCard'
import { useForumStore } from '@/stores/forumStore'
import { useSessionStore } from '@/stores/sessionStore'
import { ChartBarIcon, ArrowLeftIcon } from '@heroicons/react/24/outline'
import NetflixLoader from '@/components/common/NetflixLoader'

export default function MyPollsPage() {
    const router = useRouter()
    const { polls, isLoadingPolls, loadPolls, voteOnPoll } = useForumStore()
    const getUserId = useSessionStore((state) => state.getUserId)
    const userId = getUserId()
    const [userVotes, setUserVotes] = useState<Record<string, string[]>>({})

    useEffect(() => {
        loadPolls()
    }, [loadPolls])

    // Filter polls to only show user's own polls
    const myPolls = polls.filter((poll) => poll.userId === userId)

    const handleVote = async (pollId: string, optionIds: string[]) => {
        if (!userId) return
        try {
            await voteOnPoll(userId, pollId, optionIds)
            setUserVotes((prev) => ({ ...prev, [pollId]: optionIds }))
            await loadPolls()
        } catch (error) {
            console.error('Failed to vote:', error)
        }
    }

    return (
        <SubPageLayout title="My Polls" icon={<ChartBarIcon className="w-8 h-8 text-blue-500" />}>
            {/* Back to Profile Button */}
            <div className="mb-6">
                <button
                    onClick={() => router.push('/profile')}
                    className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                >
                    <ArrowLeftIcon className="w-5 h-5" />
                    <span>Back to Profile</span>
                </button>
            </div>

            {/* Loading State */}
            {isLoadingPolls && (
                <div className="flex justify-center py-20">
                    <NetflixLoader />
                </div>
            )}

            {/* Polls List */}
            {!isLoadingPolls && myPolls.length > 0 && (
                <div className="space-y-4">
                    {myPolls.map((poll) => (
                        <PollCard
                            key={poll.id}
                            poll={poll}
                            userVote={userVotes[poll.id] || []}
                            onVote={(pollId, optionIds) => handleVote(pollId, optionIds)}
                        />
                    ))}
                </div>
            )}

            {/* Empty State */}
            {!isLoadingPolls && myPolls.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-20 h-20 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700 mb-6">
                        <ChartBarIcon className="w-10 h-10 text-gray-600" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">No polls yet</h3>
                    <p className="text-gray-400 mb-6">You haven&apos;t created any polls yet.</p>
                    <button
                        onClick={() => router.push('/community/polls')}
                        className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors"
                    >
                        Create Your First Poll
                    </button>
                </div>
            )}
        </SubPageLayout>
    )
}

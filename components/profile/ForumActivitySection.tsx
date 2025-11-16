/**
 * Community Activity Section Component
 *
 * Displays user's community threads and polls
 * Used in both private profile and public profile pages
 */

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChatBubbleLeftRightIcon, ChartBarIcon } from '@heroicons/react/24/outline'
import { formatDistanceToNow } from 'date-fns'
import type { ThreadSummary, PollSummary } from '../../types/forum'

interface ForumActivitySectionProps {
    threads: ThreadSummary[]
    pollsCreated: PollSummary[]
    pollsVoted: PollSummary[]
    isLoadingVotedPolls?: boolean
}

export function ForumActivitySection({
    threads,
    pollsCreated,
    pollsVoted,
    isLoadingVotedPolls = false,
}: ForumActivitySectionProps) {
    const [activePollTab, setActivePollTab] = useState<'created' | 'voted'>('created')
    const activePolls = activePollTab === 'created' ? pollsCreated : pollsVoted
    const isLoadingActivePolls = activePollTab === 'voted' && isLoadingVotedPolls

    return (
        <section id="forum-section">
            <div className="flex items-center gap-2 mb-6">
                <ChatBubbleLeftRightIcon className="w-6 h-6 text-green-500" />
                <h2 className="text-2xl font-bold text-white">Community Activity</h2>
            </div>

            {/* Bento Grid Layout - Side by Side on Large Screens */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Threads Column */}
                <div className="bg-zinc-900/50 rounded-lg p-6 border border-zinc-800">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <ChatBubbleLeftRightIcon className="w-5 h-5 text-green-400" />
                            <h3 className="text-lg font-semibold text-white">Threads</h3>
                        </div>
                        {threads.length > 0 && (
                            <Link
                                href="/community/forums"
                                className="text-sm text-green-400 hover:text-green-300 underline"
                            >
                                View all {threads.length}
                            </Link>
                        )}
                    </div>
                    {threads.length > 0 ? (
                        <div className="space-y-3">
                            {threads.slice(0, 3).map((thread) => (
                                <Link
                                    key={thread.id}
                                    href={`/community/thread/${thread.id}`}
                                    className="group hover:bg-zinc-800/50 rounded-lg p-3 transition-colors cursor-pointer border border-transparent hover:border-zinc-700 block"
                                >
                                    <h4 className="text-white font-medium text-sm mb-1 line-clamp-1 group-hover:text-green-400 transition-colors">
                                        {thread.title}
                                    </h4>
                                    <p className="text-gray-400 text-xs line-clamp-1 mb-2">
                                        {thread.content}
                                    </p>
                                    <div className="flex items-center gap-3 text-xs text-gray-500">
                                        <span className="flex items-center gap-1">
                                            💬 {thread.replyCount}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            ❤️ {thread.likes}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            👁️ {thread.views}
                                        </span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-500 text-center py-8 text-sm">No threads yet</p>
                    )}
                </div>

                {/* Polls Column */}
                <div className="bg-zinc-900/50 rounded-lg p-6 border border-zinc-800">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <ChartBarIcon className="w-5 h-5 text-blue-400" />
                            <h3 className="text-lg font-semibold text-white">Polls</h3>
                        </div>
                        {(pollsCreated.length > 0 || pollsVoted.length > 0) && (
                            <Link
                                href="/polls"
                                className="text-sm text-blue-400 hover:text-blue-300 underline"
                            >
                                View all {pollsCreated.length + pollsVoted.length}
                            </Link>
                        )}
                    </div>

                    <div className="flex items-center justify-between mb-3">
                        <div className="inline-flex rounded-full bg-zinc-800/80 p-1 border border-zinc-700">
                            {[
                                { id: 'created', label: 'Created', count: pollsCreated.length },
                                { id: 'voted', label: 'Voted', count: pollsVoted.length },
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActivePollTab(tab.id as 'created' | 'voted')}
                                    className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${
                                        activePollTab === tab.id
                                            ? 'bg-blue-500 text-white'
                                            : 'text-gray-400 hover:text-white'
                                    }`}
                                >
                                    {tab.label} <span className="opacity-70">({tab.count})</span>
                                </button>
                            ))}
                        </div>
                        <span className="text-xs text-gray-400">
                            {activePollTab === 'created'
                                ? 'Polls you have published'
                                : 'Polls you recently voted on'}
                        </span>
                    </div>

                    {activePolls.length > 0 ? (
                        <div className="space-y-3">
                            {activePolls.slice(0, 3).map((poll) => (
                                <Link
                                    key={poll.id}
                                    href={`/community/polls/${poll.id}`}
                                    className="group hover:bg-zinc-800/50 rounded-lg p-3 transition-colors cursor-pointer border border-transparent hover:border-zinc-700 block"
                                >
                                    <h4 className="text-white font-medium text-sm mb-2 line-clamp-2 group-hover:text-blue-400 transition-colors">
                                        {poll.question}
                                    </h4>
                                    <div className="flex items-center justify-between text-xs text-gray-400">
                                        <span>{poll.options.length} options</span>
                                        <span>🗳️ {poll.totalVotes} votes</span>
                                    </div>
                                    {activePollTab === 'voted' && poll.votedAt && (
                                        <p className="text-[11px] text-gray-500 mt-1">
                                            Voted{' '}
                                            {formatDistanceToNow(new Date(poll.votedAt), {
                                                addSuffix: true,
                                            })}
                                        </p>
                                    )}
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-500 text-center py-8 text-sm">
                            {isLoadingActivePolls
                                ? 'Loading your poll activity...'
                                : activePollTab === 'created'
                                  ? 'No polls created yet'
                                  : 'No polls voted on yet'}
                        </p>
                    )}
                </div>
            </div>
        </section>
    )
}

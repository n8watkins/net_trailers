/**
 * Community Activity Section Component - Cinematic Edition
 *
 * Dashboard feed with two-column glassy panels:
 * - Threads panel with blue/purple theme
 * - Polls panel with pink theme
 * - Glowing section headers
 * - Hover animations on items
 * - Animated poll bars on interaction
 */

'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
    ChatBubbleLeftRightIcon,
    ChartBarIcon,
    HeartIcon,
    EyeIcon,
} from '@heroicons/react/24/outline'
import {
    ChatBubbleLeftRightIcon as ChatBubbleSolidIcon,
    ChartBarIcon as ChartBarSolidIcon,
} from '@heroicons/react/24/solid'
import { formatDistanceToNow } from 'date-fns'
import type { ThreadSummary, PollSummary } from '../../types/forum'

interface ForumActivitySectionProps {
    threads: ThreadSummary[]
    pollsCreated: PollSummary[]
    pollsVoted: PollSummary[]
    isLoadingVotedPolls?: boolean
    userId?: string // For public profile pages - links to /users/[userId]/threads and /users/[userId]/polls
}

export function ForumActivitySection({
    threads,
    pollsCreated,
    pollsVoted,
    isLoadingVotedPolls = false,
    userId,
}: ForumActivitySectionProps) {
    const [activePollTab, setActivePollTab] = useState<'created' | 'voted'>('created')
    const activePolls = activePollTab === 'created' ? pollsCreated : pollsVoted
    const isLoadingActivePolls = activePollTab === 'voted' && isLoadingVotedPolls

    return (
        <section id="forum-section" className="relative">
            {/* Section Header with glow */}
            <div className="flex items-center gap-3 mb-6">
                <div className="relative">
                    <div className="absolute inset-0 bg-green-500/30 blur-lg opacity-60" />
                    <ChatBubbleSolidIcon className="relative w-6 h-6 text-green-400 drop-shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white">Community Activity</h2>
            </div>

            {/* Two-Column Dashboard Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Threads Panel - Blue/Purple Theme */}
                <div className="relative group/panel">
                    {/* Panel glow */}
                    <div className="absolute -inset-1 bg-gradient-to-br from-blue-500/8 via-cyan-500/6 to-blue-500/8 rounded-2xl blur-xl opacity-60 group-hover/panel:opacity-100 transition-all duration-300" />

                    {/* Panel container */}
                    <div className="relative bg-gradient-to-br from-blue-950/20 via-zinc-900/80 to-cyan-950/20 backdrop-blur-lg rounded-xl overflow-hidden border border-blue-500/10 group-hover/panel:border-blue-500/20 transition-all duration-300 shadow-lg">
                        <div className="p-5 sm:p-6">
                            {/* Header */}
                            <div className="flex items-center justify-between mb-5">
                                <div className="flex items-center gap-3">
                                    <div className="relative">
                                        <div className="absolute inset-0 bg-blue-500/30 blur-lg opacity-60" />
                                        <ChatBubbleSolidIcon className="relative w-5 h-5 text-blue-400 drop-shadow-[0_0_6px_rgba(59,130,246,0.5)]" />
                                    </div>
                                    <h3 className="text-lg font-bold text-white">Threads</h3>
                                </div>
                                {threads.length > 0 && (
                                    <Link
                                        href={
                                            userId
                                                ? `/users/${userId}/threads`
                                                : '/community/threads'
                                        }
                                        className="group/link flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                                    >
                                        <span className="group-hover/link:underline">
                                            View all {threads.length}
                                        </span>
                                        <span className="text-blue-500/50 group-hover/link:translate-x-0.5 transition-transform">
                                            &rarr;
                                        </span>
                                    </Link>
                                )}
                            </div>

                            {/* Threads List */}
                            {threads.length > 0 ? (
                                <div className="space-y-2">
                                    {threads.slice(0, 3).map((thread, index) => (
                                        <Link
                                            key={thread.id}
                                            href={`/community/thread/${thread.id}`}
                                            className="group block relative transition-all duration-200 animate-fadeInUp"
                                            style={{
                                                animationDelay: `${index * 75}ms`,
                                                animationFillMode: 'both',
                                            }}
                                        >
                                            {/* Item glow on hover */}
                                            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-lg blur opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

                                            <div className="relative p-3 rounded-lg bg-zinc-900/30 border border-zinc-800/50 group-hover:border-blue-500/30 group-hover:bg-zinc-800/40 transition-all duration-200">
                                                <h4 className="text-white font-medium text-sm mb-1 line-clamp-1 group-hover:text-blue-300 transition-colors">
                                                    {thread.title}
                                                </h4>
                                                <p className="text-gray-500 text-xs line-clamp-1 mb-2">
                                                    {thread.content}
                                                </p>
                                                <div className="flex items-center gap-4 text-[11px] text-gray-500">
                                                    <span className="flex items-center gap-1 group-hover:text-blue-400 transition-colors">
                                                        <ChatBubbleLeftRightIcon className="w-3 h-3" />
                                                        {thread.replyCount}
                                                    </span>
                                                    <span className="flex items-center gap-1 group-hover:text-red-400 transition-colors">
                                                        <HeartIcon className="w-3 h-3" />
                                                        {thread.likes}
                                                    </span>
                                                    <span className="flex items-center gap-1 group-hover:text-cyan-400 transition-colors">
                                                        <EyeIcon className="w-3 h-3" />
                                                        {thread.views}
                                                    </span>
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-10 text-center">
                                    <div className="relative mb-3">
                                        <div className="absolute inset-0 bg-blue-500/20 blur-xl" />
                                        <div className="relative w-14 h-14 rounded-full bg-zinc-900/60 flex items-center justify-center border border-zinc-800/50">
                                            <ChatBubbleLeftRightIcon className="w-7 h-7 text-blue-900" />
                                        </div>
                                    </div>
                                    <p className="text-gray-500 text-sm">No threads yet</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Polls Panel - Pink Theme */}
                <div className="relative group/panel">
                    {/* Panel glow */}
                    <div className="absolute -inset-1 bg-gradient-to-br from-pink-500/8 via-rose-500/6 to-pink-500/8 rounded-2xl blur-xl opacity-60 group-hover/panel:opacity-100 transition-all duration-300" />

                    {/* Panel container */}
                    <div className="relative bg-gradient-to-br from-pink-950/20 via-zinc-900/80 to-rose-950/20 backdrop-blur-lg rounded-xl overflow-hidden border border-pink-500/10 group-hover/panel:border-pink-500/20 transition-all duration-300 shadow-lg">
                        <div className="p-5 sm:p-6">
                            {/* Header with Tab Switcher */}
                            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                                <div className="flex items-center gap-3">
                                    <div className="relative">
                                        <div className="absolute inset-0 bg-pink-500/30 blur-lg opacity-60" />
                                        <ChartBarSolidIcon className="relative w-5 h-5 text-pink-400 drop-shadow-[0_0_6px_rgba(236,72,153,0.5)]" />
                                    </div>
                                    <h3 className="text-lg font-bold text-white">Polls</h3>

                                    {/* Tab Switcher - Inline with title */}
                                    <div className="inline-flex rounded-full bg-zinc-900/60 backdrop-blur p-1 border border-zinc-800/50 ml-2">
                                        {[
                                            {
                                                id: 'created',
                                                label: 'Created',
                                                count: pollsCreated.length,
                                            },
                                            {
                                                id: 'voted',
                                                label: 'Voted',
                                                count: pollsVoted.length,
                                            },
                                        ].map((tab) => (
                                            <button
                                                key={tab.id}
                                                onClick={() =>
                                                    setActivePollTab(tab.id as 'created' | 'voted')
                                                }
                                                className={`relative px-3 py-1.5 text-xs font-bold rounded-full transition-all duration-200 ${
                                                    activePollTab === tab.id
                                                        ? 'bg-pink-500 text-white shadow-[0_0_12px_rgba(236,72,153,0.4)]'
                                                        : 'text-gray-400 hover:text-white'
                                                }`}
                                            >
                                                {tab.label}{' '}
                                                <span className="opacity-70">({tab.count})</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {(pollsCreated.length > 0 || pollsVoted.length > 0) && (
                                    <Link
                                        href={userId ? `/users/${userId}/polls` : '/profile/polls'}
                                        className="group/link flex items-center gap-2 text-xs text-pink-400 hover:text-pink-300 transition-colors"
                                    >
                                        <span className="group-hover/link:underline">
                                            View all {pollsCreated.length + pollsVoted.length}
                                        </span>
                                        <span className="text-pink-500/50 group-hover/link:translate-x-0.5 transition-transform">
                                            &rarr;
                                        </span>
                                    </Link>
                                )}
                            </div>

                            {/* Polls List */}
                            {activePolls.length > 0 ? (
                                <div className="space-y-2">
                                    {activePolls.slice(0, 3).map((poll, index) => (
                                        <Link
                                            key={poll.id}
                                            href={`/community/polls/${poll.id}`}
                                            className="group block relative transition-all duration-200 animate-fadeInUp"
                                            style={{
                                                animationDelay: `${index * 75}ms`,
                                                animationFillMode: 'both',
                                            }}
                                        >
                                            {/* Item glow on hover */}
                                            <div className="absolute -inset-0.5 bg-gradient-to-r from-pink-500/10 to-rose-500/10 rounded-lg blur opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

                                            <div className="relative p-3 rounded-lg bg-zinc-900/30 border border-zinc-800/50 group-hover:border-pink-500/30 group-hover:bg-zinc-800/40 transition-all duration-200">
                                                <h4 className="text-white font-medium text-sm mb-2 line-clamp-2 group-hover:text-pink-300 transition-colors leading-tight">
                                                    {poll.question}
                                                </h4>
                                                <div className="flex items-center justify-between text-[11px] text-gray-500">
                                                    <span className="group-hover:text-gray-400 transition-colors">
                                                        {poll.options.length} options
                                                    </span>
                                                    <span className="flex items-center gap-1 group-hover:text-pink-400 transition-colors">
                                                        <ChartBarIcon className="w-3 h-3" />
                                                        {poll.totalVotes} votes
                                                    </span>
                                                </div>
                                                {activePollTab === 'voted' && poll.votedAt && (
                                                    <p className="text-[10px] text-gray-600 mt-1.5 group-hover:text-gray-500 transition-colors">
                                                        Voted{' '}
                                                        {formatDistanceToNow(
                                                            new Date(poll.votedAt),
                                                            {
                                                                addSuffix: true,
                                                            }
                                                        )}
                                                    </p>
                                                )}
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-10 text-center">
                                    <div className="relative mb-3">
                                        <div className="absolute inset-0 bg-pink-500/20 blur-xl" />
                                        <div className="relative w-14 h-14 rounded-full bg-zinc-900/60 flex items-center justify-center border border-zinc-800/50">
                                            <ChartBarIcon className="w-7 h-7 text-pink-900" />
                                        </div>
                                    </div>
                                    <p className="text-gray-500 text-sm">
                                        {isLoadingActivePolls
                                            ? 'Loading...'
                                            : activePollTab === 'created'
                                              ? 'No polls created yet'
                                              : 'No polls voted on yet'}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

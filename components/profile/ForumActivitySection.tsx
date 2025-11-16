/**
 * Forum Activity Section Component
 *
 * Displays user's forum threads and polls
 * Used in both private profile and public profile pages
 */

import Link from 'next/link'
import { ChatBubbleLeftRightIcon, ChartBarIcon } from '@heroicons/react/24/outline'
import type { ThreadSummary, PollSummary } from '../../types/forum'

interface ForumActivitySectionProps {
    threads: ThreadSummary[]
    polls: PollSummary[]
}

export function ForumActivitySection({ threads, polls }: ForumActivitySectionProps) {
    return (
        <section id="forum-section">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <ChatBubbleLeftRightIcon className="w-6 h-6 text-green-500" />
                    <h2 className="text-2xl font-bold text-white">Forum Activity</h2>
                </div>
                <Link href="/community" className="text-sm text-blue-400 hover:text-blue-300">
                    Visit community
                </Link>
            </div>

            {/* Bento Grid Layout - Side by Side on Large Screens */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Threads Column */}
                <div className="bg-zinc-900/50 rounded-lg p-6 border border-zinc-800">
                    <div className="flex items-center gap-3 mb-4">
                        <ChatBubbleLeftRightIcon className="w-5 h-5 text-green-400" />
                        <h3 className="text-lg font-semibold text-white">Threads</h3>
                        <Link
                            href="/community/forums"
                            className="text-base text-green-400 hover:text-green-300 underline"
                        >
                            View all {threads.length}
                        </Link>
                    </div>
                    {threads.length > 0 ? (
                        <div className="space-y-3">
                            {threads.slice(0, 3).map((thread) => (
                                <Link
                                    key={thread.id}
                                    href={`/community/threads/${thread.id}`}
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
                    <div className="flex items-center gap-3 mb-4">
                        <ChartBarIcon className="w-5 h-5 text-blue-400" />
                        <h3 className="text-lg font-semibold text-white">Polls</h3>
                        <Link
                            href="/community/polls"
                            className="text-base text-blue-400 hover:text-blue-300 underline"
                        >
                            View all {polls.length}
                        </Link>
                    </div>
                    {polls.length > 0 ? (
                        <div className="space-y-3">
                            {polls.slice(0, 3).map((poll) => (
                                <Link
                                    key={poll.id}
                                    href={`/community/polls/${poll.id}`}
                                    className="group hover:bg-zinc-800/50 rounded-lg p-3 transition-colors cursor-pointer border border-transparent hover:border-zinc-700 block"
                                >
                                    <h4 className="text-white font-medium text-sm mb-2 line-clamp-2 group-hover:text-blue-400 transition-colors">
                                        {poll.question}
                                    </h4>
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-gray-400">
                                            {poll.options.length} options
                                        </span>
                                        <span className="text-gray-500">
                                            🗳️ {poll.totalVotes} votes
                                        </span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-500 text-center py-8 text-sm">No polls yet</p>
                    )}
                </div>
            </div>
        </section>
    )
}

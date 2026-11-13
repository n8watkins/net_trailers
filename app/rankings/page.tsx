/**
 * Rankings Dashboard Page
 *
 * Displays user's created rankings, comments, and liked rankings
 * Tab-based layout with search functionality
 */

'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import SubPageLayout from '../../components/layout/SubPageLayout'
import { RankingGrid } from '../../components/rankings/RankingGrid'
import { useRankingStore } from '../../stores/rankingStore'
import { useSessionStore } from '../../stores/sessionStore'
import { useAuthStatus } from '../../hooks/useAuthStatus'
import PageLoader from '../../components/common/PageLoader'
import { Ranking, RankingComment } from '../../types/rankings'
import { authenticatedFetch } from '../../lib/authenticatedFetch'
import { formatDistanceToNow } from 'date-fns'
import Link from '@/components/common/Link'
import { TrophyIcon, ChatBubbleLeftIcon, HeartIcon } from '@heroicons/react/24/outline'
import { TrashIcon, PlusIcon } from '@heroicons/react/24/solid'
import PageHeader from '../../components/layout/PageHeader'
import PageEmptyState, { emptyStateActionClass } from '../../components/layout/PageEmptyState'
import { FilterPills, ListSearchInput, ManageMenu } from '../../components/layout/PageToolbar'
import { useModalStore } from '../../stores/modalStore'

export default function RankingsPage() {
    const router = useRouter()
    const getUserId = useSessionStore((state) => state.getUserId)
    const userId = getUserId()
    const { isGuest, isInitialized } = useAuthStatus()
    const openAuthModal = useModalStore((state) => state.openAuthModal)

    const { rankings, isLoading, error, loadUserRankings } = useRankingStore()

    const [activeTab, setActiveTab] = useState<'rankings' | 'comments' | 'liked'>('rankings')
    const [userComments, setUserComments] = useState<RankingComment[]>([])
    const [likedRankings, setLikedRankings] = useState<Ranking[]>([])
    const [isLoadingComments, setIsLoadingComments] = useState(false)
    const [isLoadingLiked, setIsLoadingLiked] = useState(false)

    // Search states
    const [rankingsSearch, setRankingsSearch] = useState('')
    const [commentsSearch, setCommentsSearch] = useState('')
    const [likedSearch, setLikedSearch] = useState('')

    // Manage dropdown state
    const currentSearch =
        activeTab === 'rankings'
            ? rankingsSearch
            : activeTab === 'comments'
              ? commentsSearch
              : likedSearch
    const setCurrentSearch =
        activeTab === 'rankings'
            ? setRankingsSearch
            : activeTab === 'comments'
              ? setCommentsSearch
              : setLikedSearch

    // Load all data on mount
    useEffect(() => {
        // Rankings need an account; guests get a sign-in prompt instead of a 401
        if (isInitialized && userId && !isGuest) {
            // Load user rankings
            loadUserRankings(userId)

            // Load comments and liked rankings for authenticated users
            if (!isGuest) {
                // Load comments via API
                setIsLoadingComments(true)
                authenticatedFetch('/api/rankings/comments')
                    .then((res) => res.json())
                    .then((result: { success: boolean; data: RankingComment[] }) => {
                        if (result.success) setUserComments(result.data)
                    })
                    .catch(console.error)
                    .finally(() => setIsLoadingComments(false))

                // Load liked rankings via API
                setIsLoadingLiked(true)
                authenticatedFetch('/api/rankings?scope=liked')
                    .then((res) => res.json())
                    .then((result: { success: boolean; data: Ranking[] }) => {
                        if (result.success) setLikedRankings(result.data)
                    })
                    .catch(console.error)
                    .finally(() => setIsLoadingLiked(false))
            }
        }
    }, [isInitialized, userId, isGuest, loadUserRankings])

    const handleCreateNew = () => {
        if (isGuest) {
            openAuthModal('signin')
            return
        }
        router.push('/rankings/new')
    }

    const handleRankingClick = (rankingId: string) => {
        router.push(`/rankings/${rankingId}`)
    }

    // Filter rankings by search
    const filteredRankings = useMemo(() => {
        if (!rankingsSearch.trim()) return rankings

        const searchLower = rankingsSearch.toLowerCase()
        return rankings.filter(
            (ranking) =>
                ranking.title.toLowerCase().includes(searchLower) ||
                ranking.description?.toLowerCase().includes(searchLower) ||
                ranking.rankedItems.some((item) => {
                    const title = 'title' in item.content ? item.content.title : item.content.name
                    return title?.toLowerCase().includes(searchLower)
                })
        )
    }, [rankings, rankingsSearch])

    // Filter comments by search
    const filteredComments = useMemo(() => {
        if (!commentsSearch.trim()) return userComments

        const searchLower = commentsSearch.toLowerCase()
        return userComments.filter((comment) => comment.text.toLowerCase().includes(searchLower))
    }, [userComments, commentsSearch])

    // Filter liked rankings by search
    const filteredLikedRankings = useMemo(() => {
        if (!likedSearch.trim()) return likedRankings

        const searchLower = likedSearch.toLowerCase()
        return likedRankings.filter(
            (ranking) =>
                ranking.title.toLowerCase().includes(searchLower) ||
                ranking.description?.toLowerCase().includes(searchLower) ||
                ranking.userName?.toLowerCase().includes(searchLower) ||
                ranking.rankedItems.some((item) => {
                    const title = 'title' in item.content ? item.content.title : item.content.name
                    return title?.toLowerCase().includes(searchLower)
                })
        )
    }, [likedRankings, likedSearch])

    // Check if we should show search bar
    const showSearch =
        (activeTab === 'rankings' && rankings.length > 0) ||
        (activeTab === 'comments' && userComments.length > 0) ||
        (activeTab === 'liked' && likedRankings.length > 0)

    const hasAnything = rankings.length > 0 || userComments.length > 0 || likedRankings.length > 0
    const searchPlaceholder = `Search ${
        activeTab === 'rankings'
            ? 'your rankings'
            : activeTab === 'comments'
              ? 'your comments'
              : 'liked rankings'
    }...`

    return (
        <SubPageLayout hideHeader>
            <div className="space-y-6">
                <PageHeader
                    title="My Rankings"
                    icon={<TrophyIcon />}
                    actions={
                        !isGuest && (
                            <>
                                <button
                                    type="button"
                                    onClick={handleCreateNew}
                                    className="inline-flex h-9 items-center gap-2 rounded-full bg-amber-500 px-4 text-sm font-semibold text-zinc-950 transition-colors hover:bg-amber-400"
                                >
                                    <PlusIcon className="h-4 w-4" />
                                    New ranking
                                </button>
                                {hasAnything && (
                                    <ManageMenu
                                        items={[
                                            {
                                                label: 'Clear data',
                                                icon: TrashIcon,
                                                danger: true,
                                                onSelect: () => router.push('/settings/account'),
                                            },
                                        ]}
                                    />
                                )}
                            </>
                        )
                    }
                >
                    {!isGuest && hasAnything && (
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <FilterPills<'rankings' | 'comments' | 'liked'>
                                label="Show"
                                value={activeTab}
                                onChange={setActiveTab}
                                options={[
                                    {
                                        value: 'rankings',
                                        label: (
                                            <>
                                                <TrophyIcon className="h-4 w-4" />
                                                Your rankings
                                            </>
                                        ),
                                    },
                                    {
                                        value: 'comments',
                                        label: (
                                            <>
                                                <ChatBubbleLeftIcon className="h-4 w-4" />
                                                Comments
                                            </>
                                        ),
                                    },
                                    {
                                        value: 'liked',
                                        label: (
                                            <>
                                                <HeartIcon className="h-4 w-4" />
                                                Liked
                                            </>
                                        ),
                                    },
                                ]}
                            />
                            {showSearch && (
                                <ListSearchInput
                                    key={activeTab}
                                    value={currentSearch}
                                    onChange={setCurrentSearch}
                                    placeholder={searchPlaceholder}
                                    voiceSourceId={`rankings-${activeTab}-search`}
                                />
                            )}
                        </div>
                    )}
                </PageHeader>

                {isGuest && (
                    <PageEmptyState
                        icon={<TrophyIcon />}
                        title="Sign in to make rankings"
                        description="Rank your favourite movies and shows, share the list, and see what others think."
                        action={
                            <button
                                type="button"
                                onClick={() => openAuthModal('signin')}
                                className={emptyStateActionClass}
                            >
                                Sign in
                            </button>
                        }
                    />
                )}

                {!isGuest && error && (
                    <div className="max-w-2xl rounded-xl border border-red-700/60 bg-red-900/20 p-4">
                        <p className="text-red-400">{error}</p>
                    </div>
                )}

                {!isGuest && !isLoading && !hasAnything && !error && (
                    <PageEmptyState
                        icon={<TrophyIcon />}
                        title="No rankings yet"
                        description="Pick a handful of titles and put them in order. Your rankings, comments and likes show up here."
                        action={
                            <button
                                type="button"
                                onClick={handleCreateNew}
                                className={emptyStateActionClass}
                            >
                                Create a ranking
                            </button>
                        }
                    />
                )}

                {!isGuest && (isLoading || hasAnything) && activeTab === 'rankings' && (
                    <RankingGrid
                        rankings={filteredRankings}
                        isLoading={isLoading}
                        emptyMessage={
                            rankingsSearch.trim()
                                ? 'No rankings match your search.'
                                : 'No rankings yet. Create your first ranking to get started!'
                        }
                        showAuthor={false}
                        onLike={handleRankingClick}
                    />
                )}

                {!isGuest && hasAnything && activeTab === 'comments' && (
                    <>
                        {isLoadingComments ? (
                            <div className="py-16">
                                <PageLoader inline={true} message="Loading comments..." />
                            </div>
                        ) : filteredComments.length === 0 ? (
                            <p className="py-12 text-center text-gray-400">
                                {commentsSearch.trim()
                                    ? 'No comments match your search.'
                                    : 'Comments you leave on rankings show up here.'}
                            </p>
                        ) : (
                            <div className="max-w-4xl space-y-4">
                                {filteredComments.map((comment, index) => (
                                    <Link
                                        key={comment.id}
                                        href={`/rankings/${comment.rankingId}`}
                                        className="block animate-fadeInUp rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 transition-colors hover:border-amber-500/40"
                                        style={{
                                            animationDelay: `${Math.min(index * 50, 500)}ms`,
                                            animationFillMode: 'both',
                                        }}
                                    >
                                        <div className="mb-2 flex items-start justify-between">
                                            <span className="text-sm text-gray-500">
                                                {formatDistanceToNow(comment.createdAt, {
                                                    addSuffix: true,
                                                })}
                                            </span>
                                            <span className="flex items-center gap-1 text-sm text-gray-500">
                                                <HeartIcon className="h-4 w-4" />
                                                {comment.likes}
                                            </span>
                                        </div>
                                        <p className="text-white">{comment.text}</p>
                                        <div className="mt-2 text-sm text-amber-400">
                                            View ranking →
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </>
                )}

                {!isGuest && hasAnything && activeTab === 'liked' && (
                    <>
                        {isLoadingLiked ? (
                            <div className="py-16">
                                <PageLoader inline={true} message="Loading liked rankings..." />
                            </div>
                        ) : (
                            <RankingGrid
                                rankings={filteredLikedRankings}
                                isLoading={isLoadingLiked}
                                emptyMessage={
                                    likedSearch.trim()
                                        ? 'No liked rankings match your search.'
                                        : 'Rankings you like show up here.'
                                }
                                showAuthor={true}
                                onLike={handleRankingClick}
                            />
                        )}
                    </>
                )}

                {/* Add keyframe animations */}
                <style jsx>{`
                    @keyframes fadeInUp {
                        from {
                            opacity: 0;
                            transform: translateY(20px);
                        }
                        to {
                            opacity: 1;
                            transform: translateY(0);
                        }
                    }

                    :global(.animate-fadeInUp) {
                        animation: fadeInUp 0.5s ease-out;
                    }
                `}</style>
            </div>
        </SubPageLayout>
    )
}

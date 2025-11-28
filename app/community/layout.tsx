'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import SubPageLayout from '@/components/layout/SubPageLayout'
import RankingsContent from '@/components/community/RankingsContent'
import ThreadsContent from '@/components/community/ThreadsContent'
import PollsContent from '@/components/community/PollsContent'
import {
    TrophyIcon,
    UsersIcon,
    ChatBubbleLeftRightIcon,
    ChartBarIcon,
} from '@heroicons/react/24/outline'

type TabType = 'rankings' | 'threads' | 'polls'

export default function CommunityLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()

    // Check if we're on a detail page (thread/[id] or polls/[id])
    const isDetailPage =
        /\/community\/thread\/[^/]+$/.test(pathname || '') ||
        /\/community\/threads\/[^/]+$/.test(pathname || '') ||
        /\/community\/polls\/[^/]+$/.test(pathname || '')

    // Determine initial tab from pathname
    const getTabFromPath = (): TabType => {
        if (pathname?.includes('/thread') || pathname?.includes('/threads')) return 'threads'
        if (pathname?.includes('/polls')) return 'polls'
        return 'rankings'
    }

    // Use local state for instant tab switching (no navigation delay)
    const [activeTab, setActiveTab] = useState<TabType>(getTabFromPath)

    // Sync URL when tab changes (shallow update, no full reload) - only on list pages
    useEffect(() => {
        if (isDetailPage) return // Don't update URL on detail pages
        const currentTabFromPath = getTabFromPath()
        if (activeTab !== currentTabFromPath) {
            // Update URL without triggering navigation/reload
            window.history.replaceState(null, '', `/community/${activeTab}`)
        }
    }, [activeTab, isDetailPage])

    // Sync tab state if user navigates via browser back/forward
    useEffect(() => {
        setActiveTab(getTabFromPath())
    }, [pathname])

    const handleTabClick = (tab: TabType) => {
        if (tab === activeTab) return
        setActiveTab(tab)
        // Scroll to top when switching tabs
        window.scrollTo({ top: 0, behavior: 'instant' })
    }

    // Scroll to top when navigating to community pages
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'instant' })
    }, [pathname])

    // On detail pages, render children (the detail page component)
    if (isDetailPage) {
        return <>{children}</>
    }

    return (
        <SubPageLayout
            title="Community Hub"
            icon={<UsersIcon className="w-8 h-8" />}
            iconColor="text-yellow-500"
        >
            {/* Description */}
            <div className="mb-6 text-center">
                <p className="text-gray-300 max-w-2xl mx-auto text-lg">
                    Connect, discuss, and share your passion for movies and TV shows
                </p>
            </div>

            {/* Tabs Navigation - Larger Title-Style Toggle */}
            <div className="mb-8">
                <div className="flex justify-center">
                    <div className="inline-flex gap-2 bg-zinc-900 p-2 rounded-xl border-2 border-zinc-800 shadow-xl">
                        {[
                            {
                                id: 'rankings' as TabType,
                                label: 'Rankings',
                                icon: TrophyIcon,
                                color: 'text-yellow-500',
                            },
                            {
                                id: 'threads' as TabType,
                                label: 'Threads',
                                icon: ChatBubbleLeftRightIcon,
                                color: 'text-blue-500',
                            },
                            {
                                id: 'polls' as TabType,
                                label: 'Polls',
                                icon: ChartBarIcon,
                                color: 'text-pink-500',
                            },
                        ].map((tab) => {
                            const Icon = tab.icon
                            const isActive = activeTab === tab.id

                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => handleTabClick(tab.id)}
                                    className={`relative px-8 py-4 rounded-xl font-bold text-xl transition-all duration-200 ${
                                        isActive
                                            ? 'bg-zinc-800 text-white shadow-lg scale-105'
                                            : 'text-gray-400 hover:text-gray-200 hover:bg-zinc-800/50 hover:scale-102'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <Icon className={`w-7 h-7 ${isActive ? tab.color : ''}`} />
                                        <span>{tab.label}</span>
                                    </div>
                                </button>
                            )
                        })}
                    </div>
                </div>
            </div>

            {/* Tab Content - client-side switching, no navigation */}
            {activeTab === 'rankings' && <RankingsContent />}
            {activeTab === 'threads' && <ThreadsContent />}
            {activeTab === 'polls' && <PollsContent />}
        </SubPageLayout>
    )
}

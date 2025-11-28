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
        <SubPageLayout>
            {/* Tab Content - client-side switching, no navigation */}
            {activeTab === 'rankings' && <RankingsContent />}
            {activeTab === 'threads' && <ThreadsContent />}
            {activeTab === 'polls' && <PollsContent />}
        </SubPageLayout>
    )
}

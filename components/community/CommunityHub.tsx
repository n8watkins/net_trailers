/**
 * Community Page - Reimagined with Cinematic Tabs
 *
 * Features:
 * - Rankings Tab: Public rankings from all users (now with cinematic design)
 * - Threads Tab: Discussion threads and community conversations
 * - Polls Tab: Community polls and voting
 */

'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import SubPageLayout from '@/components/layout/SubPageLayout'
import { useRankingStore } from '@/stores/rankingStore'
import { useAuthStatus } from '@/hooks/useAuthStatus'
import NetflixLoader from '@/components/common/NetflixLoader'
import { useForumStore } from '@/stores/forumStore'
import { UsersIcon } from '@heroicons/react/24/outline'
import RankingsContent from './RankingsContent'
import ThreadsContent from './ThreadsContent'
import PollsContent from './PollsContent'

export type TabType = 'rankings' | 'threads' | 'polls' | 'forums'

interface CommunityHubProps {
    activeTab: TabType
}

export default function CommunityHub({ activeTab }: CommunityHubProps) {
    const router = useRouter()
    const { isInitialized } = useAuthStatus()
    const { loadCommunityRankings } = useRankingStore()
    const { loadThreads, loadPolls } = useForumStore()

    // Preload data for better UX
    useEffect(() => {
        if (isInitialized) {
            // Preload data for all tabs
            loadCommunityRankings(20)
            loadThreads()
            loadPolls()
        }
    }, [isInitialized, loadCommunityRankings, loadThreads, loadPolls])

    // Show initial loading state only before auth is initialized
    if (!isInitialized) {
        return (
            <SubPageLayout
                title="Community"
                icon={<UsersIcon className="w-8 h-8" />}
                iconColor="text-yellow-500"
            >
                <NetflixLoader />
            </SubPageLayout>
        )
    }

    // Render the appropriate content based on active tab
    // Each content component handles its own header and styling
    return (
        <SubPageLayout title="" icon={null} iconColor="" hideHeader={true}>
            {activeTab === 'rankings' && <RankingsContent />}
            {activeTab === 'threads' && <ThreadsContent />}
            {activeTab === 'polls' && <PollsContent />}
        </SubPageLayout>
    )
}

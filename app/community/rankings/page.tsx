import type { Metadata } from 'next'
import { COMMUNITY_TITLES } from '@/lib/communityTitles'

export const metadata: Metadata = { title: COMMUNITY_TITLES.rankings }

// Content is rendered by the layout with client-side tab switching
// This page file exists only for routing purposes
export default function CommunityRankingsPage() {
    return null
}

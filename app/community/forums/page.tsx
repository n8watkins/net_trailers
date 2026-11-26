import type { Metadata } from 'next'
import { COMMUNITY_TITLES } from '@/lib/communityTitles'

export const metadata: Metadata = { title: COMMUNITY_TITLES.threads }

// Content is rendered by the layout with client-side tab switching.
// This address is the older name of the Threads tab (see getTabFromPath in the layout).
export default function CommunityForumsPage() {
    return null
}

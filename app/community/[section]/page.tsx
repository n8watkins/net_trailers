import { notFound } from 'next/navigation'
import CommunityHub from '@/components/community/CommunityHub'

const VALID_SECTIONS = new Set(['rankings', 'forums', 'polls'])

interface CommunitySectionPageProps {
    params: {
        section: string
    }
}

export default function CommunitySectionPage({ params }: CommunitySectionPageProps) {
    if (!VALID_SECTIONS.has(params.section)) {
        notFound()
    }

    return <CommunityHub />
}

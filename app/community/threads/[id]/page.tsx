'use server'

import { redirect } from 'next/navigation'

interface LegacyThreadRedirectProps {
    params: {
        id: string
    }
}

export default function LegacyThreadRedirect({ params }: LegacyThreadRedirectProps) {
    redirect(`/community/thread/${params.id}`)
}

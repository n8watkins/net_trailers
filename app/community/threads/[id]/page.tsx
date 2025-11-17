'use server'

import { redirect } from 'next/navigation'

interface LegacyThreadRedirectProps {
    params: {
        id: string
    }
}

export default async function LegacyThreadRedirect({ params }: LegacyThreadRedirectProps) {
    redirect(`/community/thread/${params.id}`)
}

/**
 * Community Page
 *
 * Main community hub displaying public rankings and community content
 */

'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStatus } from '../../hooks/useAuthStatus'

export default function CommunityPage() {
    const router = useRouter()
    const { isInitialized } = useAuthStatus()

    // Redirect to community rankings page
    useEffect(() => {
        if (isInitialized) {
            router.replace('/rankings/community')
        }
    }, [isInitialized, router])

    return null
}

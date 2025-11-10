/**
 * Watch List Page
 *
 * Redirects to the collections page with the Watch Later collection selected
 */

'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function WatchListPage() {
    const router = useRouter()

    useEffect(() => {
        // Redirect to collections page - the collections page will automatically
        // select the "Watch Later" collection by default
        router.replace('/collections')
    }, [router])

    return null
}

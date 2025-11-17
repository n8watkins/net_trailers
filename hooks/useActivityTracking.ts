/**
 * Activity Tracking Hook
 *
 * Tracks page views and user activity for analytics
 */

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useSessionStore } from '@/stores/sessionStore'

/**
 * Track page views automatically
 * Call this hook in the root layout to track all page views
 */
export function usePageViewTracking() {
    const pathname = usePathname()
    const getUserId = useSessionStore((state) => state.getUserId)
    const sessionType = useSessionStore((state) => state.sessionType)

    useEffect(() => {
        const trackPageView = async () => {
            const userId = getUserId()
            const isAuth = sessionType === 'authenticated'

            try {
                await fetch('/api/admin/activity', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'view',
                        userId: isAuth ? userId : null,
                        guestId: !isAuth ? userId : null,
                        page: pathname,
                        userAgent: navigator.userAgent,
                    }),
                })
            } catch (error) {
                console.error('Failed to record page view:', error)
                // Don't fail page load if activity recording fails
            }
        }

        // Track page view on route change
        trackPageView()
    }, [pathname, getUserId, sessionType])
}

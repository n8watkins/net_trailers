/**
 * Activity Tracking Hook
 *
 * Tracks page views and user activity for analytics
 */

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useSessionStore } from '@/stores/sessionStore'
import { auth } from '@/firebase'

/**
 * Track page views automatically
 * Call this hook in the root layout to track all page views
 */
export function usePageViewTracking() {
    const pathname = usePathname()
    const getUserId = useSessionStore((state) => state.getUserId)
    const sessionType = useSessionStore((state) => state.sessionType)
    const isInitialized = useSessionStore((state) => state.isInitialized)

    useEffect(() => {
        const trackPageView = async () => {
            // Don't track admin pages
            if (pathname.startsWith('/admin')) {
                return
            }

            // Wait for session to initialize
            if (!isInitialized || sessionType === 'initializing') {
                return
            }

            const userId = getUserId()
            const isAuth = sessionType === 'authenticated'

            // Don't track if we don't have a user ID
            if (!userId) {
                return
            }

            // Get user email if authenticated
            const userEmail = isAuth && auth.currentUser ? auth.currentUser.email : null

            try {
                await fetch('/api/admin/activity', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'view',
                        userId: isAuth ? userId : null,
                        guestId: !isAuth ? userId : null,
                        userEmail: userEmail,
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
    }, [pathname, getUserId, sessionType, isInitialized])
}

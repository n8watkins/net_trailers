/**
 * Activity Tracking Hook
 *
 * Tracks page views and user activity for analytics.
 *
 * Auth note: previously read `auth.currentUser.email` from the Firebase SDK to
 * include in the activity payload. Auth.js (NextAuth) now manages identity
 * server-side, so the email is resolved by the API route from the session
 * cookie rather than being supplied by the client.
 */

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useSessionStore } from '@/stores/sessionStore'

/**
 * Track page views automatically.
 * Call this hook in the root layout to track all page views.
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

            // Only signed-in page views are stored (user_activity rows belong to a
            // user), so guests send nothing instead of a request that does nothing.
            if (!userId || sessionType !== 'authenticated') {
                return
            }

            try {
                await fetch('/api/admin/activity', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    // userEmail is intentionally omitted: the server resolves it
                    // from the Auth.js session cookie when needed.
                    body: JSON.stringify({
                        type: 'view',
                        userId,
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

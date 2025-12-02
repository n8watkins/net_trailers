/**
 * Custom hook for profile actions
 *
 * Handles seeding of profile data
 */

import { seedUserData } from '../utils/seed'
import { useSessionStore } from '../stores/sessionStore'
import { useDebugOperationsStore } from '../stores/debugOperationsStore'

export function useProfileActions() {
    const { isSeeding, setSeeding, canStartSeeding } = useDebugOperationsStore()

    /**
     * Client-side seed (original behavior)
     * This will be interrupted if user navigates away
     */
    const handleSeedData = async () => {
        // Check if we can start seeding (mutual exclusion with clearing)
        if (!canStartSeeding()) {
            console.warn('[useProfileActions] Cannot seed data - operation already in progress')
            return
        }

        const getUserId = useSessionStore.getState().getUserId
        const userId = getUserId()

        if (!userId) {
            console.error('[useProfileActions] No user ID found')
            return
        }

        setSeeding(true)
        try {
            await seedUserData(userId, {
                likedCount: 15,
                hiddenCount: 8,
                watchLaterCount: 12,
                watchHistoryCount: 75,
                createCollections: true,
                notificationCount: 8,
                threadCount: 5, // Seed forum threads
                pollCount: 4, // Seed forum polls
            })
            setSeeding(false)
        } catch (error) {
            console.error('[useProfileActions] Failed to seed data:', error)
            setSeeding(false)
        }
    }

    /**
     * Server-side seed (background)
     * Continues running even if user navigates away
     * Only works for authenticated users (not guests)
     */
    const handleSeedDataServerSide = async () => {
        // Check if we can start seeding (mutual exclusion with clearing)
        if (!canStartSeeding()) {
            console.warn('[useProfileActions] Cannot seed data - operation already in progress')
            return
        }

        const getUserId = useSessionStore.getState().getUserId
        const userId = getUserId()
        const sessionType = useSessionStore.getState().sessionType

        if (!userId) {
            console.error('[useProfileActions] No user ID found')
            return
        }

        // Only authenticated users can use server-side seeding
        if (sessionType === 'guest' || userId.startsWith('guest_')) {
            console.warn('[useProfileActions] Guest users must use client-side seeding')
            // Fall back to client-side seeding for guests
            return handleSeedData()
        }

        setSeeding(true)
        try {
            // Get profile data for seeding rankings
            const { useProfileStore } = await import('../stores/profileStore')
            const profile = useProfileStore.getState().profile

            const response = await fetch('/api/seed', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    options: {
                        likedCount: 15,
                        hiddenCount: 8,
                        watchLaterCount: 12,
                        watchHistoryCount: 75,
                        createCollections: true,
                        rankingCount: 3,
                        notificationCount: 8,
                        threadCount: 5,
                        pollCount: 4,
                        userName: profile?.displayName || 'User',
                        userAvatar: profile?.avatarUrl,
                    },
                }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to start seed')
            }

            console.log('[useProfileActions] Server-side seed started:', data.message)

            // Set seeding to false immediately since it's running in background
            setSeeding(false)

            // Reload data after a delay to show the seeded data
            setTimeout(() => {
                console.log('[useProfileActions] Reloading data to show seeded content...')
                window.location.reload()
            }, 5000) // Increased to 5s to give rankings time to seed
        } catch (error) {
            console.error('[useProfileActions] Failed to start server-side seed:', error)
            setSeeding(false)
        }
    }

    return {
        isSeeding,
        handleSeedData, // Client-side (can be interrupted)
        handleSeedDataServerSide, // Server-side (continues in background)
    }
}

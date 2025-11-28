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
                watchHistoryCount: 20,
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

    return {
        isSeeding,
        handleSeedData,
    }
}

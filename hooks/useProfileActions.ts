/**
 * Custom hook for profile actions
 *
 * Handles seeding of profile data
 */

import { useState } from 'react'
import { seedUserData } from '../utils/seed'
import { useSessionStore } from '../stores/sessionStore'

export function useProfileActions() {
    const [isSeeding, setIsSeeding] = useState(false)

    const handleSeedData = async () => {
        const getUserId = useSessionStore.getState().getUserId
        const userId = getUserId()

        if (!userId) {
            console.error('[useProfileActions] No user ID found')
            return
        }

        setIsSeeding(true)
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
            setIsSeeding(false)
        } catch (error) {
            console.error('[useProfileActions] Failed to seed data:', error)
            setIsSeeding(false)
        }
    }

    return {
        isSeeding,
        handleSeedData,
    }
}

/**
 * Custom hook for profile actions
 *
 * Handles seeding and deletion of profile data
 */

import { useState } from 'react'
import { seedUserData } from '../utils/seedData'
import { useSessionStore } from '../stores/sessionStore'
import useUserData from './useUserData'

export function useProfileActions() {
    const [isSeeding, setIsSeeding] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const userData = useUserData()

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
            })
            setIsSeeding(false)
        } catch (error) {
            console.error('[useProfileActions] Failed to seed data:', error)
            setIsSeeding(false)
        }
    }

    const handleQuickDelete = async () => {
        if (!confirm('🗑️ Delete all data? This will clear everything for the current session.')) {
            return
        }

        setIsDeleting(true)
        try {
            console.log('[useProfileActions] 🗑️ Starting quick delete...')
            await userData.clearAccountData()
            console.log('[useProfileActions] ✅ Quick delete completed')

            setIsDeleting(false)
        } catch (error) {
            console.error('[useProfileActions] ❌ Failed to delete data:', error)
            alert('Failed to delete data. Please try again or use Settings > Clear All Data.')
            setIsDeleting(false)
        }
    }

    return {
        isSeeding,
        isDeleting,
        handleSeedData,
        handleQuickDelete,
    }
}

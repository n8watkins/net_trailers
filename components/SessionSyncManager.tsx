import { useEffect } from 'react'
import { useSessionStore } from '../stores/sessionStore'
import { useAuthStore } from '../stores/authStore'
import { useGuestStore } from '../stores/guestStore'
import useAuth from '../hooks/useAuth'
import { GuestStorageService } from '../services/guestStorageService'

/**
 * Centralized session sync manager - ensures Firebase sync happens only ONCE
 * This component should be mounted once at the app root level
 */
export function SessionSyncManager() {
    const { user } = useAuth()
    const {
        sessionType,
        activeSessionId,
        isInitialized,
        initializeGuestSession,
        initializeAuthSession,
        switchToGuest,
        switchToAuth,
    } = useSessionStore()

    const authStore = useAuthStore()
    const guestStore = useGuestStore()

    // Initialize session on mount
    useEffect(() => {
        if (!isInitialized) {
            console.log('🚀 [SessionSyncManager] Initializing session...')
            if (user) {
                console.log('🔐 [SessionSyncManager] User authenticated, initializing auth session')
                initializeAuthSession(user.uid)
            } else {
                console.log('👤 [SessionSyncManager] No auth, initializing guest session')
                initializeGuestSession()
            }
        }
    }, [isInitialized, user, initializeAuthSession, initializeGuestSession])

    // Handle auth state changes
    useEffect(() => {
        if (!isInitialized) return

        const shouldBeAuth = !!user
        const currentlyAuth = sessionType === 'authenticated'

        if (currentlyAuth !== shouldBeAuth) {
            console.log('🔄 [SessionSyncManager] Auth state changed, switching session...', {
                currentlyAuth,
                shouldBeAuth,
                userId: user?.uid,
            })

            if (shouldBeAuth && user) {
                // Clear auth store first if switching users
                if (activeSessionId !== user.uid) {
                    authStore.clearLocalCache()
                }
                switchToAuth(user.uid)
            } else {
                // Clear auth store when logging out
                authStore.clearLocalCache()
                switchToGuest()
            }
        }
    }, [isInitialized, sessionType, user, activeSessionId, switchToAuth, switchToGuest])

    // Sync data when session changes
    useEffect(() => {
        if (!isInitialized) return

        if (sessionType === 'authenticated' && user) {
            // Check if we need to sync with Firebase
            if (authStore.userId !== user.uid && authStore.syncStatus === 'idle') {
                console.log('📥 [SessionSyncManager] Syncing auth data for:', user.uid)
                authStore.syncWithFirebase(user.uid)
            }
        } else if (sessionType === 'guest') {
            // Load guest data if not already loaded
            if (!guestStore.lastActive) {
                console.log('📥 [SessionSyncManager] Loading guest data...')
                const guestData = GuestStorageService.loadGuestData(activeSessionId)
                guestStore.loadData(guestData)
            }
        }
    }, [isInitialized, sessionType, activeSessionId, user])

    // This component doesn't render anything
    return null
}

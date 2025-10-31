import { useEffect } from 'react'
import { useSessionStore } from '../stores/sessionStore'
import { useAuthStore } from '../stores/authStore'
import { useGuestStore } from '../stores/guestStore'
import useAuth from '../hooks/useAuth'
import { getCachedUserId } from '../utils/authCache'

/**
 * Centralized session sync manager - ensures Firebase sync happens only ONCE
 * This component should be mounted once at the app root level
 */
export function SessionSyncManager() {
    const { user, loading: authLoading, wasRecentlyAuthenticated } = useAuth()
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

    // OPTIMISTIC INITIALIZATION: If we have cached auth, initialize immediately
    // This prevents showing loading screen when we're confident user is logged in
    useEffect(() => {
        if (!isInitialized && wasRecentlyAuthenticated && authLoading) {
            const cachedUserId = getCachedUserId()
            if (cachedUserId) {
                console.log(
                    '⚡ [SessionSyncManager] OPTIMISTIC: Initializing auth session from cache:',
                    cachedUserId
                )
                initializeAuthSession(cachedUserId)
            }
        }
    }, [isInitialized, wasRecentlyAuthenticated, authLoading, initializeAuthSession])

    // Initialize session on mount - BUT WAIT for auth to complete first
    useEffect(() => {
        // Don't initialize until auth check is complete
        if (authLoading) {
            console.log('⏳ [SessionSyncManager] Waiting for auth check to complete...')
            return
        }

        if (!isInitialized) {
            console.log('🚀 [SessionSyncManager] Auth check complete, initializing session...')
            if (user) {
                console.log('🔐 [SessionSyncManager] User authenticated, initializing auth session')
                initializeAuthSession(user.uid)
            } else {
                console.log('👤 [SessionSyncManager] No auth, initializing guest session')
                initializeGuestSession()
            }
        }
    }, [authLoading, isInitialized, user, initializeAuthSession, initializeGuestSession])

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
        console.log('🔍 [SessionSyncManager] Sync effect triggered:', {
            isInitialized,
            sessionType,
            activeSessionId,
            hasUser: !!user,
            guestStoreId: guestStore.guestId,
        })

        if (!isInitialized) {
            console.log('⏸️ [SessionSyncManager] Not initialized yet, skipping sync')
            return
        }

        if (sessionType === 'authenticated' && user) {
            // Check if we need to sync with Firebase
            if (authStore.userId !== user.uid && authStore.syncStatus === 'offline') {
                console.log('📥 [SessionSyncManager] Syncing auth data for:', user.uid)
                authStore.syncWithFirebase(user.uid)
            }
        } else if (sessionType === 'guest') {
            // FIXED: Sync guest data from localStorage using the correct guestId
            // Check if we need to load/sync data (either no data or wrong session)
            const needsSync = !guestStore.guestId || guestStore.guestId !== activeSessionId
            console.log('🔍 [SessionSyncManager] Guest session check:', {
                needsSync,
                guestStoreId: guestStore.guestId,
                activeSessionId,
                condition1: !guestStore.guestId,
                condition2: guestStore.guestId !== activeSessionId,
            })

            if (needsSync) {
                console.log('📥 [SessionSyncManager] Syncing guest data from localStorage...', {
                    activeSessionId,
                    currentGuestId: guestStore.guestId,
                })
                guestStore.syncFromLocalStorage(activeSessionId)
            } else {
                console.log('✅ [SessionSyncManager] Guest data already synced, skipping')
            }
        }
    }, [isInitialized, sessionType, activeSessionId, user])

    // This component doesn't render anything
    return null
}

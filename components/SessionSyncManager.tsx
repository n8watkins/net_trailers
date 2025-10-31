import { useEffect } from 'react'
import { useSessionStore } from '../stores/sessionStore'
import { useAuthStore } from '../stores/authStore'
import { useGuestStore } from '../stores/guestStore'
import useAuth from '../hooks/useAuth'
import { getCachedUserId } from '../utils/authCache'
import { authLog } from '../utils/authLogger'

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

    // CRITICAL: Check cache directly (synchronous) to avoid guest mode flicker
    // This runs immediately on mount, before any async state updates
    useEffect(() => {
        if (!isInitialized && authLoading) {
            // Check cache DIRECTLY (not through state which updates async)
            const cachedUserId = getCachedUserId()
            if (cachedUserId) {
                authLog(
                    '⚡ [SessionSyncManager] OPTIMISTIC: Initializing auth session from cache:',
                    cachedUserId
                )
                initializeAuthSession(cachedUserId)
                return // Exit early, we've initialized
            }
        }
    }, [isInitialized, authLoading, initializeAuthSession])

    // Initialize session based on Firebase auth result
    useEffect(() => {
        // If still loading, wait (unless we already initialized optimistically above)
        if (authLoading) {
            // Check if we already initialized optimistically
            if (isInitialized) {
                authLog(
                    '⏳ [SessionSyncManager] Already initialized, waiting for Firebase confirmation...'
                )
            } else {
                // Check cache again to avoid initializing guest mode prematurely
                const cachedUserId = getCachedUserId()
                if (cachedUserId) {
                    authLog('⏳ [SessionSyncManager] Cached auth detected, waiting for Firebase...')
                } else {
                    authLog('⏳ [SessionSyncManager] No cache, waiting for auth check...')
                }
            }
            return
        }

        // Auth check complete, initialize based on Firebase result
        if (!isInitialized) {
            authLog('🚀 [SessionSyncManager] Auth check complete, initializing session...')
            if (user) {
                authLog('🔐 [SessionSyncManager] User authenticated, initializing auth session')
                initializeAuthSession(user.uid)
            } else {
                authLog('👤 [SessionSyncManager] No auth, initializing guest session')
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
            authLog('🔄 [SessionSyncManager] Auth state changed, switching session...', {
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
        authLog('🔍 [SessionSyncManager] Sync effect triggered:', {
            isInitialized,
            sessionType,
            activeSessionId,
            hasUser: !!user,
            guestStoreId: guestStore.guestId,
        })

        if (!isInitialized) {
            authLog('⏸️ [SessionSyncManager] Not initialized yet, skipping sync')
            return
        }

        if (sessionType === 'authenticated' && user) {
            // Check if we need to sync with Firebase
            if (authStore.userId !== user.uid && authStore.syncStatus === 'offline') {
                authLog('📥 [SessionSyncManager] Syncing auth data for:', user.uid)
                authStore.syncWithFirebase(user.uid)
            }
        } else if (sessionType === 'guest') {
            // FIXED: Sync guest data from localStorage using the correct guestId
            // Check if we need to load/sync data (either no data or wrong session)
            const needsSync = !guestStore.guestId || guestStore.guestId !== activeSessionId
            authLog('🔍 [SessionSyncManager] Guest session check:', {
                needsSync,
                guestStoreId: guestStore.guestId,
                activeSessionId,
                condition1: !guestStore.guestId,
                condition2: guestStore.guestId !== activeSessionId,
            })

            if (needsSync) {
                authLog('📥 [SessionSyncManager] Syncing guest data from localStorage...', {
                    activeSessionId,
                    currentGuestId: guestStore.guestId,
                })
                guestStore.syncFromLocalStorage(activeSessionId)
            } else {
                authLog('✅ [SessionSyncManager] Guest data already synced, skipping')
            }
        }
    }, [isInitialized, sessionType, activeSessionId, user])

    // This component doesn't render anything
    return null
}

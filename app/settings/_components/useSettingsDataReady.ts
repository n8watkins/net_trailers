'use client'

import { useEffect, useState } from 'react'
import { useSessionStore } from '@/stores/sessionStore'
import { useAuthStore } from '@/stores/authStore'

/**
 * Whether the visitor's saved settings are in the stores, so a panel can show
 * real values instead of a skeleton. A guest's settings are local and ready as
 * soon as the session is; a signed-in visitor's arrive with the first load of
 * /api/user/preferences. Until then a panel would show the defaults and then
 * jump (a switch flipping on by itself), so it shows its skeleton instead.
 *
 * Once ready it stays ready, so a save (which marks the store as syncing
 * again) never swaps the controls back for a skeleton.
 */
export function useSettingsDataReady(): boolean {
    const isInitialized = useSessionStore((s) => s.isInitialized)
    const sessionType = useSessionStore((s) => s.sessionType)
    const activeSessionId = useSessionStore((s) => s.activeSessionId)
    const authUserId = useAuthStore((s) => s.userId)
    const syncStatus = useAuthStore((s) => s.syncStatus)

    const readyNow =
        isInitialized &&
        (sessionType === 'guest' ||
            (sessionType === 'authenticated' &&
                Boolean(authUserId) &&
                authUserId === activeSessionId &&
                syncStatus !== 'syncing'))

    // The session that was ready once; a switch of account starts over
    const key = `${sessionType}:${activeSessionId}`
    const [readyKey, setReadyKey] = useState<string | null>(readyNow ? key : null)
    useEffect(() => {
        if (readyNow) setReadyKey(key)
    }, [readyNow, key])

    return readyNow || readyKey === key
}

import { UserPreferences } from '../types/atoms'

/**
 * Session-isolated storage service that ensures complete data separation
 * between guest and authenticated sessions.
 */
export class SessionStorageService {
    private static activeSessionId: string | null = null
    private static sessionType: 'guest' | 'auth' | null = null

    // CRITICAL: Auto-restore session state on class initialization
    static {
        if (typeof window !== 'undefined') {
            try {
                const storedSession = localStorage.getItem('nettrailer_active_session')
                if (storedSession) {
                    const session = JSON.parse(storedSession)
                    this.activeSessionId = session.sessionId
                    this.sessionType = session.type
                    console.log(`🔄 [SessionStorage] RESTORED session state:`, {
                        sessionId: session.sessionId,
                        type: session.type,
                        timestamp: new Date().toISOString(),
                    })
                } else {
                    console.log(`📭 [SessionStorage] No stored session found on page load`)
                }
            } catch (error) {
                console.error(`❌ [SessionStorage] Failed to restore session state:`, error)
            }
        }
    }

    // Initialize a session with complete isolation
    static initializeSession(sessionId: string, type: 'guest' | 'auth'): void {
        console.log(`🔐 [SessionStorage] Initializing ${type} session: ${sessionId}`)
        this.activeSessionId = sessionId
        this.sessionType = type

        // CRITICAL: Persist session state for page reload survival
        if (typeof window !== 'undefined') {
            try {
                localStorage.setItem(
                    'nettrailer_active_session',
                    JSON.stringify({
                        sessionId,
                        type,
                        timestamp: new Date().toISOString(),
                    })
                )
                console.log(`💾 [SessionStorage] PERSISTED session state for refresh survival`)
            } catch (error) {
                console.error(`❌ [SessionStorage] Failed to persist session state:`, error)
            }
        }
    }

    // Get the current session prefix for storage keys
    private static getSessionPrefix(): string {
        if (!this.activeSessionId || !this.sessionType) {
            throw new Error('No active session initialized')
        }
        return `nettrailer_${this.sessionType}_${this.activeSessionId}`
    }

    // Store data with session isolation
    static setSessionData(key: string, data: any): void {
        if (typeof window === 'undefined') return

        const sessionKey = `${this.getSessionPrefix()}_${key}`
        try {
            localStorage.setItem(sessionKey, JSON.stringify(data))
            console.log(`💾 [SessionStorage] STORING DATA:`, {
                sessionKey,
                activeSessionId: this.activeSessionId,
                sessionType: this.sessionType,
                dataPreview:
                    key === 'preferences'
                        ? {
                              watchlistCount: data?.watchlist?.length || 0,
                              ratingsCount: data?.ratings?.length || 0,
                              listsCount: data?.userLists?.lists?.length || 0,
                          }
                        : 'non-preferences',
                timestamp: new Date().toISOString(),
            })
        } catch (error) {
            console.error(`❌ Failed to save session data for key ${sessionKey}:`, error)
        }
    }

    // Retrieve data with session isolation
    static getSessionData<T>(key: string, defaultValue: T): T {
        if (typeof window === 'undefined') return defaultValue

        const sessionKey = `${this.getSessionPrefix()}_${key}`
        try {
            const data = localStorage.getItem(sessionKey)
            if (data === null) {
                console.log(`📭 [SessionStorage] NO DATA FOUND:`, {
                    sessionKey,
                    activeSessionId: this.activeSessionId,
                    sessionType: this.sessionType,
                    allStorageKeys: this.debugListAllKeys(),
                    timestamp: new Date().toISOString(),
                })
                return defaultValue
            }
            const parsed = JSON.parse(data)
            console.log(`📬 [SessionStorage] LOADING DATA:`, {
                sessionKey,
                activeSessionId: this.activeSessionId,
                sessionType: this.sessionType,
                dataPreview:
                    key === 'preferences'
                        ? {
                              watchlistCount: parsed?.watchlist?.length || 0,
                              ratingsCount: parsed?.ratings?.length || 0,
                              listsCount: parsed?.userLists?.lists?.length || 0,
                          }
                        : 'non-preferences',
                timestamp: new Date().toISOString(),
            })
            return parsed
        } catch (error) {
            console.error(`❌ Failed to load session data for key ${sessionKey}:`, error)
            return defaultValue
        }
    }

    // Clear all data for the current session
    static clearCurrentSessionData(): void {
        if (typeof window === 'undefined') return
        if (!this.activeSessionId || !this.sessionType) return

        const sessionPrefix = this.getSessionPrefix()
        const keysToRemove: string[] = []

        // Find all keys that belong to this session
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i)
            if (key && key.startsWith(sessionPrefix)) {
                keysToRemove.push(key)
            }
        }

        // Remove all session keys
        keysToRemove.forEach((key) => {
            localStorage.removeItem(key)
            console.log(`🗑️ Removed session key: ${key}`)
        })

        console.log(
            `🧹 Cleared ${keysToRemove.length} items from ${this.sessionType} session: ${this.activeSessionId}`
        )
    }

    // Clear data for a specific session (cleanup utility)
    static clearSessionData(sessionId: string, type: 'guest' | 'auth'): void {
        if (typeof window === 'undefined') return

        const sessionPrefix = `nettrailer_${type}_${sessionId}`
        const keysToRemove: string[] = []

        // Find all keys that belong to this session
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i)
            if (key && key.startsWith(sessionPrefix)) {
                keysToRemove.push(key)
            }
        }

        // Remove all session keys
        keysToRemove.forEach((key) => {
            localStorage.removeItem(key)
        })

        console.log(`🧹 Cleared ${keysToRemove.length} items from ${type} session: ${sessionId}`)
    }

    // Get current session info
    static getCurrentSession(): { sessionId: string; type: 'guest' | 'auth' } | null {
        if (!this.activeSessionId || !this.sessionType) return null
        return {
            sessionId: this.activeSessionId,
            type: this.sessionType,
        }
    }

    // Check if there's data for a specific session
    static hasSessionData(sessionId: string, type: 'guest' | 'auth'): boolean {
        if (typeof window === 'undefined') return false

        const sessionPrefix = `nettrailer_${type}_${sessionId}`

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i)
            if (key && key.startsWith(sessionPrefix)) {
                return true
            }
        }
        return false
    }

    // List all available sessions (debug utility)
    static getAllSessions(): Array<{
        sessionId: string
        type: 'guest' | 'auth'
        keyCount: number
    }> {
        if (typeof window === 'undefined') return []

        const sessions = new Map<string, { type: 'guest' | 'auth'; keyCount: number }>()

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i)
            if (key && key.startsWith('nettrailer_')) {
                const parts = key.split('_')
                if (parts.length >= 4) {
                    const type = parts[1] as 'guest' | 'auth'
                    const sessionId = parts[2]
                    const sessionKey = `${type}_${sessionId}`

                    if (sessions.has(sessionKey)) {
                        sessions.get(sessionKey)!.keyCount++
                    } else {
                        sessions.set(sessionKey, { type, keyCount: 1 })
                    }
                }
            }
        }

        return Array.from(sessions.entries()).map(([sessionKey, data]) => {
            const [type, sessionId] = sessionKey.split('_')
            return {
                sessionId,
                type: type as 'guest' | 'auth',
                keyCount: data.keyCount,
            }
        })
    }

    // Force switch to a different session with cleanup
    static switchSession(newSessionId: string, newType: 'guest' | 'auth'): void {
        console.log(
            `🔄 Switching session from ${this.sessionType}:${this.activeSessionId} to ${newType}:${newSessionId}`
        )

        // Don't clear data, just switch active session
        this.activeSessionId = newSessionId
        this.sessionType = newType

        console.log(`✅ Session switched to ${newType}: ${newSessionId}`)
    }

    // Debug helper to list all localStorage keys for troubleshooting
    private static debugListAllKeys(): string[] {
        if (typeof window === 'undefined') return []

        const keys: string[] = []
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i)
            if (key && key.startsWith('nettrailer_')) {
                keys.push(key)
            }
        }
        return keys
    }
}

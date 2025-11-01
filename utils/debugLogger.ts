/**
 * Logging utilities that respect debug settings
 * Controlled via DebugControls component (Alt+Shift+D)
 */

// Get debug settings from localStorage
function getDebugSettings() {
    if (typeof window === 'undefined') return null

    try {
        const settings = localStorage.getItem('debugSettings')
        if (!settings) return null
        return JSON.parse(settings)
    } catch {
        return null
    }
}

// Check if a specific debug setting is enabled
function isDebugEnabled(setting: string): boolean {
    const settings = getDebugSettings()
    return settings?.[setting] === true
}

/**
 * Auth Logging (Firebase auth, session initialization)
 */
export function authLog(...args: any[]): void {
    if (process.env.NODE_ENV !== 'production' && isDebugEnabled('showFirebaseDebug')) {
        console.log(...args)
    }
}

export function authError(...args: any[]): void {
    console.error('[Auth Error]', ...args)
}

export function authWarn(...args: any[]): void {
    console.warn('[Auth Warning]', ...args)
}

/**
 * Session Logging (session management, switching, sync)
 */
export function sessionLog(...args: any[]): void {
    if (process.env.NODE_ENV !== 'production' && isDebugEnabled('showSessionDebug')) {
        console.log(...args)
    }
}

export function sessionError(...args: any[]): void {
    console.error('[Session Error]', ...args)
}

/**
 * Guest Logging (guest storage, guest store operations)
 */
export function guestLog(...args: any[]): void {
    if (process.env.NODE_ENV !== 'production' && isDebugEnabled('showGuestDebug')) {
        console.log(...args)
    }
}

export function guestError(...args: any[]): void {
    console.error('[Guest Error]', ...args)
}

/**
 * Cache Logging (cache store operations, sessionStorage)
 */
export function cacheLog(...args: any[]): void {
    if (process.env.NODE_ENV !== 'production' && isDebugEnabled('showCacheDebug')) {
        console.log(...args)
    }
}

export function cacheError(...args: any[]): void {
    console.error('[Cache Error]', ...args)
}

/**
 * Firebase Tracker Logging (Firebase call tracking, quota monitoring)
 */
export function firebaseLog(...args: any[]): void {
    if (process.env.NODE_ENV !== 'production' && isDebugEnabled('showFirebaseTracker')) {
        console.log(...args)
    }
}

export function firebaseWarn(...args: any[]): void {
    if (process.env.NODE_ENV !== 'production' && isDebugEnabled('showFirebaseTracker')) {
        console.warn(...args)
    }
}

export function firebaseGroup(label: string): void {
    if (process.env.NODE_ENV !== 'production' && isDebugEnabled('showFirebaseTracker')) {
        console.group(label)
    }
}

export function firebaseGroupEnd(): void {
    if (process.env.NODE_ENV !== 'production' && isDebugEnabled('showFirebaseTracker')) {
        console.groupEnd()
    }
}

/**
 * Auth logging utility that respects the "Auth Flow Logs" debug setting
 * Controlled via DebugControls component (Alt+Shift+D)
 */

// Check if auth logging is enabled
function isAuthLoggingEnabled(): boolean {
    if (typeof window === 'undefined') return false

    try {
        const settings = localStorage.getItem('debugSettings')
        if (!settings) return false

        const parsed = JSON.parse(settings)
        return parsed.showFirebaseDebug === true
    } catch {
        return false
    }
}

/**
 * Log auth-related info (only if auth logging is enabled)
 */
export function authLog(...args: any[]): void {
    if (isAuthLoggingEnabled()) {
        console.log(...args)
    }
}

/**
 * Log auth-related errors (always shown, but formatted)
 */
export function authError(...args: any[]): void {
    console.error('[Auth Error]', ...args)
}

/**
 * Log auth-related warnings (always shown, but formatted)
 */
export function authWarn(...args: any[]): void {
    console.warn('[Auth Warning]', ...args)
}

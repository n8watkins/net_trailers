/**
 * Client-side utilities for managing Child Safety Mode via cookies
 * This file can be imported by client components
 */

const COOKIE_NAME = 'nettrailer_child_safety'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 1 year

/**
 * Get child safety mode from cookies (client-side only)
 * @returns true if child safety mode is enabled, false otherwise
 */
export function getChildSafetyModeClient(): boolean {
    if (typeof document === 'undefined') return false

    const cookies = document.cookie.split(';')
    const cookie = cookies.find((c) => c.trim().startsWith(`${COOKIE_NAME}=`))
    const value = cookie?.split('=')[1]
    return value === 'true'
}

/**
 * Set child safety mode cookie (client-side only)
 * @param enabled - Whether to enable child safety mode
 */
export function setChildSafetyModeClient(enabled: boolean): void {
    if (typeof document === 'undefined') return

    const maxAge = COOKIE_MAX_AGE
    const secure = process.env.NODE_ENV === 'production' ? 'Secure;' : ''
    document.cookie = `${COOKIE_NAME}=${enabled ? 'true' : 'false'}; path=/; max-age=${maxAge}; SameSite=Lax; ${secure}`
}

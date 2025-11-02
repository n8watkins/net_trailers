/**
 * Server-side utilities for managing Child Safety Mode via cookies
 * This allows server components to access child safety preference
 */

import { cookies } from 'next/headers'

const COOKIE_NAME = 'nettrailer_child_safety'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 1 year

/**
 * Get child safety mode from cookies (server-side)
 * @returns true if child safety mode is enabled, false otherwise
 */
export async function getChildSafetyMode(): Promise<boolean> {
    const cookieStore = await cookies()
    const value = cookieStore.get(COOKIE_NAME)?.value
    return value === 'true'
}

/**
 * Set child safety mode cookie (server-side)
 * @param enabled - Whether to enable child safety mode
 */
export async function setChildSafetyModeCookie(enabled: boolean): Promise<void> {
    const cookieStore = await cookies()
    cookieStore.set(COOKIE_NAME, enabled ? 'true' : 'false', {
        maxAge: COOKIE_MAX_AGE,
        path: '/',
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
    })
}

/**
 * Client-side utilities for managing child safety cookie
 * These functions can be used in client components
 */

/**
 * Get child safety mode from cookies (client-side)
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
 * Set child safety mode cookie (client-side)
 * @param enabled - Whether to enable child safety mode
 */
export function setChildSafetyModeClient(enabled: boolean): void {
    if (typeof document === 'undefined') return

    const maxAge = COOKIE_MAX_AGE
    const secure = process.env.NODE_ENV === 'production' ? 'Secure;' : ''
    document.cookie = `${COOKIE_NAME}=${enabled ? 'true' : 'false'}; path=/; max-age=${maxAge}; SameSite=Lax; ${secure}`
}

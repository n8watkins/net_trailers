/**
 * Server-side utilities for managing Child Safety Mode via cookies
 * This file should only be imported by server components
 */

import { cookies } from 'next/headers'

const COOKIE_NAME = 'nettrailer_child_safety'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 1 year

/**
 * Get child safety mode from cookies (server-side only)
 * @returns true if child safety mode is enabled, false otherwise
 */
export async function getChildSafetyMode(): Promise<boolean> {
    const cookieStore = await cookies()
    const value = cookieStore.get(COOKIE_NAME)?.value
    return value === 'true'
}

/**
 * Set child safety mode cookie (server-side only)
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

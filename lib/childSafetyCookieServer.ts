/**
 * Server-side utilities for managing Child Safety Mode via cookies
 * This file should only be imported by server components
 */

import { cookies } from 'next/headers'

import { auth } from '@/auth'
import { loadUserPreferences } from '@/db/queries/userPreferences'

const COOKIE_NAME = 'nettrailer_child_safety'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 1 year

/**
 * Whether Child Safety Mode is on for this request (server-side only).
 *
 * For a signed-in visitor the account's stored setting decides; the cookie is
 * ignored, since anyone can edit a cookie and the setting may be locked by a
 * PIN (lib/childSafetyLock.ts). For a guest, who has no stored setting, the
 * cookie is all there is. Errors are not caught: the home page then shows its
 * error state rather than unfiltered titles.
 */
export async function getChildSafetyMode(): Promise<boolean> {
    const session = await auth()
    const userId = session?.user?.id
    if (userId) {
        const preferences = await loadUserPreferences(userId)
        return preferences.childSafetyMode === true
    }
    const cookieStore = await cookies()
    return cookieStore.get(COOKIE_NAME)?.value === 'true'
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

/**
 * Child Safety Mode as the server sees it (server-only).
 *
 * The server decides whether a request gets filtered content. A client can ask
 * for MORE filtering (`childSafetyMode=true` on a content route), never less:
 * with the mode on, a missing or `false` parameter changes nothing.
 *
 * Where the mode comes from:
 * - A signed-in visitor: the account's stored setting (user_preferences), which
 *   a PIN can lock on (lib/childSafetyLock.ts). Cookies are ignored.
 * - A guest: the `nettrailer_child_safety` cookie. Only the server writes it
 *   (httpOnly, so page scripts can neither read nor change it), and only from
 *   an account's stored setting (syncChildSafetyCookie below): an account that
 *   turned the mode on leaves it on for this browser after signing out, and
 *   only a signed-in save of the setting (through the PIN lock) turns it off.
 *   A guest has no identity of its own, so this is as strong as the browser's
 *   cookie jar: clearing site data or a private window starts without it.
 *
 * When the stored setting cannot be read (a database error), content routes
 * get filtered content rather than an error or unfiltered titles.
 */

import { cookies } from 'next/headers'

import { auth } from '@/auth'
import { loadChildSafetyMode } from '@/db/queries/userPreferences'
import { logWarn } from '@/lib/log'

export const CHILD_SAFETY_COOKIE = 'nettrailer_child_safety'
/** The query parameter (or body field) a client sends to ask for filtered content. */
export const CHILD_SAFETY_PARAM = 'childSafetyMode'

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 1 year

/**
 * Whether Child Safety Mode is on for this request, from the trustworthy
 * signal only: the account's stored setting for a signed-in visitor, the
 * server-set cookie for a guest. Throws when the setting cannot be read.
 */
export async function getChildSafetyMode(): Promise<boolean> {
    const session = await auth()
    const userId = session?.user?.id
    if (userId) return loadChildSafetyMode(userId)
    const cookieStore = await cookies()
    return cookieStore.get(CHILD_SAFETY_COOKIE)?.value === 'true'
}

/** Whether a client value (query parameter or body field) asks for filtered content. */
export function asksForChildSafety(value: unknown): boolean {
    return value === true || value === 'true'
}

/**
 * Whether a content response must be filtered: the mode is on for the
 * requester, or the client asked for filtering. Never throws; when the mode
 * cannot be read, the answer is "filter".
 */
export async function resolveChildSafety(asked?: unknown): Promise<boolean> {
    if (asksForChildSafety(asked)) return true
    try {
        return await getChildSafetyMode()
    } catch (error) {
        logWarn({
            event: 'child_safety_unreadable',
            reason: error instanceof Error ? error.name : 'unknown',
            route: 'content',
        })
        return true
    }
}

/** resolveChildSafety for a GET content route, with the client's query parameter. */
export function childSafetyForRequest(request: { nextUrl: URL }): Promise<boolean> {
    return resolveChildSafety(request.nextUrl.searchParams.get(CHILD_SAFETY_PARAM))
}

/**
 * Write this browser's guest cookie from the signed-in account's stored
 * setting, after a save of that setting. The value always comes from the
 * database, never from the caller, so this cannot turn a guest's mode off
 * unless an account's own (PIN-checked) setting is off. Without a session it
 * changes nothing. Returns the mode written (or the guest's current one).
 */
export async function syncChildSafetyCookie(): Promise<boolean> {
    const session = await auth()
    const cookieStore = await cookies()
    const userId = session?.user?.id
    if (!userId) return cookieStore.get(CHILD_SAFETY_COOKIE)?.value === 'true'
    const enabled = await loadChildSafetyMode(userId)
    cookieStore.set(CHILD_SAFETY_COOKIE, enabled ? 'true' : 'false', {
        maxAge: COOKIE_MAX_AGE,
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
    })
    return enabled
}

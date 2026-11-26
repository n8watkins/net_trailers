/**
 * The server's side of the child safety PIN (server-only).
 *
 * For a signed-in account, Child Safety Mode is the `childSafetyMode` field of
 * its stored preferences. While the account has a PIN and the mode is on, the
 * mode is *locked*: no save turns it off unless the PIN was entered
 * correctly just before (POST /api/child-safety/pin?action=verify records a
 * one-time unlock). Without this, the PIN only guarded the settings screen and
 * any other save of the preferences could switch filtering off.
 *
 * The unlock is kept in the database (lib/durableLimit.ts), so it holds
 * across Worker isolates. It lasts at least UNLOCK_MS and is spent by the
 * first save that turns the mode off.
 */

import { hasPIN } from '@/db/queries/childSafety'
import { loadUserPreferences } from '@/db/queries/userPreferences'
import { countEvent, readCount, resetLimit } from '@/lib/durableLimit'
import type { UserPreferences } from '@/types/shared'

const UNLOCK_MS = 10 * 60 * 1000
const UNLOCK_WINDOW = { ms: UNLOCK_MS }
const unlockKey = (userId: string) => `pin-unlock:${userId}`

/** The current fixed window and the one before it, so an unlock never ends early. */
function unlockWindows(now = Date.now()): Date[] {
    return [new Date(now), new Date(now - UNLOCK_MS)]
}

/** Record that the account's PIN was just entered correctly. */
export async function recordPinUnlock(userId: string): Promise<void> {
    await countEvent(unlockKey(userId), UNLOCK_WINDOW)
}

/** Spend a recent unlock, if there is one. */
export async function consumePinUnlock(userId: string): Promise<boolean> {
    const windows = unlockWindows()
    let found = false
    for (const at of windows) {
        if ((await readCount(unlockKey(userId), UNLOCK_WINDOW, at)) > 0) found = true
    }
    if (found) {
        for (const at of windows) await resetLimit(unlockKey(userId), UNLOCK_WINDOW, at)
    }
    return found
}

/** Whether the account's Child Safety Mode is on and protected by a PIN. */
export async function isChildSafetyLocked(
    userId: string,
    stored?: Pick<UserPreferences, 'childSafetyMode'>
): Promise<boolean> {
    const current = stored ?? (await loadUserPreferences(userId))
    if (current.childSafetyMode !== true) return false
    return hasPIN(userId)
}

/**
 * The preferences to store for a save: unchanged, except that a locked Child
 * Safety Mode stays on unless a recent unlock is spent on turning it off.
 * Returns whether the mode was kept on against the request.
 */
export async function applyChildSafetyLock(
    userId: string,
    next: UserPreferences
): Promise<{ preferences: UserPreferences; kept: boolean }> {
    if (next.childSafetyMode === true) return { preferences: next, kept: false }
    if (!(await isChildSafetyLocked(userId))) return { preferences: next, kept: false }
    if (await consumePinUnlock(userId)) return { preferences: next, kept: false }
    return { preferences: { ...next, childSafetyMode: true }, kept: true }
}

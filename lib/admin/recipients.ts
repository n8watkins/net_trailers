/**
 * Who may receive an admin email (announcement or custom): only people with
 * email turned on (`notifications.email === true`, the same opt-in every other
 * sender reads). Unsubscribing sets it to false (app/api/email/unsubscribe), so
 * an unsubscribed user is never emailed, and email is off by default.
 */

type PrefsLike = { notifications?: { email?: unknown } | null } | null | undefined

/** Whether this user's preferences allow admin emails. */
export function canReceiveAdminEmail(prefs: unknown): boolean {
    return (prefs as PrefsLike)?.notifications?.email === true
}

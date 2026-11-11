/**
 * Who is an admin: the signed-in user's email is in ADMIN_EMAILS (a
 * comma-separated list in wrangler.jsonc `vars`). Sign-in is by emailed link
 * only, so the address is proven by the link before a session exists.
 */

/** The configured admin addresses, trimmed and lower-cased. */
export function adminEmails(env: NodeJS.ProcessEnv = process.env): string[] {
    return (env.ADMIN_EMAILS ?? '')
        .split(/[\s,]+/)
        .map((email) => email.trim().toLowerCase())
        .filter((email) => email.includes('@'))
}

/** True when `email` is one of the admin addresses (case-insensitive). */
export function isAdminEmail(
    email: string | null | undefined,
    env: NodeJS.ProcessEnv = process.env
): boolean {
    if (!email) return false
    return adminEmails(env).includes(email.trim().toLowerCase())
}

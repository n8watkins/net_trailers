/**
 * First-visit welcome: shown once per browser, then only on request
 * (Settings, Help, the profile menu, the footer).
 */
export const WELCOME_SEEN_KEY = 'nettrailers-welcome-seen-v1'

export function hasSeenWelcome(storage: Pick<Storage, 'getItem'> | null): boolean {
    if (!storage) return true
    try {
        return storage.getItem(WELCOME_SEEN_KEY) !== null
    } catch {
        // Storage blocked (private mode): never nag on every page
        return true
    }
}

export function markWelcomeSeen(storage: Pick<Storage, 'setItem'> | null): void {
    if (!storage) return
    try {
        storage.setItem(WELCOME_SEEN_KEY, new Date().toISOString())
    } catch {
        // Ignore: storage may be blocked
    }
}

/** Pages where a pop-up would get in the way (sign-in links, legal, shared links). */
export function isWelcomeSuppressedPath(pathname: string | null): boolean {
    if (!pathname) return true
    return [
        '/auth',
        '/privacy',
        '/terms',
        '/unsubscribe',
        '/unsubscribed',
        '/shared',
        '/admin',
    ].some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

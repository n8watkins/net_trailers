/** Small formatting helpers shared by the admin pages (no locale surprises between server and browser). */

/** "just now", "5 min ago", "3 h ago", "2 days ago", then a UTC date. */
export function formatAgo(at: number | string, now: Date | number = Date.now()): string {
    const then = typeof at === 'string' ? Date.parse(at) : at
    const nowMs = typeof now === 'number' ? now : now.getTime()
    const seconds = Math.round((nowMs - then) / 1000)
    if (seconds < 0) return formatDate(then)
    if (seconds < 60) return 'just now'
    const minutes = Math.round(seconds / 60)
    if (minutes < 60) return `${minutes} min ago`
    const hours = Math.round(minutes / 60)
    if (hours < 24) return `${hours} h ago`
    const days = Math.round(hours / 24)
    if (days < 14) return `${days} day${days === 1 ? '' : 's'} ago`
    return formatDate(then)
}

/** "Nov 10, 2026" in UTC. */
export function formatDate(at: number | string): string {
    return new Date(at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC',
    })
}

/** "Nov 10, 14:05 UTC". */
export function formatDateTime(at: number | string): string {
    const d = new Date(at)
    const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
    const time = d.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'UTC',
    })
    return `${date}, ${time} UTC`
}

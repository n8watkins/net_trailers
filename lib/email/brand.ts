/**
 * Brand constants shared by every email: addresses, links, colours, fonts.
 * The palette is the site's: near-black page, a slightly lighter card, amber
 * accents. Dark is the default; a light variant applies only where the mail
 * client reports `prefers-color-scheme: light` (see layout.tsx).
 */

/** The site's one public address (wrangler.jsonc PUBLIC_URL). */
export function siteUrl(): string {
    return (process.env.PUBLIC_URL || 'https://net-trailers.n8builds.dev').replace(/\/$/, '')
}

export const PORTFOLIO_PROJECT_URL = 'https://portfolio.n8builds.dev/projects/net-trailer'
export const N8BUILDS_URL = 'https://n8builds.dev'

/** A stable, long-cached copy of the mark (public/_headers). */
export function logoUrl(): string {
    return `${siteUrl()}/email/nettrailers-mark-96.png`
}

export function preferencesUrl(): string {
    return `${siteUrl()}/settings/notifications`
}

/**
 * The one unsubscribe link: opens the confirm page, which performs the
 * unsubscribe on a button press (a link scanner cannot do it by fetching).
 */
export function unsubscribeUrl(token: string): string {
    return `${siteUrl()}/unsubscribe?token=${encodeURIComponent(token)}`
}

/**
 * The List-Unsubscribe target: the same token, on the API route that accepts
 * the one-click POST (RFC 8058). A plain GET there redirects to the confirm page.
 */
export function oneClickUnsubscribeUrl(pageUrl: string): string {
    const url = new URL(pageUrl)
    url.pathname = '/api/email/unsubscribe'
    return url.toString()
}

export const COLORS = {
    dark: {
        page: '#0a0a0a',
        card: '#141414',
        panel: '#1c1c1c',
        border: '#2a2a2a',
        ink: '#ffffff',
        body: '#d4d4d8',
        subtle: '#a1a1aa',
        link: '#fbbf24',
        net: '#ffffff',
        trailers: '#fcd34d',
    },
    light: {
        page: '#f4f4f5',
        card: '#ffffff',
        panel: '#fafafa',
        border: '#e4e4e7',
        ink: '#18181b',
        body: '#3f3f46',
        subtle: '#71717a',
        link: '#b45309',
        net: '#18181b',
        trailers: '#d97706',
    },
    amber: '#f59e0b',
    onAmber: '#0a0a0a',
} as const

export const SANS = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"
export const BRAND_FONT = `'Lexend','Lexend Deca',${SANS}`

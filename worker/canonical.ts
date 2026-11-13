/**
 * NetTrailers has one public address (PUBLIC_URL, net-trailers.n8builds.dev).
 * Sign-in cookies and magic links belong to it, so a request that reaches the
 * Worker on another of its addresses is sent there, keeping the path and query:
 *
 * - the old custom domain, nettrailers.n8builds.dev, with a permanent 301, so
 *   search engines and old links move to the new address;
 * - the workers.dev address with a 308, which also keeps the method and body;
 * - plain http on the site's own address with a 301 to https, so a page is
 *   never rendered (or cached at the edge) twice, once per scheme. The scheme
 *   is the visitor's, from Cloudflare's CF-Visitor header: `wrangler dev`
 *   serves http under the site's own host name and sends no such header.
 *
 * Local and test hosts are never redirected.
 */

/** Earlier public addresses that now forward to PUBLIC_URL. */
export const LEGACY_HOSTS = ['nettrailers.n8builds.dev']

export interface CanonicalRedirect {
    location: string
    status: 301 | 308
}

/** The scheme the visitor used, from Cloudflare's CF-Visitor header ({"scheme":"http"}). */
export function visitorScheme(cfVisitor: string | null): string | null {
    if (!cfVisitor) return null
    try {
        const scheme = (JSON.parse(cfVisitor) as { scheme?: unknown }).scheme
        return typeof scheme === 'string' ? scheme : null
    } catch {
        return null
    }
}

export function canonicalRedirect(
    requestUrl: string,
    publicUrl: string | undefined,
    scheme: string | null = null
): CanonicalRedirect | null {
    if (!publicUrl) return null
    const url = new URL(requestUrl)
    const canonical = new URL(publicUrl)
    if (canonical.protocol !== 'https:') return null
    if (url.host === canonical.host && scheme !== 'http') return null
    let status: 301 | 308
    if (url.host === canonical.host || LEGACY_HOSTS.includes(url.hostname)) status = 301
    else if (url.hostname.endsWith('.workers.dev')) status = 308
    else return null
    // Set the path on the canonical URL rather than resolving it: a path such
    // as "//evil.example" would otherwise resolve to another host.
    const target = new URL(canonical.origin)
    target.pathname = url.pathname
    target.search = url.search
    return { location: target.toString(), status }
}

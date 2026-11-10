import Script from 'next/script'

/**
 * Cloudflare Web Analytics, which replaced Vercel Analytics: a cookie-free page
 * view and Core Web Vitals count that keeps no visitor identifier.
 * https://developers.cloudflare.com/web-analytics/
 *
 * The site's token (public, it ships in the page) comes from the Web Analytics
 * site in the Cloudflare dashboard and is set at build time by the deploy
 * (DEPLOY.md). Builds without it (local, CI, tests) load nothing. `nonce` is
 * the request's CSP script nonce (lib/csp.ts).
 */
export default function WebAnalytics({ nonce }: { nonce?: string }) {
    const token = process.env.NEXT_PUBLIC_CF_WEB_ANALYTICS_TOKEN
    if (!token) return null
    return (
        <Script
            src="https://static.cloudflareinsights.com/beacon.min.js"
            strategy="afterInteractive"
            nonce={nonce}
            data-cf-beacon={JSON.stringify({ token })}
        />
    )
}

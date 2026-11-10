import Script from 'next/script'

/**
 * Cloudflare Web Analytics, which replaced Vercel Analytics: a cookie-free page
 * view and Core Web Vitals count that keeps no visitor identifier.
 * https://developers.cloudflare.com/web-analytics/
 *
 * The site's token (public, it ships in the page) comes from the Web Analytics
 * site in the Cloudflare dashboard and is set at build time by the deploy
 * (DEPLOY.md). Builds without it (local, CI, tests) load nothing.
 */
export default function WebAnalytics() {
    const token = process.env.NEXT_PUBLIC_CF_WEB_ANALYTICS_TOKEN
    if (!token) return null
    return (
        <Script
            src="https://static.cloudflareinsights.com/beacon.min.js"
            strategy="afterInteractive"
            data-cf-beacon={JSON.stringify({ token })}
        />
    )
}

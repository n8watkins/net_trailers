import type { Page } from '@playwright/test'

// A 1x1 transparent PNG
const PIXEL = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
    'base64'
)

/**
 * Keeps the browser off the internet. TMDB data already comes from fixtures, but
 * posters (TMDB, directly or through the Next.js image optimizer) and YouTube
 * trailers are still fetched live. A slow one of those holds `networkidle` open
 * until the test times out, so they get a placeholder pixel or are dropped.
 */
export async function stubExternalMedia(page: Page): Promise<void> {
    const pixel = { status: 200, contentType: 'image/png', body: PIXEL }
    await page.route(/\/_next\/image\?/, (route) => route.fulfill(pixel))
    await page.route('https://image.tmdb.org/**', (route) => route.fulfill(pixel))
    await page.route(
        /^https:\/\/([a-z0-9-]+\.)*(youtube\.com|ytimg\.com|googlevideo\.com)\//,
        (route) => route.abort()
    )
}

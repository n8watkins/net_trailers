import { expect, test, type Browser, type Page } from '@playwright/test'

import { stubExternalMedia } from './stub-media'

/**
 * Polish from the UX re-check: footer and Profile line up with the header, genre,
 * person and community pages have their own tab titles, and Watch Later shows the
 * bookmark icon instead of a TV emoji.
 */

const SIZES = {
    phone: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
    tablet: { viewport: { width: 768, height: 1024 }, isMobile: false, hasTouch: false },
    desktop: { viewport: { width: 1440, height: 900 }, isMobile: false, hasTouch: false },
} as const

async function open(browser: Browser, baseURL: string | undefined, size: keyof typeof SIZES) {
    const context = await browser.newContext({
        ...SIZES[size],
        baseURL,
        storageState: {
            cookies: [
                {
                    name: 'n8-consent',
                    value: 'denied',
                    domain: new URL(baseURL ?? 'http://localhost').hostname,
                    path: '/',
                    expires: -1,
                    httpOnly: false,
                    secure: false,
                    sameSite: 'Lax',
                },
            ],
            origins: [
                {
                    origin: baseURL ?? '',
                    localStorage: [{ name: 'nettrailers-welcome-seen-v1', value: 'e2e' }],
                },
            ],
        },
    })
    const page = await context.newPage()
    await stubExternalMedia(page)
    return { context, page }
}

async function waitForGuestHeader(page: Page) {
    await expect(page.locator('header').getByRole('button', { name: 'User menu' })).toBeVisible({
        timeout: 15_000,
    })
}

/** Left and right edge of the header's content row: its first and last control. */
async function headerEdges(page: Page) {
    return page.evaluate(() => {
        const row = document.querySelector('header > div') as HTMLElement
        const first = row.firstElementChild!.getBoundingClientRect()
        const last = row.lastElementChild!.getBoundingClientRect()
        return { left: first.left, right: last.right }
    })
}

/** Left and right edge of the footer's content: the link columns and the credit rows. */
async function footerEdges(page: Page) {
    return page.evaluate(() => {
        const footer = document.querySelector('footer')!
        const nav = footer.querySelector('nav[aria-label="Footer navigation"]')!
        const credit = footer.querySelector('a[href*="n8builds.dev"]')!
        const tmdb = footer.querySelector('[data-testid="tmdb-credit"]')!
        return {
            left: nav.getBoundingClientRect().left,
            right: credit.getBoundingClientRect().right,
            tmdbLeft: tmdb.getBoundingClientRect().left,
            tmdbRight: tmdb.getBoundingClientRect().right,
        }
    })
}

test.describe('header alignment', () => {
    // The header's content gutter equals the page's: 16 / 24 / 32 / 64 px by width
    for (const [size, gutter] of [
        ['phone', 16],
        ['tablet', 32],
        ['desktop', 64],
    ] as const) {
        test(`the header lines up with the page content at ${size}`, async ({
            browser,
            baseURL,
        }) => {
            const { context, page } = await open(browser, baseURL, size)
            await page.goto('/collections')
            await waitForGuestHeader(page)
            const header = await headerEdges(page)
            const width = await page.evaluate(() => document.body.getBoundingClientRect().width)
            const content = await page.locator('main > div').first().boundingBox()
            expect(Math.abs(header.left - gutter)).toBeLessThanOrEqual(1)
            expect(Math.abs(header.right - (width - gutter))).toBeLessThanOrEqual(1)
            expect(Math.abs(header.left - content!.x)).toBeLessThanOrEqual(1)
            await context.close()
        })
    }
})

test.describe('header sub-navigation', () => {
    // Seven labelled tabs are wider than the page between 640 and 1023 px: they must not spill
    for (const width of [390, 640, 768, 900, 1024, 1440]) {
        test(`the profile tabs stay inside the page at ${width} px`, async ({
            browser,
            baseURL,
        }) => {
            const { context, page } = await open(browser, baseURL, 'desktop')
            await page.setViewportSize({ width, height: 900 })
            await page.goto('/collections')
            await waitForGuestHeader(page)
            const edges = await page.evaluate(() => {
                const links = [
                    ...document.querySelectorAll('nav[aria-label="User navigation"] a'),
                ].map((a) => a.getBoundingClientRect())
                return {
                    left: Math.min(...links.map((r) => r.left)),
                    right: Math.max(...links.map((r) => r.right)),
                    smallest: Math.min(...links.map((r) => Math.min(r.width, r.height))),
                    page: document.body.getBoundingClientRect().width,
                }
            })
            expect(edges.left).toBeGreaterThanOrEqual(0)
            expect(edges.right).toBeLessThanOrEqual(edges.page)
            if (width < 1024) expect(edges.smallest).toBeGreaterThanOrEqual(40)
            await context.close()
        })
    }

    test('header controls are at least 40 px to tap on a phone', async ({ browser, baseURL }) => {
        const { context, page } = await open(browser, baseURL, 'phone')
        await page.goto('/collections')
        await waitForGuestHeader(page)
        const sizes = await page.evaluate(() =>
            [...document.querySelectorAll('header > div > *')]
                .map((el) => el.getBoundingClientRect())
                .filter((r) => r.width > 0 && r.height > 0)
                .map((r) => Math.min(r.width, r.height))
        )
        expect(Math.min(...sizes)).toBeGreaterThanOrEqual(40)
        await context.close()
    })
})

test.describe('footer alignment', () => {
    for (const size of ['phone', 'tablet', 'desktop'] as const) {
        test(`the footer lines up with the header at ${size}`, async ({ browser, baseURL }) => {
            const { context, page } = await open(browser, baseURL, size)
            await page.goto('/collections')
            await waitForGuestHeader(page)
            const header = await headerEdges(page)
            await page.locator('footer').scrollIntoViewIfNeeded()
            const footer = await footerEdges(page)
            expect(Math.abs(footer.left - header.left)).toBeLessThanOrEqual(1)
            expect(Math.abs(footer.right - header.right)).toBeLessThanOrEqual(1)
            expect(Math.abs(footer.tmdbLeft - header.left)).toBeLessThanOrEqual(1)
            expect(Math.abs(footer.tmdbRight - header.right)).toBeLessThanOrEqual(1)
            await context.close()
        })
    }

    test('no footer column is much taller than the others on desktop', async ({
        browser,
        baseURL,
    }) => {
        const { context, page } = await open(browser, baseURL, 'desktop')
        await page.goto('/collections')
        await waitForGuestHeader(page)
        const heights = await page.evaluate(() =>
            // the grid stretches every column to the tallest, so measure each one's own content
            [...document.querySelectorAll('footer > div > div:first-child > *')].map(
                (column) =>
                    column.lastElementChild!.getBoundingClientRect().bottom -
                    column.getBoundingClientRect().top
            )
        )
        expect(heights.length).toBeGreaterThanOrEqual(3)
        expect(Math.max(...heights) - Math.min(...heights)).toBeLessThanOrEqual(120)
        // the credit, cookie settings and TMDB notice are all still there
        await expect(
            page.getByRole('link', { name: 'Built by Nate at n8builds.dev' })
        ).toBeVisible()
        await expect(page.getByTestId('tmdb-credit')).toContainText(
            'This product uses the TMDB API but is not endorsed or certified by TMDB.'
        )
        await context.close()
    })
})

test.describe('profile width', () => {
    for (const size of ['phone', 'tablet', 'desktop'] as const) {
        test(`the Profile cards share the header's width at ${size}`, async ({
            browser,
            baseURL,
        }) => {
            const { context, page } = await open(browser, baseURL, size)
            await page.goto('/profile')
            await waitForGuestHeader(page)
            const liked = page.getByRole('heading', { name: 'Liked Content' })
            await expect(liked).toBeVisible({ timeout: 15_000 })
            const header = await headerEdges(page)
            const edges = await liked.evaluate((heading) => {
                // the grid that holds the Liked Content and Watch History cards
                const grid = heading.closest('div.lg\\:grid-cols-2')!.getBoundingClientRect()
                return { left: grid.left, right: grid.right }
            })
            expect(Math.abs(edges.left - header.left)).toBeLessThanOrEqual(1)
            expect(Math.abs(edges.right - header.right)).toBeLessThanOrEqual(1)
            await context.close()
        })
    }
})

test.describe('browser tab titles', () => {
    const CASES: Array<[string, string]> = [
        ['/genres/movie/28', 'Action Movies - NetTrailers'],
        ['/genres/tv/18', 'Drama TV Shows - NetTrailers'],
        ['/genres/movie/28?name=Explosions', 'Explosions Movies - NetTrailers'],
        ['/person/6384', 'Keanu Reeves - NetTrailers'],
        ['/community/rankings', 'Community Rankings - NetTrailers'],
        ['/community/threads', 'Community Threads - NetTrailers'],
        ['/community/polls', 'Community Polls - NetTrailers'],
        ['/ratings', 'My Ratings - NetTrailers'],
    ]
    for (const [route, title] of CASES) {
        test(`${route} has its own title`, async ({ page }) => {
            await stubExternalMedia(page)
            // The server renders the title, so it is right before any script runs
            const html = await (await page.request.get(route)).text()
            expect(html).toContain(`<title>${title}</title>`)
            await page.goto(route)
            await expect(page).toHaveTitle(title)
        })
    }

    test('switching community tabs updates the title', async ({ page }) => {
        await stubExternalMedia(page)
        await page.goto('/community/rankings')
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
        await page
            .getByRole('button', { name: /Threads/ })
            .first()
            .click()
        await expect(page).toHaveTitle('Community Threads - NetTrailers')
    })
})

test.describe('Watch Later icon', () => {
    test('Collections shows the bookmark icon, not a TV emoji', async ({ browser, baseURL }) => {
        const { context, page } = await open(browser, baseURL, 'phone')
        await page.goto('/collections')
        await waitForGuestHeader(page)
        // Watch Later is always the first collection
        await expect(page.getByRole('heading', { name: 'Watch Later' }).first()).toBeVisible({
            timeout: 15_000,
        })
        const icon = page.getByTestId('collection-icon').first()
        await expect(icon.locator('svg')).toHaveCount(1)
        await expect(icon).not.toContainText('📺')
        await context.close()
    })
})

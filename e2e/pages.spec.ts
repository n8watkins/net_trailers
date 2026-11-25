import { expect, test, type Browser, type Page } from '@playwright/test'

import { stubExternalMedia } from './stub-media'

/**
 * Page-level fixes from the UX audit: one scroll bar, the guest Profile, the
 * guest header, and phone pages that never scroll sideways.
 */

const PHONE = {
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
}

async function open(browser: Browser, baseURL: string | undefined, options: object) {
    const context = await browser.newContext({
        ...options,
        baseURL,
        storageState: {
            cookies: [],
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

/** Waits until the header shows the guest controls (the session has been read). */
async function waitForGuestHeader(page: Page) {
    await expect(page.locator('header').getByRole('button', { name: 'User menu' })).toBeVisible({
        timeout: 15_000,
    })
}

test.describe('scroll bar', () => {
    test('the page has only the native scroll bar, and locking scroll does not shift it', async ({
        page,
    }) => {
        await stubExternalMedia(page)
        await page.setViewportSize({ width: 1440, height: 900 })
        await page.goto('/')
        await waitForGuestHeader(page)

        const scroll = await page.evaluate(() => ({
            scroller: document.scrollingElement?.tagName,
            custom: document.querySelectorAll('.custom-scrollbar').length,
            bodyOverflow: getComputedStyle(document.body).overflowY,
            gutter: getComputedStyle(document.documentElement).scrollbarGutter,
            color: getComputedStyle(document.documentElement).scrollbarColor,
        }))
        expect(scroll.scroller).toBe('HTML')
        expect(scroll.custom).toBe(0)
        // body passes its overflow to the viewport instead of scrolling itself
        expect(scroll.bodyOverflow).toBe('visible')
        expect(scroll.gutter).toBe('stable')
        // brand-500 thumb
        expect(scroll.color).toMatch(/rgb\(229, 9, 20\)|#e50914/i)

        // A window that locks scrolling (About) keeps the page the same width
        const before = await page.evaluate(() => document.documentElement.clientWidth)
        await expect(async () => {
            await page
                .getByRole('button', { name: /About this project/ })
                .first()
                .click({ timeout: 2_000 })
            await expect(page.getByRole('dialog')).toBeVisible({ timeout: 2_000 })
        }).toPass({ timeout: 20_000 })
        expect(await page.evaluate(() => getComputedStyle(document.body).overflow)).toBe('hidden')
        expect(await page.evaluate(() => document.documentElement.clientWidth)).toBe(before)
    })
})

test.describe('guest Profile', () => {
    test('"limitations" opens Help, and no rankings request is made', async ({ page }) => {
        await stubExternalMedia(page)
        const rankingRequests: string[] = []
        const failures: string[] = []
        page.on('request', (req) => {
            if (req.url().includes('/api/rankings')) rankingRequests.push(req.url())
        })
        page.on('response', (res) => {
            if (res.status() === 401) failures.push(res.url())
        })

        await page.goto('/profile')
        const limitations = page.getByRole('button', { name: 'limitations', exact: true })
        await expect(limitations).toBeVisible({ timeout: 15_000 })
        await expect(async () => {
            await limitations.click({ timeout: 2_000 })
            await expect(page.getByRole('heading', { name: 'How to Use NetTrailers' })).toBeVisible(
                { timeout: 2_000 }
            )
        }).toPass({ timeout: 20_000 })

        expect(rankingRequests).toEqual([])
        expect(failures).toEqual([])
    })
})

test.describe('guest header', () => {
    for (const width of [1024, 1152, 1280, 1366, 1440]) {
        test(`one sign-in control and nothing overlaps at ${width} px`, async ({ page }) => {
            await stubExternalMedia(page)
            await page.setViewportSize({ width, height: 900 })
            await page.goto('/')
            await waitForGuestHeader(page)
            const header = page.locator('header')

            await expect(header.getByRole('button', { name: 'Sign in', exact: true })).toHaveCount(
                1
            )
            // The menu half of the same pill, not a second, empty avatar
            const pill = await header
                .getByRole('button', { name: 'Sign in', exact: true })
                .evaluate((el) => el.parentElement!.getBoundingClientRect().toJSON())
            const menu = (await header.getByRole('button', { name: 'User menu' }).boundingBox())!
            expect(menu.x).toBeGreaterThanOrEqual(pill.left)
            expect(menu.x + menu.width).toBeLessThanOrEqual(pill.right + 0.5)

            // The nav ends before the account control starts
            const navRight = await header.evaluate((h) => {
                const nav = h.querySelector('div.lg\\:flex')!
                let right = 0
                for (const el of nav.querySelectorAll('a, button')) {
                    const r = el.getBoundingClientRect()
                    if (r.width > 0) right = Math.max(right, r.right)
                }
                return right
            })
            expect(navRight).toBeLessThan(pill.left)
            // and the whole control is on screen
            expect(pill.right).toBeLessThanOrEqual(width)
        })
    }

    test('clicking Sign in opens the sign-in window', async ({ page }) => {
        await stubExternalMedia(page)
        await page.setViewportSize({ width: 1280, height: 900 })
        await page.goto('/')
        await waitForGuestHeader(page)
        await page.getByRole('button', { name: 'Sign in', exact: true }).click()
        await expect(page.getByPlaceholder('you@example.com')).toBeVisible()
    })
})

test.describe('phone pages', () => {
    const ROUTES = [
        '/',
        '/genres/movie/28',
        '/movies',
        '/tv',
        '/profile',
        '/collections',
        '/settings',
        '/community/rankings',
        '/security',
        '/changelog',
        '/privacy',
        '/terms',
    ]

    test('no page scrolls sideways at 390 px', async ({ browser, baseURL }) => {
        const { context, page } = await open(browser, baseURL, PHONE)
        const wide: string[] = []
        for (const route of ROUTES) {
            await page.goto(route)
            await page.waitForLoadState('networkidle')
            const width = await page.evaluate(() => document.documentElement.scrollWidth)
            if (width > 390) wide.push(`${route}: ${width}`)
        }
        expect(wide).toEqual([])
        await context.close()
    })

    test('a genre page title clears the header and its cards fit', async ({ browser, baseURL }) => {
        const { context, page } = await open(browser, baseURL, PHONE)
        await page.goto('/genres/movie/28')
        const title = page.getByRole('heading', { level: 1, name: 'Action Movies' })
        await expect(title).toBeVisible({ timeout: 15_000 })
        const headerBox = (await page.locator('header').boundingBox())!
        const titleBox = (await title.boundingBox())!
        expect(titleBox.y).toBeGreaterThanOrEqual(headerBox.y + headerBox.height)

        const grid = page.getByTestId('content-grid')
        await expect(grid.locator('[data-tour="content-card"]').first()).toBeVisible()
        const cards = await grid
            .locator('[data-tour="content-card"]')
            .evaluateAll((els) => els.slice(0, 2).map((el) => el.getBoundingClientRect().toJSON()))
        // Two columns with a small gap, not pushed to the edges
        expect(cards[1].left - cards[0].right).toBeLessThanOrEqual(24)
        await context.close()
    })
})

import { expect, test, type Page } from '@playwright/test'

import { stubExternalMedia } from './stub-media'

/**
 * Three small fixes: the community addresses open their own tab, the desktop
 * Surprise Me! control works from the keyboard, and the phone search page has
 * a search box.
 */

const PHONE = {
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
}

/** Tabs from the top of the page until the control with this name has focus. */
async function tabTo(page: Page, name: string) {
    await page.locator('body').click({ position: { x: 2, y: 2 } })
    for (let i = 0; i < 12; i++) {
        await page.keyboard.press('Tab')
        const label = await page.evaluate(
            () =>
                document.activeElement?.getAttribute('aria-label') ??
                document.activeElement?.textContent?.trim() ??
                ''
        )
        if (label === name) return
    }
    throw new Error(`Tab never reached "${name}"`)
}

test.describe('community addresses', () => {
    const tabs = [
        { path: '/community/rankings', heading: 'Community Rankings' },
        { path: '/community/forums', heading: 'Community Threads' },
        { path: '/community/threads', heading: 'Community Threads' },
        { path: '/community/polls', heading: 'Community Polls' },
    ]
    for (const { path, heading } of tabs) {
        test(`${path} opens the ${heading} tab`, async ({ page }) => {
            await stubExternalMedia(page)
            await page.goto(path)
            await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible()
            expect(new URL(page.url()).pathname).toBe(path)
        })
    }
})

test.describe('Surprise Me! on desktop', () => {
    for (const key of ['Enter', 'Space']) {
        test(`is reached with Tab, shows a focus ring and asks for a title with ${key}`, async ({
            page,
        }) => {
            await stubExternalMedia(page)
            // The random pick needs live TMDB paging, which the fixtures do not cover.
            await page.route('**/api/random-content*', (route) =>
                route.fulfill({
                    contentType: 'application/json',
                    body: JSON.stringify({
                        content: {
                            id: 603,
                            media_type: 'movie',
                            title: 'Surprise Test Film',
                            overview: 'A film picked at random.',
                            backdrop_path: null,
                            poster_path: null,
                            release_date: '1999-03-30',
                            genre_ids: [],
                        },
                        contents: [],
                    }),
                })
            )
            await page.setViewportSize({ width: 1440, height: 900 })
            await page.goto('/')
            const button = page.getByRole('button', { name: 'Surprise Me!' })
            await expect(button).toBeVisible()
            // The server-rendered button can be focused before React has attached its
            // click handler, and a key press then does nothing. Wait for hydration.
            await expect
                .poll(() =>
                    button.evaluate((el) =>
                        Object.keys(el).some((key) => key.startsWith('__reactProps$'))
                    )
                )
                .toBe(true)
            await tabTo(page, 'Surprise Me!')

            await expect(button).toBeFocused()
            await expect
                .poll(() => button.evaluate((el) => getComputedStyle(el).boxShadow))
                .toContain('rgb(255, 90, 97)')

            // The key must reach the control's handler, which asks for a random title.
            // (Whether the title window then paints is the modal's own business and is
            // slow under load, so it is not what this test measures.)
            const asked = page.waitForRequest('**/api/random-content?*')
            await page.keyboard.press(key)
            await asked
        })
    }
})

test.describe('search page on a phone', () => {
    test('has a search box that finds titles', async ({ browser, baseURL }) => {
        const context = await browser.newContext({
            ...PHONE,
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
        // The fixtures do not cover a free-text search
        await page.route('**/api/search?*', (route) =>
            route.fulfill({
                contentType: 'application/json',
                body: JSON.stringify({
                    results: [
                        {
                            id: 603,
                            media_type: 'movie',
                            title: 'Matrix Test Film',
                            overview: 'A film found by the test.',
                            backdrop_path: null,
                            poster_path: null,
                            release_date: '1999-03-30',
                            genre_ids: [],
                            vote_average: 8,
                        },
                    ],
                    total_results: 1,
                }),
            })
        )
        await page.goto('/search')

        const box = page.getByRole('main').getByRole('searchbox', { name: /search/i })
        await expect(box).toBeVisible()
        await box.fill('matrix')
        await expect(page).toHaveURL(/\/search\?q=matrix/)
        await expect(page.getByRole('main').getByText('Matrix Test Film').first()).toBeVisible()
        // The box survives the search (the loading view must not replace it) and keeps its text
        await expect(box).toHaveValue('matrix')
        await context.close()
    })
})

import { test, expect } from '@playwright/test'

/**
 * Branding: the n8builds credit and the TMDB attribution in the footer, 40 px
 * tap targets on every footer link, and Privacy and Terms on the shared
 * sub-page layout with even side margins (the audit measured 32 px left
 * against 16 px right on a phone).
 */

for (const [name, viewport] of [
    ['phone', { width: 390, height: 844 }],
    ['desktop', { width: 1440, height: 900 }],
] as const) {
    test.describe(name, () => {
        test.use({ viewport })

        test('the footer credits n8builds and TMDB, with 40 px tap targets', async ({ page }) => {
            await page.goto('/security')
            const footer = page.getByRole('contentinfo')
            await footer.scrollIntoViewIfNeeded()

            const nate = footer.getByRole('link', { name: /Built by Nate at n8builds\.dev/ })
            await expect(nate).toHaveAttribute('href', 'https://n8builds.dev')
            await expect(nate.locator('img')).toBeVisible()
            await expect(
                footer.getByText(`© ${new Date().getFullYear()} Nathan Watkins`)
            ).toBeVisible()

            await expect(
                footer.getByText(
                    'This product uses the TMDB API but is not endorsed or certified by TMDB.'
                )
            ).toBeVisible()
            await expect(footer.locator('img[src="/brand/tmdb-logo.svg"]')).toBeVisible()

            const targets = footer.locator('a, button')
            const count = await targets.count()
            expect(count).toBeGreaterThan(12)
            for (let i = 0; i < count; i++) {
                const box = await targets.nth(i).boundingBox()
                if (!box) continue // hidden at this width (keyboard shortcuts)
                expect(box.height, `footer control ${i}`).toBeGreaterThanOrEqual(39.5)
            }
        })

        for (const path of ['privacy', 'terms']) {
            test(`/${path} uses the shared layout with even margins`, async ({ page }) => {
                await page.goto(`/${path}`)
                await expect(page.getByRole('banner')).toBeVisible()
                const h1 = page.getByRole('heading', { level: 1 })
                await expect(h1.locator('xpath=..').locator('img')).toBeVisible()
                const box = await h1.boundingBox()
                expect(box).not.toBeNull()
                if (name === 'phone') {
                    // The title icon sits at the page margin; text must not run past 16 px from the right
                    const widest = await page.evaluate(() => {
                        const main = document.querySelector('main')!
                        const rects = Array.from(main.querySelectorAll('p, li, h2'))
                            .map((el) => el.getBoundingClientRect())
                            .filter((r) => r.width > 0)
                        return {
                            left: Math.min(...rects.map((r) => r.left)),
                            right: Math.max(...rects.map((r) => r.right)),
                            width: window.innerWidth,
                        }
                    })
                    expect(Math.round(widest.left)).toBe(16)
                    expect(widest.width - Math.round(widest.right)).toBeGreaterThanOrEqual(15)
                }
            })
        }
    })
}

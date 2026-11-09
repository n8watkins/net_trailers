import { test, expect, type Page } from '@playwright/test'

/**
 * For you as a guest. Tests run without a Gemini key, so this covers the
 * honest fallback: TMDB picks labelled "Similar to ..." and a notice saying
 * why there are no AI reasons. The AI path is covered by __tests__/lib/forYou.test.ts.
 */

async function pickAndShow(page: Page) {
    await page.goto('/recommendations')
    await expect(page.getByRole('heading', { name: 'Pick 5 you love' })).toBeVisible()
    const show = page.getByRole('button', { name: 'Show my picks' })
    await expect(show).toBeDisabled()

    const tiles = page.getByRole('button', { name: /^Pick / })
    await expect(tiles.first()).toBeVisible()
    for (let i = 0; i < 4; i++) {
        await tiles.first().click()
    }
    // Search to add the fifth
    await page.getByRole('searchbox', { name: 'Search to add a title' }).fill('arrival')
    await page
        .getByRole('button', { name: /^Pick Arrival$/ })
        .first()
        .click()
    await expect(page.getByText('5 picked')).toBeVisible()

    await show.click()
    await expect(page.getByRole('heading', { name: 'For you' })).toBeVisible()
    await expect(
        page.getByText(/Because you love .*Arrival|Because you love .* and \d more/)
    ).toBeVisible()
}

test('a guest picks 5 titles and gets picks, with an honest note when AI is off', async ({
    page,
}) => {
    await pickAndShow(page)
    await expect(page.getByText(/come straight from TMDB/)).toBeVisible()
    const reasons = page.locator('main ul li > p')
    await expect(reasons.first()).toBeVisible()
    expect(await reasons.count()).toBeGreaterThanOrEqual(6)
    for (const text of await reasons.allInnerTexts()) {
        expect(text).toMatch(/^Similar to /)
    }

    // The picks are ordinary likes: they show in My Ratings and survive a reload
    await page.reload()
    await expect(page.getByRole('heading', { name: 'For you' })).toBeVisible()
    await page.goto('/ratings')
    await expect(page.getByText('Arrival').first()).toBeVisible()
})

test.describe('on a phone', () => {
    test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })

    test('the picker and picks fit the screen', async ({ page }) => {
        await pickAndShow(page)
        const overflow = await page.evaluate(
            () => document.documentElement.scrollWidth - document.documentElement.clientWidth
        )
        expect(overflow).toBeLessThanOrEqual(0)
        await expect(page.getByRole('button', { name: 'Change picks' })).toBeVisible()
    })
})

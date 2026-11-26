import { expect, test, type Page } from '@playwright/test'

import { stubExternalMedia } from './stub-media'

/**
 * The title window (the large window that opens when you pick a title) is a
 * proper modal dialog: it has a role and a name, takes keyboard focus on open,
 * keeps Tab inside, closes with Escape and hands focus back to its opener.
 */

async function openTitleFromSurpriseMe(page: Page) {
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
    // A key press before React has attached its handlers is lost: wait for hydration.
    await expect
        .poll(() =>
            button.evaluate((el) => Object.keys(el).some((key) => key.startsWith('__reactProps$')))
        )
        .toBe(true)
    await button.focus()
    await expect(button).toBeFocused()
    await page.keyboard.press('Enter')
    return button
}

const insideDialog = (page: Page) =>
    page.evaluate(() => {
        const dialog = document.querySelector('[role="dialog"][aria-modal="true"]')
        return !!dialog && dialog.contains(document.activeElement)
    })

test.describe('title window as a dialog', () => {
    test('has a role and a name, traps focus, closes with Escape and returns focus', async ({
        page,
    }) => {
        const opener = await openTitleFromSurpriseMe(page)

        const dialog = page.getByRole('dialog', { name: 'Surprise Test Film' })
        await expect(dialog).toBeVisible()
        await expect(dialog).toHaveAttribute('aria-modal', 'true')

        // Focus moved into the window
        await expect.poll(() => insideDialog(page)).toBe(true)

        // Tab and Shift+Tab never leave it
        for (let i = 0; i < 25; i++) {
            await page.keyboard.press('Tab')
            expect(await insideDialog(page)).toBe(true)
        }
        for (let i = 0; i < 25; i++) {
            await page.keyboard.press('Shift+Tab')
            expect(await insideDialog(page)).toBe(true)
        }

        // Escape closes it and focus goes back to the button that opened it
        await page.keyboard.press('Escape')
        await expect(page.locator('[role="dialog"][aria-modal="true"]')).toHaveCount(0)
        await expect(opener).toBeFocused()
    })
})

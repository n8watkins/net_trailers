import { test, expect } from '@playwright/test'

/**
 * The changelog page renders CHANGELOG.md (written by release-kit) at build
 * time: no typed-in numbers, no "Unreleased" labels, nested bullets as lists,
 * and the site's own About window, tour included.
 */

test('the changelog shows the file, its numbers and the site windows', async ({ page }) => {
    await page.goto('/changelog')
    await expect(page.getByRole('heading', { level: 1, name: 'Changelog' })).toBeVisible()

    const main = page.getByRole('main')
    await expect(main).not.toContainText(/Unreleased|Upcoming|933\+|4 mos/)
    // The numbers at the top. Once a release exists, the newest entry also
    // carries a "Latest" badge, so the labels are found by their role.
    const stats = main.getByRole('term')
    await expect(stats.filter({ hasText: /^Latest$/ })).toBeVisible()
    await expect(stats.filter({ hasText: /^Releases$/ })).toBeVisible()

    // With a release, its entry leads: version, badge and date sit together
    // inside the card (not pinned to the top of the window), above its list.
    const releases = main.getByRole('article')
    if ((await releases.count()) > 0) {
        const newest = releases.first()
        const version = newest.getByRole('heading', { level: 2 })
        await expect(version).toHaveText(/^v\d+\.\d+\.\d+$/)
        await expect(newest.getByText('Latest', { exact: true })).toBeVisible()
        await expect(newest.getByRole('list').first()).toBeVisible()
        const card = await newest.boundingBox()
        const heading = await version.boundingBox()
        expect(card && heading && heading.y >= card.y && heading.x >= card.x).toBe(true)
    }

    // Earlier notes: the first one is open when there is no release yet, and
    // opens on a click otherwise. Its nested bullets are a nested list.
    const earlier = main.locator('details').first()
    if (!(await earlier.evaluate((el) => (el as HTMLDetailsElement).open))) {
        await earlier.locator('summary').click()
    }
    await expect(earlier.locator('ul ul').first()).toBeVisible()

    await main.getByRole('button', { name: 'About this project' }).click()
    const about = page.getByRole('dialog')
    await expect(about).toBeVisible()
    await expect(about.getByRole('button', { name: /show me around/i })).toBeVisible()
})

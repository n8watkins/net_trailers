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

    // The first earlier entry is open, with its nested bullets as a nested list
    const entry = main.locator('details[open]').first()
    await expect(entry.locator('ul ul').first()).toBeVisible()

    await main.getByRole('button', { name: 'About this project' }).click()
    const about = page.getByRole('dialog')
    await expect(about).toBeVisible()
    await expect(about.getByRole('button', { name: /show me around/i })).toBeVisible()
})

import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { expect, test, type Page } from '@playwright/test'

/**
 * Signed-in flows through the real email magic-link sign-in (test-mode
 * provider writes the link to .e2e/magic-links). One user, one page, in order.
 */

const email = `e2e-${Date.now()}@nettrailers.test`
const linkFile = join(process.cwd(), '.e2e', 'magic-links', `${email}.txt`)

async function readMagicLink(): Promise<string> {
    for (let i = 0; i < 50; i++) {
        try {
            return (await readFile(linkFile, 'utf8')).trim()
        } catch {
            await new Promise((resolve) => setTimeout(resolve, 200))
        }
    }
    throw new Error(`No magic link written to ${linkFile}`)
}

async function openHeroTitle(page: Page): Promise<string> {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    const title = page.locator('.MuiModal-root h3').first()
    // A click before hydration (or mid slide change) does nothing: retry until it opens
    await expect(async () => {
        await page
            .getByRole('button', { name: /More Info/i })
            .first()
            .click()
        await expect(title).toBeVisible({ timeout: 3_000 })
    }).toPass({ timeout: 30_000 })
    return (await title.textContent())?.trim() ?? ''
}

async function closeModal(page: Page) {
    await page.keyboard.press('Escape')
    await expect(page.getByRole('button', { name: 'Close modal' })).toBeHidden()
}

test.describe.configure({ mode: 'serial' })

let page: Page
let heroTitle = ''

test.beforeAll(async ({ browser }) => {
    page = await browser.newPage()
})

test.afterAll(async () => {
    await page.close()
})

test('signs in with an emailed magic link', async () => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Sign in', exact: true }).click()
    await page.getByPlaceholder('you@example.com').fill(email)
    await page.getByRole('button', { name: /Email me a sign-in link/i }).click()
    await expect(page.getByText('Check your inbox')).toBeVisible()

    await page.goto(await readMagicLink())
    await page.goto('/')
    await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toHaveCount(0)
    await expect(page.getByRole('button', { name: /User menu|Profile menu/ })).toBeVisible()
})

test('adds a title to My List and removes it', async () => {
    heroTitle = await openHeroTitle(page)
    await page
        .locator('.MuiModal-root')
        .getByRole('button', { name: 'Add to lists' })
        .first()
        .click()
    // The default list is called "Watch Later" for everyone
    const watchlist = page.getByRole('button', { name: /^Watch Later/ })
    await watchlist.click()
    await expect(page.getByText(`Added ${heroTitle} to`).first()).toBeVisible()

    await watchlist.click()
    await expect(page.getByText(`Removed ${heroTitle} from`).first()).toBeVisible()
    await closeModal(page)
})

test('likes a title, and the like shows in My Ratings', async () => {
    heroTitle = await openHeroTitle(page)
    const modal = page.locator('.MuiModal-root')
    // The title's own Like comes first; More Like cards below have their own
    await modal
        .getByRole('button', { name: /^Like$/ })
        .first()
        .click()
    await expect(page.getByText(`Liked ${heroTitle}`)).toBeVisible()
    await closeModal(page)
    // Signed-in changes are saved through the API; let the save finish
    await page.waitForLoadState('networkidle')

    await page.goto('/ratings')
    await expect(page.getByText(heroTitle).first()).toBeVisible()
    await expect(page.getByRole('button', { name: /Liked \(1\)/ })).toBeVisible()
})

test('hides a title and shows it again', async () => {
    const title = await openHeroTitle(page)
    const modal = page.locator('.MuiModal-root')
    await modal.getByRole('button', { name: 'Hide from recommendations' }).click()
    await expect(page.getByText(`${title} Hidden`)).toBeVisible()
    await modal.getByRole('button', { name: 'Show in recommendations' }).click()
    await expect(page.getByText(`${title} Shown`)).toBeVisible()
    await closeModal(page)
})

test('hiding a liked title keeps the like', async () => {
    // heroTitle was liked above; hiding it must not remove the like
    await page.goto('/ratings')
    await page.getByText(heroTitle).first().click()
    const modal = page.locator('.MuiModal-root')
    await modal.getByRole('button', { name: 'Hide from recommendations' }).click()
    await expect(page.getByText(`${heroTitle} Hidden`)).toBeVisible()
    await closeModal(page)
    await page.waitForLoadState('networkidle')

    await page.reload()
    await expect(page.getByRole('button', { name: /Liked \(1\)/ })).toBeVisible()
    await expect(page.getByText(heroTitle).first()).toBeVisible()
})

test('creates a collection and adds a title to it', async () => {
    heroTitle = await openHeroTitle(page)
    const modal = page.locator('.MuiModal-root')
    // "More Like <title>  + New Collection" starts a manual collection from those titles
    await modal
        .getByRole('button', { name: /New Collection/ })
        .first()
        .click()
    // Rename it: click the title, type, press Enter
    await page.getByRole('heading', { name: `More Like ${heroTitle}`, level: 1 }).click()
    const name = page.getByPlaceholder('Collection name')
    await name.fill('E2E Favorites')
    await name.press('Enter')
    await page.getByRole('button', { name: /^Create Collection$/ }).click()
    await expect(page.getByRole('heading', { name: 'E2E Favorites' })).toBeHidden()

    // Change the new collection straight away, with no reload. It starts with this
    // title, so take it out and put it back. The collection used to lose such edits
    // when its ~14 per-title saves landed after them; it now saves in one write.
    const titleModal = page.locator('.MuiModal-root')
    await titleModal.getByRole('button', { name: 'Add to lists' }).first().click()
    const favorites = titleModal.getByRole('button', { name: /E2E Favorites/ })
    await favorites.click()
    await expect(page.getByText(`Removed ${heroTitle} from "E2E Favorites"`)).toBeVisible()
    await favorites.click()
    await expect(page.getByText(`Added ${heroTitle} to "E2E Favorites"`)).toBeVisible()
    await closeModal(page)
    await page.waitForLoadState('networkidle')

    // A fresh load reads the saved collection back from the server
    await page.goto('/collections')
    await page.getByText('E2E Favorites').first().click()
    await expect(page.getByText(heroTitle).first()).toBeVisible()
})

test('records watch history', async () => {
    await page.goto('/history')
    await expect(page.getByText(heroTitle).first()).toBeVisible()
})

test('saves a setting', async () => {
    await page.goto('/settings/preferences')
    const autoMute = page.locator('input[type="checkbox"]').nth(1)
    const before = await autoMute.isChecked()
    await autoMute.locator('xpath=..').click()
    await expect(autoMute).toBeChecked({ checked: !before })
    await page.waitForTimeout(1500)

    await page.reload()
    await expect(page.locator('input[type="checkbox"]').nth(1)).toBeChecked({ checked: !before })
})

test('signs out', async () => {
    await page.goto('/')
    await page.getByRole('button', { name: /User menu|Profile menu/ }).click()
    await page.getByText('Sign Out', { exact: true }).click()
    await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible()
})

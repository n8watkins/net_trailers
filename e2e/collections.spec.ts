import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { expect, test, type Page } from '@playwright/test'

import { stubExternalMedia } from './stub-media'

/**
 * Collections: Settings and /collections show the same list, and the editor
 * has one saving model (Save writes; every other way out asks before
 * discarding).
 */

const email = `e2e-collections-${Date.now()}@nettrailers.test`
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

async function storedNames(page: Page): Promise<string[]> {
    const res = await page.request.get('/api/user/preferences')
    const json = await res.json()
    const data = json.data ?? json.preferences ?? json
    return (data.userCreatedWatchlists || []).map((l: { name: string }) => l.name)
}

test.describe.configure({ mode: 'serial' })

let page: Page

test.beforeAll(async ({ browser }) => {
    page = await browser.newPage()
    await stubExternalMedia(page)
    await page.goto('/')
    await page.getByRole('button', { name: 'Sign in', exact: true }).click()
    await page.getByPlaceholder('you@example.com').fill(email)
    await page.getByRole('button', { name: /Email me a sign-in link/i }).click()
    await expect(page.getByText('Check your inbox')).toBeVisible()
    await page.goto(await readMagicLink())
})

test.afterAll(async () => {
    await page.close()
})

async function cardNames(): Promise<string[]> {
    await expect(page.getByTestId('collection-card').first()).toBeVisible()
    return page.getByTestId('collection-card').locator('h3').allTextContents()
}

test('Settings and /collections list the same collections', async () => {
    await page.goto('/settings/collections')
    const settings = await cardNames()
    const settingsSummary = await page.getByTestId('home-summary').textContent()
    await page.goto('/collections')
    expect(await cardNames()).toEqual(settings)
    expect(await page.getByTestId('home-summary').textContent()).toBe(settingsSummary)
    expect(settings[0]).toBe('Watch Later')
})

test('the editor asks before discarding, whichever way you leave', async () => {
    await page.goto('/settings/collections')
    const editor = page.getByTestId('collection-editor')
    for (const leave of [
        () => page.keyboard.press('Escape'),
        () => page.mouse.click(5, 5),
        () => page.getByRole('button', { name: 'Close editor' }).click(),
    ]) {
        await page.getByRole('button', { name: 'Edit Action-Packed' }).click()
        await expect(editor).toBeFocused()
        await page.getByLabel('Collection name').fill('Not saved')
        await leave()
        await expect(page.getByText('Discard unsaved changes?')).toBeVisible()
        await page.getByRole('button', { name: 'Discard' }).click()
        await expect(editor).toBeHidden()
    }
    expect(await storedNames(page)).toContain('Action-Packed')
    expect(await storedNames(page)).not.toContain('Not saved')
})

test('Save writes the changes', async () => {
    await page.goto('/settings/collections')
    await page.getByRole('button', { name: 'Edit Action-Packed' }).click()
    await page.getByLabel('Collection name').fill('Big Action')
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByTestId('collection-editor')).toBeHidden()
    await expect.poll(() => storedNames(page)).toContain('Big Action')
})

test('a built-in genre row is hidden, not deleted', async () => {
    await page.goto('/settings/collections')
    await page.getByRole('button', { name: 'Edit Big Action' }).click()
    await expect(page.getByRole('button', { name: /^Delete/ })).toHaveCount(0)
    await page.getByRole('button', { name: 'Hide from home' }).click()
    const card = page.getByTestId('collection-card').filter({ hasText: 'Big Action' })
    await expect(card.getByTestId('home-status')).toHaveText('Hidden')
    await page.goto('/collections')
    await expect(
        page
            .getByTestId('collection-card')
            .filter({ hasText: 'Big Action' })
            .getByTestId('home-status')
    ).toHaveText('Hidden')
})

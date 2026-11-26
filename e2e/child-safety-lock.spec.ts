import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { expect, test, type Page } from '@playwright/test'

import { stubExternalMedia } from './stub-media'

/**
 * Child Safety Mode with a PIN: when the server keeps the mode on (the PIN
 * entry was not fresh), the settings screen shows it on again, says so and
 * asks for the PIN, instead of showing it off until a reload.
 */

const email = `e2e-child-safety-${Date.now()}@nettrailers.test`
const linkFile = join(process.cwd(), '.e2e', 'magic-links', `${email}.txt`)
const PIN = '4321'

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

async function storedMode(page: Page): Promise<boolean> {
    const res = await page.request.get('/api/user/preferences')
    return (await res.json()).preferences.childSafetyMode
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

    // Child Safety Mode on, protected by a PIN.
    const origin = new URL(page.url()).origin
    const prefs = (await (await page.request.get('/api/user/preferences')).json()).preferences
    const put = await page.request.put('/api/user/preferences', {
        data: { preferences: { ...prefs, childSafetyMode: true } },
        headers: { Origin: origin },
    })
    expect(put.ok()).toBe(true)
    const pin = await page.request.post('/api/child-safety/pin', {
        data: { pin: PIN },
        headers: { Origin: origin },
    })
    expect(pin.status()).toBe(201)
})

test.afterAll(async () => {
    await page.close()
})

const modeSwitch = () =>
    page
        .locator('div.flex.items-start.justify-between', { hasText: 'Child Safety Mode' })
        .locator('input[type="checkbox"]')

async function switchOffWithPin() {
    await modeSwitch().locator('..').click()
    await page.getByPlaceholder('4-6 digits').fill(PIN)
    await page.getByRole('button', { name: 'Verify' }).click()
}

test('a mode kept on by the server shows on again and asks for the PIN', async () => {
    await page.goto('/settings/preferences')
    await expect(modeSwitch()).toBeChecked()

    // The PIN check answers yes without reaching the server, so no unlock is
    // recorded: the same as an unlock that has run out.
    await page.route('**/api/child-safety/pin?action=verify', (route) =>
        route.fulfill({ status: 200, json: { success: true } })
    )
    await switchOffWithPin()

    await expect(page.getByText('Child Safety Mode is still on')).toBeVisible()
    await expect(page.getByText('Enter your PIN again to turn it off.')).toBeVisible()
    await expect(modeSwitch()).toBeChecked()
    await expect(page.getByRole('button', { name: 'Verify' })).toBeVisible()
    expect(await storedMode(page)).toBe(true)
    await page.unroute('**/api/child-safety/pin?action=verify')

    // With the real PIN check the next try turns it off.
    await page.getByPlaceholder('4-6 digits').fill(PIN)
    await page.getByRole('button', { name: 'Verify' }).click()
    await expect(modeSwitch()).not.toBeChecked()
    await expect.poll(() => storedMode(page)).toBe(false)
})

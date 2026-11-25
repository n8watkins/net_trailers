import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { expect, test, type Page } from '@playwright/test'

import { stubExternalMedia } from './stub-media'

/**
 * The settings frame (title and section menu) arrives with the page instead of
 * after the session check, signed in or out; a signed-in hard load does not ask
 * for the session; phones get the menu and a section one at a time.
 */

test.beforeEach(async ({ page }) => {
    await stubExternalMedia(page)
})

const MENU_ITEM = 'Content filters and playback settings'

test.describe('signed out', () => {
    test('the server sends the whole frame; no page-wide spinner', async ({ page, request }) => {
        // The HTML itself, before any script runs, has the title, the menu and the heading
        const html = await (await request.get('/settings/notifications')).text()
        expect(html).toContain(MENU_ITEM)
        expect(html).toContain('Manage how you receive notifications')
        expect(html).not.toContain('Loading settings')
        // Guests get the guest menu
        expect(html).not.toContain('Account Management')

        await page.goto('/settings/notifications')
        await expect(page.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible()
        await expect(page.getByText(MENU_ITEM)).toBeVisible()
        await expect(page.locator('[data-settings-pending]')).toHaveCount(0)
    })

    test('/settings is a page, not a redirect', async ({ request }) => {
        const res = await request.get('/settings', { maxRedirects: 0 })
        expect(res.status()).toBe(200)
    })

    test('the Settings tab is lit on every settings page', async ({ page }) => {
        for (const path of ['/settings', '/settings/collections', '/settings/account']) {
            await page.goto(path)
            await expect(
                page
                    .getByRole('navigation', { name: 'User navigation' })
                    .getByRole('link', { name: 'Settings' })
            ).toHaveAttribute('aria-current', 'page')
        }
    })

    test('each settings page has its own tab title', async ({ page }) => {
        await page.goto('/settings')
        await expect(page).toHaveTitle('Settings - NetTrailers')
        await page.goto('/settings/notifications')
        await expect(page).toHaveTitle('Notifications - Settings - NetTrailers')
        await page.goto('/settings/collections')
        await expect(page).toHaveTitle('Collections - Settings - NetTrailers')
        // and after an in-app move between sections
        await page.getByRole('link', { name: /^Data Management/ }).click()
        await expect(page).toHaveTitle('Data Management - Settings - NetTrailers')
        await page.goto('/profile')
        await expect(page).toHaveTitle('Profile - NetTrailers')
    })

    test('public pages and the guest settings shells set no cookie (edge-cacheable)', async ({
        request,
    }) => {
        for (const path of ['/', '/search', '/settings', '/settings/preferences']) {
            const res = await request.get(path)
            expect(res.status(), path).toBe(200)
            expect(res.headers()['set-cookie'], path).toBeUndefined()
        }
    })
})

test.describe('on a phone', () => {
    test.use({ viewport: { width: 390, height: 844 } })

    test('/settings is the menu, a section is its panel with a way back', async ({ page }) => {
        await page.goto('/settings')
        await expect(page.getByText(MENU_ITEM)).toBeVisible()
        await expect(page.getByRole('heading', { name: 'Preferences', level: 2 })).toBeHidden()

        await page.getByRole('link', { name: /^Notifications/ }).click()
        await expect(page).toHaveURL(/\/settings\/notifications$/)
        await expect(page.getByRole('heading', { name: 'Notifications', level: 2 })).toBeVisible()
        await expect(page.getByText(MENU_ITEM)).toBeHidden()

        await page.getByRole('link', { name: 'All settings' }).click()
        await expect(page).toHaveURL(/\/settings$/)
        await expect(page.getByText(MENU_ITEM)).toBeVisible()
    })
})

test.describe('signed in', () => {
    test.describe.configure({ mode: 'serial' })

    let page: Page
    const email = `e2e-settings-${Date.now()}@nettrailers.test`

    test.beforeAll(async ({ browser }) => {
        page = await browser.newPage()
        await stubExternalMedia(page)
        await page.goto('/')
        await page.getByRole('button', { name: 'Sign in', exact: true }).click()
        await page.getByPlaceholder('you@example.com').fill(email)
        await page.getByRole('button', { name: /Email me a sign-in link/i }).click()
        await expect(page.getByText('Check your inbox')).toBeVisible()
        const file = join(process.cwd(), '.e2e', 'magic-links', `${email}.txt`)
        let link = ''
        for (let i = 0; i < 50 && !link; i++) {
            link = await readFile(file, 'utf8').then(
                (s) => s.trim(),
                () => new Promise<string>((r) => setTimeout(() => r(''), 200))
            )
        }
        await page.goto(link)
    })

    test.afterAll(async () => {
        await page.close()
    })

    test('a hard load renders the account frame and never asks for the session', async () => {
        const sessionReads: string[] = []
        page.on('request', (req) => {
            if (new URL(req.url()).pathname === '/api/auth/session') sessionReads.push(req.url())
        })

        const res = await page.goto('/settings/preferences')
        const html = (await res?.text()) ?? ''
        // The account-only sections are in the server's HTML
        expect(html).toContain('Account Management')
        expect(html).not.toContain('Loading settings')

        await expect(page.getByRole('link', { name: /^Account Management/ })).toBeVisible()
        await expect(page.locator('[data-settings-pending]')).toHaveCount(0)
        await page.waitForLoadState('networkidle')
        expect(sessionReads).toEqual([])
    })

    test('the account panel shows the account with the first paint', async () => {
        const res = await page.goto('/settings/account-management')
        expect((await res?.text()) ?? '').toContain(email)
        await expect(page.getByText(email)).toBeVisible()
    })

    test('the profile panel loads the profile in one request', async () => {
        const profileReads: string[] = []
        page.on('request', (req) => {
            if (new URL(req.url()).pathname.startsWith('/api/profiles/'))
                profileReads.push(req.url())
        })
        await page.goto('/settings/profile')
        await expect(page.getByRole('heading', { name: 'Profile', level: 2 })).toBeVisible()
        await page.waitForLoadState('networkidle')
        expect(profileReads).toHaveLength(1)
    })
})

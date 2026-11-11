import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { createClient } from '@libsql/client'
import { expect, test, type Browser, type Page } from '@playwright/test'

import { stubExternalMedia } from './stub-media'

/**
 * The admin area end to end: the server gate (redirect, 403), the opt-out
 * filter, the confirm step, the test send, the fresh sign-in check, the audit
 * log, the cron routes, the data fixes, and every remaining admin control.
 *
 * The admin is ADMIN_EMAILS in playwright.config.ts. No email leaves the
 * machine: the e2e server has no email binding.
 */

const ADMIN_EMAIL = 'admin@nettrailers.test'
const stamp = Date.now()
const db = createClient({ url: 'file:.e2e/test.db' })

async function readMagicLink(email: string): Promise<string> {
    const file = join(process.cwd(), '.e2e', 'magic-links', `${email.toLowerCase()}.txt`)
    for (let i = 0; i < 50; i++) {
        try {
            return (await readFile(file, 'utf8')).trim()
        } catch {
            await new Promise((resolve) => setTimeout(resolve, 200))
        }
    }
    throw new Error(`No magic link written to ${file}`)
}

/** Sign in through Auth.js's own email endpoint and the emailed link. */
async function signIn(page: Page, baseURL: string, email: string) {
    const { csrfToken } = await (await page.request.get('/api/auth/csrf')).json()
    const response = await page.request.post('/api/auth/signin/email', {
        headers: { Origin: baseURL, 'X-Auth-Return-Redirect': '1' },
        form: {
            email,
            csrfToken,
            callbackUrl: baseURL,
            'cf-turnstile-response': 'XXXX.DUMMY.TOKEN.XXXX',
        },
    })
    expect((await response.json()).url).toContain('verify-request')
    await page.goto(await readMagicLink(email))
}

async function newPage(browser: Browser) {
    const page = await browser.newPage()
    await stubExternalMedia(page)
    return page
}

/** Users with email on, unsubscribed, and never asked (email off by default). */
const people = {
    optIn: { id: `optin-${stamp}`, email: `optin-${stamp}@nettrailers.test`, email_on: true },
    unsub: { id: `unsub-${stamp}`, email: `unsub-${stamp}@nettrailers.test`, email_on: false },
    quiet: { id: `quiet-${stamp}`, email: `quiet-${stamp}@nettrailers.test`, email_on: null },
}

test.describe.configure({ mode: 'serial' })

test.beforeAll(async () => {
    const now = Date.now()
    for (const p of Object.values(people)) {
        await db.execute({
            sql: 'INSERT INTO user (id, email, name, createdAt) VALUES (?, ?, ?, ?)',
            args: [p.id, p.email, p.id === people.optIn.id ? 'Opt, "In" =1' : null, now],
        })
        if (p.email_on !== null) {
            await db.execute({
                sql: 'INSERT INTO user_preferences (userId, data, updatedAt) VALUES (?, ?, ?)',
                args: [p.id, JSON.stringify({ notifications: { email: p.email_on } }), now],
            })
        }
    }
})

test.afterAll(() => db.close())

test('signed-out visitors are sent home from /admin', async ({ page }) => {
    const response = await page.request.get('/admin', { maxRedirects: 0 })
    expect(response.status()).toBe(307)
    expect(response.headers().location).toMatch(/\/$/)
    await page.goto('/admin/accounts')
    await expect(page).toHaveURL(/\/$/)
})

test('a signed-in non-admin gets 403 on the pages and the APIs', async ({ browser, baseURL }) => {
    const page = await newPage(browser)
    await signIn(page, baseURL!, `visitor-${stamp}@nettrailers.test`)
    for (const path of ['/admin', '/admin/accounts', '/admin/signups', '/admin/activity']) {
        const response = await page.goto(path)
        expect(response?.status(), path).toBe(403)
        await expect(page.getByText('This page is only for administrators.')).toBeVisible()
    }
    for (const path of ['/api/admin/users', '/api/admin/audit', '/api/admin/jobs']) {
        expect((await page.request.get(path)).status(), path).toBe(403)
    }
    const send = await page.request.post('/api/admin/email/send', {
        headers: { Origin: baseURL! },
        data: { mode: 'test', template: 'announcement', subject: 'x', customMessage: 'y' },
    })
    expect(send.status()).toBe(403)
    await page.close()
})

test.describe('as the admin', () => {
    let page: Page
    let origin = ''

    test.beforeAll(async ({ browser, baseURL }) => {
        origin = baseURL!
        page = await newPage(browser)
        await signIn(page, baseURL!, ADMIN_EMAIL)
    })

    test.afterAll(async () => {
        await page.close()
    })

    test('the dashboard shows real data and no stubs', async () => {
        await page.goto('/admin')
        await expect(page.getByRole('heading', { name: 'Admin Dashboard' })).toBeVisible()
        // Email usage is real; the fake panels are gone
        await expect(page.getByTestId('email-usage')).toContainText(/\d+ \/ \d+/)
        for (const gone of [
            'Healthy',
            'System Logs',
            'Status: Active',
            'Every 6 hours',
            'Seed Social',
            'Trigger Demo',
            'Vercel',
            'View Full Documentation',
        ]) {
            await expect(page.getByText(gone)).toHaveCount(0)
        }
        // The real weekly schedule with next runs
        await expect(page.getByText('Trending digest: Mondays at 02:00 UTC')).toBeVisible()
        await expect(page.getByText('Social digest: Wednesdays at 02:00 UTC')).toBeVisible()
        await expect(page.getByText('Collection cache refresh: Sundays at 02:00 UTC')).toBeVisible()
        // The admin's own sign-up is counted (signup_log)
        await expect(page.getByText(/Last signup: (?!None)/)).toBeVisible()
    })

    test('the stat cards open their pages', async () => {
        await page.goto('/admin')
        await page.getByRole('button', { name: /Total Accounts/ }).click()
        await expect(page).toHaveURL(/\/admin\/accounts$/)
        await page.getByRole('button', { name: 'Back to Dashboard' }).click()
        await page.getByRole('button', { name: /Signups This Month/ }).click()
        await expect(page).toHaveURL(/\/admin\/signups$/)
        await page.getByRole('button', { name: 'Back to Dashboard' }).click()
        await page.getByRole('button', { name: /Activity This Month/ }).click()
        await expect(page).toHaveURL(/\/admin\/activity$/)
    })

    test('accounts: real dates, filters, search and a quoted CSV', async () => {
        await page.goto('/admin/accounts')
        await expect(page.getByText('1969')).toHaveCount(0)
        const adminRow = page.getByRole('row', { name: new RegExp(ADMIN_EMAIL) })
        await expect(adminRow).toContainText(new Date().getFullYear().toString())

        await page.getByPlaceholder('Search by name or email...').fill(people.optIn.email)
        await expect(page.getByRole('heading', { name: 'All Accounts (1)' })).toBeVisible()
        await page.getByPlaceholder('Search by name or email...').fill('')

        const [provider, status] = await page.locator('select').all()
        await provider.selectOption('github')
        await expect(page.getByText('No accounts found matching your filters')).toBeVisible()
        await provider.selectOption('email')
        await expect(adminRow).toBeVisible()
        await provider.selectOption('all')
        await status.selectOption('verified')
        // The admin signed in by email link, so is verified; the inserted users are not
        await expect(adminRow).toBeVisible()
        await expect(page.getByRole('row', { name: new RegExp(people.quiet.email) })).toHaveCount(0)
        await status.selectOption('unverified')
        await expect(page.getByRole('row', { name: new RegExp(people.quiet.email) })).toBeVisible()
        await status.selectOption('all')

        await page.getByPlaceholder('Search by name or email...').fill(people.optIn.email)
        const download = page.waitForEvent('download')
        await page.getByRole('button', { name: 'Export to CSV' }).click()
        const csv = await readFile(await (await download).path(), 'utf8')
        const [header, row] = csv.split('\r\n')
        expect(header).toBe('"Name","Email","Joined","Last Sign In","Verified","Provider"')
        expect(row.startsWith(`"Opt, ""In"" =1","${people.optIn.email}",`)).toBe(true)
    })

    test('sign-ups: this week and this month list the new accounts', async () => {
        await page.goto('/admin/signups')
        await page.getByRole('button', { name: 'This Week' }).click()
        await expect(page.getByText(people.optIn.email)).toBeVisible()
        await page.getByRole('button', { name: 'This Month' }).click()
        await expect(page.getByText(ADMIN_EMAIL).first()).toBeVisible()
    })

    test('activity: the Logins and Page Views tabs filter by type', async () => {
        await page.goto('/admin/activity')
        await page.getByRole('button', { name: 'Logins' }).click()
        // Every sign-in records a login event
        await expect(page.getByText(ADMIN_EMAIL).first()).toBeVisible()
        await page.getByRole('button', { name: 'Page Views' }).click()
        await expect(page.getByText('Logins and page views this month')).toBeVisible()
        await page.getByRole('button', { name: 'This Week' }).click()
        await page.getByRole('button', { name: 'All Activity' }).click()
        await expect(page.getByText(ADMIN_EMAIL).first()).toBeVisible()

        const logins = await (await page.request.get('/api/admin/activity?type=login')).json()
        expect(logins.activities.length).toBeGreaterThan(0)
        expect(logins.activities.every((a: { type: string }) => a.type === 'login')).toBe(true)
        expect((await page.request.get('/api/admin/activity?type=logins')).status()).toBe(400)
    })

    test('recipients: unsubscribed users cannot be selected, no stray 0 or Anonymous User', async () => {
        await page.goto('/admin')
        const list = page.locator('label', { hasText: people.unsub.email })
        await expect(list).toContainText('Email off')
        await expect(list.getByRole('checkbox')).toBeDisabled()
        await expect(
            page.locator('label', { hasText: people.quiet.email }).getByRole('checkbox')
        ).toBeDisabled()
        await expect(page.getByText('Anonymous User')).toHaveCount(0)
        await expect(page.locator('label', { hasText: people.optIn.email })).not.toContainText(
            /^0|\s0$/
        )

        // Each filter button works
        for (const name of [
            /Trending Opt-in/,
            /Social Opt-in/,
            /Recently Active/,
            /Inactive/,
            /All Users/,
        ]) {
            await page.getByRole('button', { name }).click()
        }
        await page.getByPlaceholder('Search by email, name, or user ID...').fill(stamp.toString())
        await page.getByRole('button', { name: 'Select All' }).click()
        // Only the opted-in user is selected
        await expect(page.getByText('1 selected')).toBeVisible()
        await page.getByRole('button', { name: 'Deselect All' }).click()
        await expect(page.getByText('0 selected')).toBeVisible()
    })

    test('compose: preview, test to me, confirm with count and sample, audit log', async () => {
        await page.goto('/admin')
        await page.getByRole('button', { name: /Custom Email/ }).click()
        await page.getByRole('button', { name: /Announcement/ }).click()
        await page.getByLabel('Email Subject').fill(`E2E ${stamp}`)
        await page.getByLabel('Announcement Message').fill('Hello from the e2e suite')

        // Unsubscribed and opted-in both checked through the API: only one gets it
        const preview = await page.request.post('/api/admin/email/recipients', {
            headers: { Origin: origin },
            data: { userIds: [people.optIn.id, people.unsub.id, people.quiet.id] },
        })
        expect(await preview.json()).toMatchObject({ count: 1, skippedOptedOut: 2 })

        await page.getByPlaceholder('Search by email, name, or user ID...').fill(stamp.toString())
        await page.getByRole('checkbox', { name: people.optIn.email }).check()

        await page.getByRole('button', { name: 'Preview Email' }).click()
        await expect(
            page.frameLocator('iframe').getByText('Hello from the e2e suite', { exact: true })
        ).toBeVisible()
        await page.getByRole('button', { name: 'Mobile' }).click()
        await page.getByRole('button', { name: 'Desktop' }).click()
        await page.getByRole('button', { name: 'Close Preview', exact: true }).click()

        await page.getByRole('button', { name: 'Send a test to me' }).click()
        await expect(
            page.getByText(/Test email sent to you|No email provider|failed/i).first()
        ).toBeVisible()

        await page.getByRole('button', { name: /Send to 1 User/ }).click()
        const dialog = page.getByRole('dialog', { name: /Send to 1 person/ })
        await expect(dialog).toBeVisible()
        await expect(dialog.getByTestId('confirm-sample')).toHaveText(people.optIn.email)
        await dialog.getByRole('button', { name: 'Cancel' }).click()
        await expect(dialog).toHaveCount(0)

        await page.getByRole('button', { name: /Send to 1 User/ }).click()
        await page.getByRole('dialog').getByRole('button', { name: 'Send to 1' }).click()
        await expect(page.getByText(/Sent \d email/)).toBeVisible()

        const audit = page.getByTestId('audit-log')
        await expect(audit).toContainText('Sent an email')
        await expect(audit).toContainText('Sent a test email to self')
        await expect(audit).toContainText('requested: 1')
        await expect(audit).not.toContainText(people.optIn.email)
        await expect(page.getByText(`E2E ${stamp}`).first()).toBeVisible()
    })

    test('jobs: run for me, confirm before all users, last run recorded', async () => {
        await page.goto('/admin')
        await page.getByRole('button', { name: /Collection cache refresh \(Sundays/ }).click()
        await page.getByRole('button', { name: 'Run for me only' }).click()
        await expect(page.getByText(/Collection cache refresh done/)).toBeVisible()
        await expect(page.getByTestId('job-overview-cache')).toBeHidden()

        await page.getByRole('button', { name: /Social digest \(Wednesdays/ }).click()
        await page.getByRole('button', { name: 'Run for all users...' }).click()
        const dialog = page.getByRole('dialog', { name: /Run the social digest for all users/ })
        await dialog.getByRole('button', { name: 'Cancel' }).click()
        await page.getByRole('button', { name: 'Run for all users...' }).click()
        await dialog.getByRole('button', { name: 'Run for all users' }).click()
        await expect(page.getByText(/Social digest done/)).toBeVisible()

        await page.getByRole('button', { name: /System Overview/ }).click()
        await expect(page.getByTestId('job-overview-social')).toContainText('by admin')
        await expect(page.getByTestId('audit-log')).toContainText('Ran a job')
        await page.getByRole('button', { name: /Trending digest \(Mondays/ }).click()
        await expect(page.getByRole('button', { name: 'Run for me only' })).toBeVisible()
    })

    test('the cron routes cannot be started with an admin session', async () => {
        for (const route of ['update-trending', 'refresh-collection-cache', 'social-digest']) {
            const response = await page.request.get(`/api/cron/${route}?adminOnly=false`)
            expect(response.status(), route).toBe(401)
        }
    })

    test('a stale sign-in must sign in again before sending or running jobs', async () => {
        await db.execute({
            sql: 'UPDATE session SET createdAt = ? WHERE userId = (SELECT id FROM user WHERE email = ?)',
            args: [Date.now() - 16 * 60 * 1000, ADMIN_EMAIL],
        })
        await page.goto('/admin')
        await page.getByLabel('Email Subject').fill('Stale')
        await page.getByLabel('Announcement Message').fill('Should not go')
        await page.getByRole('button', { name: 'Send a test to me' }).click()
        const dialog = page.getByRole('dialog', { name: 'Sign in again' })
        await expect(dialog).toBeVisible()
        await dialog.getByRole('button', { name: 'Not now' }).click()

        const job = await page.request.post('/api/admin/jobs/social', {
            headers: { Origin: origin },
            data: { scope: 'admin' },
        })
        expect(job.status()).toBe(403)
        expect((await job.json()).code).toBe('reauth_required')
    })

    test('bad request bodies get a 400 without internals', async () => {
        // A fresh sign-in again (the previous test made it stale), so validation is reached
        await db.execute({
            sql: 'UPDATE session SET createdAt = ? WHERE userId = (SELECT id FROM user WHERE email = ?)',
            args: [Date.now(), ADMIN_EMAIL],
        })
        const response = await page.request.post('/api/admin/email/send', {
            headers: { Origin: origin },
            data: { mode: 'send', userIds: 'abc', template: 'announcement', subject: 's' },
        })
        expect(response.status()).toBe(400)
        expect(await response.json()).toEqual({ error: 'Invalid request body' })
    })
})

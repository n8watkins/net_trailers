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
    for (const path of [
        '/admin',
        '/admin/users',
        '/admin/activity',
        '/admin/content',
        '/admin/email',
        '/admin/jobs',
        '/admin/system',
    ]) {
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

    test('the overview shows real data, no stubs, and fits one screen at 1440x900', async () => {
        await page.setViewportSize({ width: 1440, height: 900 })
        await page.goto('/admin')
        await expect(page.getByRole('heading', { name: 'Overview', level: 1 })).toBeVisible()
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
        // Email usage against the caps, and the real weekly jobs
        await expect(page.getByRole('link', { name: /Emails this month \d+ \/ \d+/ })).toBeVisible()
        await expect(page.getByText('Mondays at 02:00 UTC')).toBeVisible()
        await expect(page.getByText('Wednesdays at 02:00 UTC')).toBeVisible()
        await expect(page.getByText('Sundays at 02:00 UTC')).toBeVisible()
        // The admin's own sign-up is a real, recent account (user.createdAt)
        await expect(page.getByText(ADMIN_EMAIL).first()).toBeVisible()
        await expect(page.getByText('1969')).toHaveCount(0)
        // One screen: no page scroll
        const height = await page.evaluate(() => document.documentElement.scrollHeight)
        expect(height).toBeLessThanOrEqual(900)
        // No public site footer inside the admin
        await expect(page.locator('footer')).toHaveCount(0)
    })

    test('each overview number opens its page', async () => {
        await page.setViewportSize({ width: 1440, height: 900 })
        const tiles: [RegExp, RegExp][] = [
            [/^Users/, /\/admin\/users$/],
            [/^New this week/, /\/admin\/activity\/signups$/],
            [/^Active this week/, /\/admin\/activity\/views$/],
            [/^Emails this month/, /\/admin\/email\/usage$/],
            [/^Jobs/, /\/admin\/jobs$/],
        ]
        for (const [name, url] of tiles) {
            await page.goto('/admin')
            await page
                .getByRole('region', { name: 'Key numbers' })
                .getByRole('link', { name })
                .click()
            await expect(page).toHaveURL(url)
        }
    })

    test('the sidebar reaches every section and tab, marks the current one, and collapses', async () => {
        await page.setViewportSize({ width: 1440, height: 900 })
        await page.goto('/admin')
        const nav = page.getByRole('navigation', { name: 'Admin' })
        const sections: [string, RegExp, string][] = [
            ['Users', /\/admin\/users$/, 'Users'],
            ['Activity', /\/admin\/activity$/, 'Activity'],
            ['Content and Rankings', /\/admin\/content$/, 'Content and Rankings'],
            ['Email', /\/admin\/email$/, 'Email'],
            ['Jobs', /\/admin\/jobs$/, 'Jobs'],
            ['System', /\/admin\/system$/, 'System'],
            ['Overview', /\/admin$/, 'Overview'],
        ]
        for (const [label, url, heading] of sections) {
            await nav.getByRole('link', { name: label, exact: true }).click()
            await expect(page).toHaveURL(url)
            await expect(page.getByRole('heading', { name: heading, level: 1 })).toBeVisible()
            await expect(nav.getByRole('link', { name: label, exact: true })).toHaveAttribute(
                'aria-current',
                'page'
            )
        }
        // Tabs as sub-items in the sidebar
        const subItems: [string, RegExp][] = [
            ['Page views', /\/admin\/activity\/views$/],
            ['Signups', /\/admin\/activity\/signups$/],
            ['History', /\/admin\/email\/history$/],
            ['Usage', /\/admin\/email\/usage$/],
            ['Config', /\/admin\/system\/config$/],
            ['Audit log', /\/admin\/system$/],
        ]
        for (const [label, url] of subItems) {
            await nav.getByRole('link', { name: label, exact: true }).click()
            await expect(page).toHaveURL(url)
            await expect(nav.getByRole('link', { name: label, exact: true })).toHaveAttribute(
                'aria-current',
                'page'
            )
        }
        // Collapsed to icons, still navigable, remembered after a reload
        await page.getByRole('button', { name: 'Collapse the sidebar' }).click()
        await expect(nav.getByRole('link', { name: 'Page views' })).toHaveCount(0)
        await page.reload()
        await nav.getByRole('link', { name: 'Jobs' }).click()
        await expect(page).toHaveURL(/\/admin\/jobs$/)
        await page.getByRole('button', { name: 'Expand the sidebar' }).click()
        await expect(nav.getByRole('link', { name: 'Page views' })).toBeVisible()
    })

    test('the tabs inside a section switch pages and are keyboard reachable', async () => {
        await page.setViewportSize({ width: 1440, height: 900 })
        await page.goto('/admin/email')
        const tabs = page.getByRole('navigation', { name: 'Email tabs' })
        await expect(tabs.getByRole('link', { name: 'Compose' })).toHaveAttribute(
            'aria-current',
            'page'
        )
        await tabs.getByRole('link', { name: 'History' }).focus()
        await page.keyboard.press('Enter')
        await expect(page).toHaveURL(/\/admin\/email\/history$/)
        await tabs.getByRole('link', { name: 'Usage' }).click()
        await expect(page.getByTestId('email-usage')).toContainText(/\d+ \/ \d+/)

        await page.goto('/admin/activity')
        const activityTabs = page.getByRole('navigation', { name: 'Activity tabs' })
        await expect(activityTabs.getByRole('link', { name: 'Logins' })).toHaveAttribute(
            'aria-current',
            'page'
        )
        await activityTabs.getByRole('link', { name: 'Page views' }).click()
        await expect(page).toHaveURL(/\/admin\/activity\/views$/)
    })

    test('on a phone the sidebar is a drawer', async ({ browser }) => {
        const phone = await browser.newPage({ viewport: { width: 390, height: 844 } })
        await phone.context().addCookies(await page.context().cookies())
        await phone.goto('/admin')
        await expect(phone.getByRole('navigation', { name: 'Admin' })).toBeHidden()
        const menu = phone.getByRole('button', { name: 'Open the admin menu' })
        await menu.click()
        const drawer = phone.getByRole('dialog', { name: 'Admin menu' })
        await expect(drawer).toBeVisible()
        await phone.keyboard.press('Escape')
        await expect(drawer).toBeHidden()
        await expect(menu).toBeFocused()
        await menu.click()
        await drawer.getByRole('link', { name: 'Usage', exact: true }).click()
        await expect(phone).toHaveURL(/\/admin\/email\/usage$/)
        await expect(drawer).toBeHidden()
        await expect(phone.getByText('Admin · Email')).toBeVisible()
        // Nothing wider than the screen
        for (const path of [
            '/admin',
            '/admin/users',
            '/admin/activity/views',
            '/admin/email',
            '/admin/jobs',
        ]) {
            await phone.goto(path)
            const width = await phone.evaluate(() => document.documentElement.scrollWidth)
            expect(width, path).toBeLessThanOrEqual(390)
        }
        await phone.close()
    })

    test('users: real dates, filters, search, pagination and a quoted CSV', async () => {
        await page.goto('/admin/users')
        await expect(page.getByText('1969')).toHaveCount(0)
        const adminRow = page.getByRole('row', { name: new RegExp(ADMIN_EMAIL) })
        await expect(adminRow).toContainText(new Date().getFullYear().toString())

        const search = page.getByPlaceholder('Search by name or email')
        await search.fill(people.optIn.email)
        await expect(page.getByText('1-1 of 1')).toBeVisible()
        await search.fill('')

        await page.getByRole('button', { name: 'GitHub' }).click()
        await expect(page.getByText('No rows match.')).toBeVisible()
        await page.getByRole('button', { name: 'Email link' }).click()
        await expect(adminRow).toBeVisible()
        await page.getByRole('button', { name: 'Any sign-in' }).click()
        await page.getByRole('button', { name: 'Verified', exact: true }).click()
        // The admin signed in by email link, so is verified; the inserted users are not
        await expect(adminRow).toBeVisible()
        await expect(page.getByRole('row', { name: new RegExp(people.quiet.email) })).toHaveCount(0)
        await page.getByRole('button', { name: 'Unverified' }).click()
        await expect(page.getByRole('row', { name: new RegExp(people.quiet.email) })).toBeVisible()
        await page.getByRole('button', { name: 'Verified or not' }).click()

        await search.fill(people.optIn.email)
        const download = page.waitForEvent('download')
        await page.getByRole('button', { name: 'Export CSV' }).click()
        const csv = await readFile(await (await download).path(), 'utf8')
        const [header, row] = csv.split('\r\n')
        expect(header).toBe('"Name","Email","Joined","Last Sign In","Verified","Provider"')
        expect(row.startsWith(`"Opt, ""In"" =1","${people.optIn.email}",`)).toBe(true)
        await search.fill('')

        // Pagination: 25 a page once there are more rows than that
        for (let i = 0; i < 26; i++) {
            await db.execute({
                sql: 'INSERT INTO user (id, email, createdAt) VALUES (?, ?, ?)',
                args: [`page-${stamp}-${i}`, `page-${stamp}-${i}@nettrailers.test`, Date.now()],
            })
        }
        await page.reload()
        await expect(page.getByText(/^1-25 of \d+$/)).toBeVisible()
        await page.getByRole('button', { name: 'Next page' }).click()
        await expect(page.getByText(/^26-\d+ of \d+$/)).toBeVisible()
        await page.getByRole('button', { name: 'Previous page' }).click()
        await expect(page.getByText(/^1-25 of \d+$/)).toBeVisible()
    })

    test('the old accounts and sign-ups links still land on their new pages', async () => {
        await page.goto('/admin/accounts')
        await expect(page).toHaveURL(/\/admin\/users$/)
        await page.goto('/admin/signups')
        await expect(page).toHaveURL(/\/admin\/activity\/signups$/)
    })

    test('activity: sign-ups, logins and page views by week and month', async () => {
        await page.goto('/admin/activity/signups')
        await page.getByRole('button', { name: 'This week' }).click()
        const search = page.getByPlaceholder('Search by name or email')
        await search.fill(people.optIn.email)
        await expect(page.getByText(people.optIn.email)).toBeVisible()
        await page.getByRole('button', { name: 'This month' }).click()
        await search.fill(ADMIN_EMAIL)
        await expect(page.getByText(ADMIN_EMAIL).first()).toBeVisible()

        await page.goto('/admin/activity')
        // Every sign-in records a login event
        await expect(page.getByText(ADMIN_EMAIL).first()).toBeVisible()
        await page.getByRole('button', { name: 'This week' }).click()
        await expect(page.getByText(ADMIN_EMAIL).first()).toBeVisible()
        // One user's activity
        await page.getByRole('link', { name: ADMIN_EMAIL }).first().click()
        await expect(page).toHaveURL(/userId=/)
        await expect(page.getByText(`Only ${ADMIN_EMAIL}.`)).toBeVisible()
        await page.getByRole('link', { name: 'Show everyone' }).click()
        await expect(page).not.toHaveURL(/userId=/)

        await page.goto('/admin/activity/views')
        await expect(page.getByRole('heading', { name: 'Activity', level: 1 })).toBeVisible()

        const logins = await (await page.request.get('/api/admin/activity?type=login')).json()
        expect(logins.activities.length).toBeGreaterThan(0)
        expect(logins.activities.every((a: { type: string }) => a.type === 'login')).toBe(true)
        expect((await page.request.get('/api/admin/activity?type=logins')).status()).toBe(400)
    })

    test('content: counts, rankings and reports', async () => {
        await db.execute({
            sql: `INSERT INTO rankings (id, userId, userName, userUsername, title, rankedItems, isPublic, itemCount, createdAt, updatedAt)
                  VALUES (?, ?, 'Opt In', 'optin', ?, '[]', 1, 3, ?, ?)`,
            args: [`rank-${stamp}`, people.optIn.id, `Ranking ${stamp}`, Date.now(), Date.now()],
        })
        await page.goto('/admin/content')
        await expect(
            page.getByRole('heading', { name: 'Content and Rankings', level: 1 })
        ).toBeVisible()
        await page.getByPlaceholder('Search by title or owner').fill(stamp.toString())
        await expect(page.getByRole('link', { name: `Ranking ${stamp}` })).toHaveAttribute(
            'href',
            `/rankings/rank-${stamp}`
        )
        await page.getByRole('button', { name: 'Private' }).click()
        await expect(page.getByRole('link', { name: `Ranking ${stamp}` })).toHaveCount(0)
        await page.getByRole('button', { name: 'Public' }).click()
        await expect(page.getByRole('link', { name: `Ranking ${stamp}` })).toBeVisible()
        await page.getByRole('button', { name: 'All', exact: true }).last().click()
        await expect(page.getByText('Nobody has reported anything.')).toBeVisible()
    })

    test('recipients: unsubscribed users cannot be selected, no stray 0 or Anonymous User', async () => {
        await page.goto('/admin/email')
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
        await page.goto('/admin/email')
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

        await page.getByRole('button', { name: /Send to 1 user/ }).click()
        const dialog = page.getByRole('dialog', { name: /Send to 1 person/ })
        await expect(dialog).toBeVisible()
        await expect(dialog.getByTestId('confirm-sample')).toHaveText(people.optIn.email)
        await expect(dialog.getByText(/Fresh sign-in: \d+ more minutes? to act/)).toBeVisible()
        // Escape cancels like the button does
        await page.keyboard.press('Escape')
        await expect(dialog).toHaveCount(0)
        await page.getByRole('button', { name: /Send to 1 user/ }).click()
        await dialog.getByRole('button', { name: 'Cancel' }).click()
        await expect(dialog).toHaveCount(0)

        await page.getByRole('button', { name: /Send to 1 user/ }).click()
        await page.getByRole('dialog').getByRole('button', { name: 'Send to 1' }).click()
        await expect(page.getByText(/Sent \d email/)).toBeVisible()

        await page.goto('/admin/system')
        const audit = page.getByTestId('audit-log')
        await expect(audit).toContainText('Sent an email')
        await expect(audit).toContainText('Sent a test email to self')
        await expect(audit).toContainText('requested: 1')
        await expect(audit).not.toContainText(people.optIn.email)
        await page.getByRole('button', { name: 'Jobs', exact: true }).click()
        await expect(audit).not.toContainText('Sent an email')
        await page.getByRole('button', { name: 'Email', exact: true }).click()
        await expect(audit).toContainText('Sent an email')

        await page.goto('/admin/email/history')
        await expect(page.getByText(`E2E ${stamp}`).first()).toBeVisible()

        await page.goto('/admin')
        await expect(page.getByText(/Sent an email/).first()).toBeVisible()
    })

    test('jobs: confirm, run for me, confirm before all users, last run recorded', async () => {
        await page.goto('/admin/jobs')
        const cache = page.getByTestId('job-cache')
        await cache.getByRole('button', { name: 'Run for me only' }).click()
        const mine = page.getByRole('dialog', {
            name: /Run the collection cache refresh for you only/,
        })
        await mine.getByRole('button', { name: 'Run for me only' }).click()
        await expect(page.getByText(/Collection cache refresh done/)).toBeVisible()
        await expect(cache).toContainText('by admin, admin only')

        const social = page.getByTestId('job-social')
        await social.getByRole('button', { name: 'Run for all users...' }).click()
        const dialog = page.getByRole('dialog', { name: /Run the social digest for all users/ })
        await expect(dialog).toContainText('Emails a digest to everyone')
        await dialog.getByRole('button', { name: 'Cancel' }).click()
        await social.getByRole('button', { name: 'Run for all users...' }).click()
        await dialog.getByRole('button', { name: 'Run for all users' }).click()
        await expect(page.getByText(/Social digest done/)).toBeVisible()
        await expect(social).toContainText('by admin')

        await page.getByTestId('job-trending').getByText('What it does').click()
        await expect(page.getByText('Fetches the current trending movies')).toBeVisible()

        await page.goto('/admin/system')
        await expect(page.getByTestId('audit-log')).toContainText('Ran social (all)')
        await page.goto('/admin/system/config')
        await expect(page.getByText('EMAIL_DAILY_CAP')).toBeVisible()
        await expect(page.locator('#admin-main').getByText(ADMIN_EMAIL)).toBeVisible()
    })

    test('the stats for admin.n8builds.dev are service-only and carry totals only', async () => {
        // An admin session is not enough (the Worker also answers 404 to this path from outside)
        expect((await page.request.get('/api/internal/admin-stats')).status()).toBe(401)
        const response = await page.request.get('/api/internal/admin-stats', {
            headers: { Authorization: 'Bearer e2e-only-cron-secret' },
        })
        expect(response.status()).toBe(200)
        const stats = await response.json()
        expect(stats).toMatchObject({ schema: 1, app: 'nettrailers', name: 'NetTrailers' })
        expect(stats.tile.headline.value).toBeGreaterThan(0)
        expect(stats.jobs.map((j: { key: string }) => j.key)).toEqual([
            'trending',
            'cache',
            'social',
        ])
        // No addresses, names or ids anywhere in it
        const body = JSON.stringify(stats)
        expect(body).not.toContain('@nettrailers.test')
        expect(body).not.toContain(people.optIn.id)
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
        await page.goto('/admin/jobs')
        // The confirm dialog says so up front and offers to sign in again
        await page
            .getByTestId('job-social')
            .getByRole('button', { name: 'Run for all users...' })
            .click()
        const confirm = page.getByRole('dialog', { name: /Run the social digest for all users/ })
        await expect(
            confirm.getByText('This needs a sign-in from the last 15 minutes')
        ).toBeVisible()
        await expect(
            confirm.getByRole('button', { name: 'Sign out and sign in again' })
        ).toBeVisible()
        await expect(confirm.getByRole('button', { name: 'Run for all users' })).toHaveCount(0)
        await confirm.getByRole('button', { name: 'Cancel' }).click()

        await page.goto('/admin/email')
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

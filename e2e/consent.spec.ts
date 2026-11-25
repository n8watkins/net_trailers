import { expect, test, type BrowserContext, type Page } from '@playwright/test'

import { GA_IDLE_TIMEOUT_MS } from '../lib/consent'
import { stubExternalMedia } from './stub-media'

/**
 * Analytics consent, the same as n8builds.dev (lib/consent.ts,
 * components/consent; ported with n8builds.dev's tests/e2e/consent.spec.ts).
 * The build uses a made-up GA ID (G-E2ETEST000, .github/workflows/ci.yml);
 * gtag.js is answered here with a stand-in that sets a `_ga` cookie the way
 * the real one does, and counted, so nothing reaches Google.
 */

const PORT = Number(process.env.E2E_PORT || 3105)

// A clean state: no consent cookie (the config declines analytics for every
// other spec), and the welcome pop-up marked seen.
test.use({
    storageState: {
        cookies: [],
        origins: [
            {
                origin: `http://localhost:${PORT}`,
                localStorage: [{ name: 'nettrailers-welcome-seen-v1', value: 'e2e' }],
            },
        ],
    },
})

const banner = (page: Page) => page.getByRole('dialog', { name: 'Cookies' })

/** Counts requests to Google; gtag.js gets a stand-in that sets `_ga`. */
async function countGoogle(context: BrowserContext) {
    const requests: string[] = []
    await context.route(
        /^https:\/\/([a-z0-9-]+\.)*(googletagmanager\.com|google-analytics\.com)\//,
        (route) => {
            requests.push(route.request().url())
            return route.fulfill({
                contentType: 'text/javascript',
                body: "document.cookie='_ga=GA1.1.e2e; Path=/; Max-Age=600'",
            })
        }
    )
    return requests
}

/**
 * Waits until the page has loaded and gone idle (or GA_IDLE_TIMEOUT_MS has
 * passed: the home page can animate without an idle moment), when GA would
 * load if allowed.
 */
async function settle(page: Page) {
    await page.waitForLoadState('load')
    await page.evaluate(
        (timeout) =>
            new Promise<void>((resolve) => {
                const done = () => setTimeout(resolve, 300)
                if (window.requestIdleCallback) window.requestIdleCallback(done, { timeout })
                else setTimeout(done, 1)
            }),
        GA_IDLE_TIMEOUT_MS
    )
}

/**
 * A first interaction: with analytics allowed, gtag.js loads after one (or
 * GA_GRACE_MS after load, lib/consent.ts), once the browser is idle.
 */
async function interact(page: Page) {
    await page.keyboard.press('Shift')
}

const cookie = async (context: BrowserContext, name: string) =>
    (await context.cookies()).find((c) => c.name === name)

test.beforeEach(async ({ page }) => {
    await stubExternalMedia(page)
})

test('the build has the consent bootstrap (built with a GA ID)', async ({ page }) => {
    await page.goto('/')
    await expect(
        page.locator('head script#consent-bootstrap'),
        'Build with NEXT_PUBLIC_GA_MEASUREMENT_ID=G-E2ETEST000 (see .github/workflows/ci.yml)'
    ).toHaveCount(1)
    // It runs under the CSP: it carries this request's nonce.
    const nonce = await page.evaluate(
        () => (document.getElementById('consent-bootstrap') as HTMLScriptElement).nonce
    )
    expect(nonce).not.toBe('')
    expect(await page.evaluate(() => typeof window.n8Consent)).toBe('object')
})

test.describe('in a European time zone', () => {
    test.use({ timezoneId: 'Europe/Berlin' })

    test('asks first: no _ga cookie and no request to Google until Accept', async ({
        page,
        context,
    }) => {
        const google = await countGoogle(context)
        await page.goto('/')
        await expect(banner(page)).toBeVisible()
        await settle(page)
        // Even after an interaction, when GA would otherwise load.
        await interact(page)
        await settle(page)
        expect(google, 'no request to Google before consent').toEqual([])
        expect(await cookie(context, '_ga'), 'no _ga cookie before consent').toBeUndefined()

        await banner(page).getByRole('button', { name: 'Accept' }).click()
        await expect(banner(page)).toBeHidden()
        await expect.poll(() => google.length).toBe(1)
        expect(google[0]).toContain('gtag/js?id=G-E2ETEST000')
        expect((await cookie(context, 'n8-consent'))?.value).toBe('granted')
        await expect.poll(async () => (await cookie(context, '_ga'))?.value).toBe('GA1.1.e2e')

        // The choice sticks: no banner next time, and GA loads after a first interaction.
        await page.reload()
        await settle(page)
        await expect(banner(page)).toBeHidden()
        await interact(page)
        await expect.poll(() => google.length).toBe(2)
    })

    test('Decline sticks and keeps GA from ever loading', async ({ page, context }) => {
        const google = await countGoogle(context)
        await page.goto('/')
        await banner(page).getByRole('button', { name: 'Decline' }).click()
        await expect(banner(page)).toBeHidden()
        expect((await cookie(context, 'n8-consent'))?.value).toBe('denied')

        await page.reload()
        await settle(page)
        await expect(banner(page)).toBeHidden()
        await interact(page)
        await settle(page)
        expect(google).toEqual([])
        expect(await cookie(context, '_ga')).toBeUndefined()
    })

    test('Accept is the larger button on the right; Decline is a real button beside it', async ({
        page,
    }) => {
        await page.goto('/')
        const decline = await banner(page).getByRole('button', { name: 'Decline' }).boundingBox()
        const accept = await banner(page).getByRole('button', { name: 'Accept' }).boundingBox()
        expect(decline && accept).toBeTruthy()
        expect(accept!.x).toBeGreaterThan(decline!.x)
        expect(accept!.width * accept!.height).toBeGreaterThan(decline!.width * decline!.height)
        expect(decline!.height).toBeGreaterThanOrEqual(40)
        expect(decline!.width).toBeGreaterThanOrEqual(60)
    })

    test('choosing plays the exit transition, then the bar is gone', async ({ page }) => {
        await page.goto('/')
        const bar = banner(page)
        await expect(bar).toBeVisible()
        await bar.evaluate((el) => {
            const win = window as Window & { __consentMidExit?: Promise<[string | null, boolean]> }
            win.__consentMidExit = new Promise((resolve) => {
                new MutationObserver((_, observer) => {
                    if (el.getAttribute('data-closing') !== 'true') return
                    observer.disconnect()
                    resolve([el.getAttribute('data-closing'), el.hasAttribute('inert')])
                }).observe(el, { attributes: true, attributeFilter: ['data-closing', 'inert'] })
            })
        })
        await bar.getByRole('button', { name: 'Decline' }).focus()
        await page.keyboard.press('Enter')
        const midExit = await page.evaluate(
            () =>
                (window as Window & { __consentMidExit?: Promise<[string | null, boolean]> })
                    .__consentMidExit
        )
        expect(midExit).toEqual(['true', true])
        await expect(
            page.getByRole('dialog', { name: 'Cookies', includeHidden: true })
        ).toHaveCount(0)
        // Focus left the bar instead of staying on a removed button.
        expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true)
        expect(await page.evaluate(() => window.n8Consent?.state)).toBe('denied')
    })

    test('under reduced motion the bar closes at once', async ({ page }) => {
        await page.emulateMedia({ reducedMotion: 'reduce' })
        await page.goto('/')
        await banner(page).getByRole('button', { name: 'Accept' }).click()
        expect(await page.locator('[role="dialog"][aria-labelledby]').count()).toBe(0)
        expect(await page.evaluate(() => window.n8Consent?.state)).toBe('granted')
    })

    test('the banner links to the cookies section of the privacy policy', async ({ page }) => {
        await page.goto('/')
        const link = banner(page).getByRole('link', { name: 'Privacy' })
        await expect(link).toHaveAttribute('href', '/privacy#cookies')
        await link.click()
        await expect(page).toHaveURL(/\/privacy#cookies$/)
        await expect(page.locator('#cookies')).toContainText('n8-consent')
    })

    test('Global Privacy Control counts as Decline: no banner, no GA', async ({
        page,
        context,
    }) => {
        await context.addInitScript(() =>
            Object.defineProperty(Navigator.prototype, 'globalPrivacyControl', {
                get: () => true,
            })
        )
        const google = await countGoogle(context)
        await page.goto('/')
        await settle(page)
        await expect(banner(page)).toBeHidden()
        await interact(page)
        await settle(page)
        expect(google).toEqual([])
        expect(await page.evaluate(() => window.n8Consent?.state)).toBe('denied')
    })
})

test.describe('in an Eastern Canada (Quebec) time zone', () => {
    test.use({ timezoneId: 'America/Toronto' })

    test('asks first', async ({ page, context }) => {
        const google = await countGoogle(context)
        await page.goto('/')
        await expect(banner(page)).toBeVisible()
        await settle(page)
        await interact(page)
        await settle(page)
        expect(google).toEqual([])
    })
})

test.describe('elsewhere (America/Los_Angeles)', () => {
    test.use({ timezoneId: 'America/Los_Angeles' })

    test('no banner; GA loads after the first interaction and sets _ga', async ({
        page,
        context,
    }) => {
        const google = await countGoogle(context)
        await page.goto('/')
        await settle(page)
        expect(google, 'no GA while the page loads').toEqual([])
        await interact(page)
        await expect.poll(() => google.length).toBe(1)
        expect(google[0]).toContain('gtag/js?id=G-E2ETEST000')
        await expect.poll(async () => (await cookie(context, '_ga'))?.value).toBe('GA1.1.e2e')
        await expect(banner(page)).toHaveCount(0)
    })

    test('Global Privacy Control keeps GA from loading', async ({ page, context }) => {
        await context.addInitScript(() =>
            Object.defineProperty(Navigator.prototype, 'globalPrivacyControl', {
                get: () => true,
            })
        )
        const google = await countGoogle(context)
        await page.goto('/')
        await settle(page)
        await interact(page)
        await settle(page)
        expect(google).toEqual([])
    })

    test('"Cookie settings" in the footer reopens the choice; Decline removes _ga', async ({
        page,
        context,
    }) => {
        const google = await countGoogle(context)
        await page.goto('/')
        await interact(page)
        await expect.poll(() => google.length).toBe(1)
        await expect.poll(async () => (await cookie(context, '_ga'))?.value).toBe('GA1.1.e2e')

        const settings = page.getByRole('contentinfo').getByRole('button', {
            name: 'Cookie settings',
        })
        await settings.scrollIntoViewIfNeeded()
        await settings.focus()
        await page.keyboard.press('Enter')

        // Focus moves to the bar itself, which says what is set now.
        await expect(banner(page)).toBeVisible()
        await expect(banner(page)).toBeFocused()
        await expect(banner(page)).toContainText('Currently: accepted')

        // Escape closes it and gives focus back.
        await page.keyboard.press('Escape')
        await expect(banner(page)).toBeHidden()
        await expect(settings).toBeFocused()

        // Tab reaches the Privacy link, then Decline; Enter declines.
        await page.keyboard.press('Enter')
        await expect(banner(page)).toBeFocused()
        await page.keyboard.press('Tab')
        await page.keyboard.press('Tab')
        await expect(banner(page).getByRole('button', { name: 'Decline' })).toBeFocused()
        await page.keyboard.press('Enter')
        await expect(banner(page)).toBeHidden()
        await expect(settings).toBeFocused()
        expect((await cookie(context, 'n8-consent'))?.value).toBe('denied')
        expect(await cookie(context, '_ga'), 'declining removes the GA cookie').toBeUndefined()
    })
})

test.describe('on net-trailers.n8builds.dev', () => {
    test.use({ timezoneId: 'Europe/Berlin' })

    /** Serves https://net-trailers.n8builds.dev from the test server. */
    async function serveOnRealDomain(context: BrowserContext) {
        await context.route(/^https:\/\/net-trailers\.n8builds\.dev\//, async (route) => {
            const url = new URL(route.request().url())
            const response = await route.fetch({
                url: `http://localhost:${PORT}${url.pathname}${url.search}`,
            })
            await route.fulfill({ response })
        })
        // The welcome pop-up marked seen on this origin too.
        await context.addInitScript(() => {
            if (location.hostname === 'net-trailers.n8builds.dev') {
                localStorage.setItem('nettrailers-welcome-seen-v1', 'e2e')
            }
        })
    }

    test('the choice is the n8-consent cookie on .n8builds.dev', async ({ page, context }) => {
        await serveOnRealDomain(context)
        await countGoogle(context)
        await page.goto('https://net-trailers.n8builds.dev/')
        await banner(page).getByRole('button', { name: 'Accept' }).click()
        await expect(banner(page)).toHaveCount(0)
        const consent = await cookie(context, 'n8-consent')
        expect(consent).toMatchObject({
            value: 'granted',
            domain: '.n8builds.dev',
            path: '/',
            secure: true,
            sameSite: 'Lax',
        })
        const days = (consent!.expires * 1000 - Date.now()) / 86_400_000
        expect(days).toBeGreaterThan(364)
        expect(days).toBeLessThan(366)
        await context.unrouteAll({ behavior: 'ignoreErrors' })
    })

    test('an answer given on n8builds.dev applies here', async ({ page, context }) => {
        await serveOnRealDomain(context)
        const google = await countGoogle(context)
        // As n8builds.dev (or the portfolio) leaves it after a Decline there.
        await context.addCookies([
            {
                name: 'n8-consent',
                value: 'denied',
                domain: '.n8builds.dev',
                path: '/',
                secure: true,
                sameSite: 'Lax',
                expires: Math.floor(Date.now() / 1000) + 86_400,
            },
        ])
        await page.goto('https://net-trailers.n8builds.dev/')
        await settle(page)
        await expect(banner(page)).toHaveCount(0)
        expect(await page.evaluate(() => window.n8Consent?.state)).toBe('denied')
        await interact(page)
        await settle(page)
        expect(google).toEqual([])
        await context.unrouteAll({ behavior: 'ignoreErrors' })
    })
})

import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { expect, test, type Browser, type Page } from '@playwright/test'

import { stubExternalMedia } from './stub-media'

/**
 * The Help window (components/modals/TutorialModal.tsx): it fits one phone
 * screen, a tile shows its line and an Open link that really goes there, the
 * search tiles bring the visitor to the control, and guests can start the tour.
 */

const DESKTOP = { viewport: { width: 1440, height: 900 } }
const PHONE = {
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
}

type Options = typeof DESKTOP | typeof PHONE
type Session = Awaited<ReturnType<import('@playwright/test').BrowserContext['storageState']>>

async function newPage(
    browser: Browser,
    baseURL: string | undefined,
    options: Options,
    session?: Session
) {
    const context = await browser.newContext({
        ...options,
        baseURL,
        storageState: session ?? {
            cookies: [],
            origins: [
                {
                    origin: baseURL ?? '',
                    localStorage: [{ name: 'nettrailers-welcome-seen-v1', value: 'e2e' }],
                },
            ],
        },
    })
    const page = await context.newPage()
    await stubExternalMedia(page)
    return { context, page }
}

/** Open Help from the footer, retrying a click that lands before hydration. */
async function openHelp(page: Page) {
    const dialog = page.getByRole('dialog', { name: /NetTrailers\s*Help/ })
    await expect(async () => {
        if (!(await dialog.isVisible())) {
            await page
                .getByRole('button', { name: /Help & tutorial/ })
                .first()
                .click({ timeout: 2_000 })
        }
        await expect(dialog).toBeVisible({ timeout: 2_000 })
    }).toPass({ timeout: 20_000 })
    return dialog
}

async function selectTile(page: Page, name: string) {
    const dialog = page.getByRole('dialog', { name: /NetTrailers\s*Help/ })
    const tile = dialog.getByRole('button', { name: new RegExp(`^${name}`) })
    await tile.click()
    await expect(tile).toHaveAttribute('aria-pressed', 'true')
    return page.getByTestId('help-detail')
}

test('phone: Help fits one screen, a tile opens its page, and the window closes', async ({
    browser,
    baseURL,
}) => {
    const { context, page } = await newPage(browser, baseURL, PHONE)
    await page.goto('/')
    const dialog = await openHelp(page)

    // Every heading and tile is there, with no inner scrolling on a 390x844 phone
    for (const heading of ['Search', 'Your library', 'Community', 'Profile']) {
        await expect(dialog.getByRole('group', { name: heading })).toBeVisible()
    }
    await expect(dialog.locator('[data-help-tile]')).toHaveCount(12)
    const fit = await dialog.evaluate((el) => {
        const body = el.children[1] as HTMLElement
        const rect = el.getBoundingClientRect()
        return {
            overflow: body.scrollHeight - body.clientHeight,
            top: rect.top,
            bottom: rect.bottom,
        }
    })
    expect(fit.overflow).toBeLessThanOrEqual(0)
    expect(fit.top).toBeGreaterThanOrEqual(16)
    expect(fit.bottom).toBeLessThanOrEqual(844 - 16)
    // Shortcuts need a keyboard: not offered on a phone
    await expect(dialog.getByRole('button', { name: 'Shortcuts' })).toHaveCount(0)

    const detail = await selectTile(page, 'Watch later')
    await expect(detail).toContainText('kept on this device')
    await detail.getByRole('link', { name: /Open/ }).click()
    await expect(page).toHaveURL(/\/collections\/watch-later$/)
    await expect(dialog).toHaveCount(0)
    await expect(page.getByRole('heading', { name: 'Watch Later', level: 1 })).toBeVisible()
    await context.close()
})

test('phone: guest starts the tour from Help', async ({ browser, baseURL }) => {
    const { context, page } = await newPage(browser, baseURL, PHONE)
    await page.goto('/collections')
    const dialog = await openHelp(page)
    await dialog.getByRole('button', { name: 'Start tour' }).click()
    await expect(dialog).toHaveCount(0)
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByTestId('tour-card')).toBeVisible({ timeout: 15_000 })
    await context.close()
})

test('phone: a guest tapping the locked public profile is offered sign-in', async ({
    browser,
    baseURL,
}) => {
    const { context, page } = await newPage(browser, baseURL, PHONE)
    await page.goto('/')
    await openHelp(page)
    const detail = await selectTile(page, 'Public profile')
    await detail.getByRole('button', { name: /Sign in/ }).click()
    await expect(page.getByPlaceholder('you@example.com')).toBeVisible()
    await context.close()
})

for (const [label, options, inputId] of [
    ['phone', PHONE, 'navbar-mobile-search-input'],
    ['desktop', DESKTOP, 'navbar-search-input'],
] as const) {
    test(`${label}: the search tiles bring the visitor to the control`, async ({
        browser,
        baseURL,
    }) => {
        const { context, page } = await newPage(browser, baseURL, options)

        // Search: the header field, opened first on phones
        await page.goto('/history')
        await openHelp(page)
        await (await selectTile(page, 'Search')).getByRole('button', { name: /Open/ }).click()
        await expect(page.locator(`#${inputId}`)).toBeFocused()

        // Ask by mood: home, with the mood box focused
        await openHelp(page)
        await (await selectTile(page, 'Ask by mood')).getByRole('button', { name: /Open/ }).click()
        await expect(page).toHaveURL(/\/$/)
        await expect(page.locator('#mood-search textarea')).toBeFocused({ timeout: 10_000 })

        // Voice search: the mood box's microphone, focused but not listening
        await page.goto('/ratings')
        await openHelp(page)
        await (await selectTile(page, 'Voice search')).getByRole('button', { name: /Open/ }).click()
        await expect(page).toHaveURL(/\/$/)
        const mic = page.locator('#mood-search button[aria-label="Start voice input"]')
        const box = page.locator('#mood-search textarea')
        await expect(async () => {
            const focused = (await mic.count())
                ? await mic.evaluate((el) => el === document.activeElement)
                : await box.evaluate((el) => el === document.activeElement)
            expect(focused).toBe(true)
        }).toPass({ timeout: 10_000 })

        // Surprise me: a random title opens. The TMDB fixtures hold no random
        // discover pages, so the endpoint answers with the first trending title
        const trending = await (await page.request.get('/api/movies/trending')).json()
        const pick = { ...trending.results[0], media_type: 'movie' }
        await page.route('**/api/random-content**', (route) =>
            route.fulfill({ json: { content: pick } })
        )
        await openHelp(page)
        await (await selectTile(page, 'Surprise me')).getByRole('button', { name: /Open/ }).click()
        await expect(page.getByRole('button', { name: 'Close modal' })).toBeVisible({
            timeout: 10_000,
        })
        await context.close()
    })
}

test('desktop: Help is a centered dialog with Shortcuts, closed by Escape and the backdrop', async ({
    browser,
    baseURL,
}) => {
    const { context, page } = await newPage(browser, baseURL, DESKTOP)
    await page.goto('/')
    const dialog = await openHelp(page)
    const box = (await dialog.boundingBox())!
    expect(box.width).toBeLessThanOrEqual(760)
    // Centred in the page area, which is narrower than the window by the scroll bar's gutter
    const pageWidth = await page.evaluate(() => document.documentElement.clientWidth)
    expect(Math.abs(box.x + box.width / 2 - pageWidth / 2)).toBeLessThanOrEqual(1)
    await expect(dialog.getByRole('button', { name: 'Shortcuts' })).toBeVisible()

    // Tiles work from the keyboard
    await dialog.getByRole('button', { name: /^Search/ }).focus()
    await page.keyboard.press('ArrowRight')
    await expect(dialog.getByRole('button', { name: /^Ask by mood/ })).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(dialog.getByRole('button', { name: /^Ask by mood/ })).toHaveAttribute(
        'aria-pressed',
        'true'
    )

    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
    await openHelp(page)
    await page.mouse.click(40, 450)
    await expect(dialog).toHaveCount(0)
    await context.close()
})

test.describe('signed in', () => {
    test.describe.configure({ mode: 'serial' })

    const email = `e2e-help-${Date.now()}@nettrailers.test`
    const linkFile = join(process.cwd(), '.e2e', 'magic-links', `${email}.txt`)
    let session: Session

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

    test('signs in with an emailed magic link', async ({ browser, baseURL }) => {
        const { context, page } = await newPage(browser, baseURL, DESKTOP)
        await page.goto('/')
        await page.getByRole('button', { name: 'Sign in', exact: true }).click()
        await page.getByPlaceholder('you@example.com').fill(email)
        await page.getByRole('button', { name: /Email me a sign-in link/i }).click()
        await expect(page.getByText('Check your inbox')).toBeVisible()
        await page.goto(await readMagicLink())
        await page.goto('/')
        await expect(page.getByRole('button', { name: 'Profile menu' })).toBeVisible()
        session = await context.storageState()
        await context.close()
    })

    test("phone: nothing is locked, and Public profile opens the visitor's own page", async ({
        browser,
        baseURL,
    }) => {
        const { context, page } = await newPage(browser, baseURL, PHONE, session)
        await page.goto('/')
        const dialog = await openHelp(page)
        await expect(dialog.getByText('needs an account')).toHaveCount(0)
        const detail = await selectTile(page, 'Public profile')
        await detail.getByRole('link', { name: /Open/ }).click()
        await expect(page).toHaveURL(/\/users\/[^/]+$/)
        await expect(page.getByText(/not found|doesn't exist/i)).toHaveCount(0)
        await context.close()
    })
})

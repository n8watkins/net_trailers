import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test'

import { stubExternalMedia } from './stub-media'

/**
 * The interactive tour: it starts on the home page from any page (Help &
 * tutorial and About's "Show me around"), signed in and as a guest, on phone
 * and desktop, and no step leaves a dimmed page without a card on screen.
 */

const GUTTER = 16
const DESKTOP = { viewport: { width: 1440, height: 900 } }
const PHONE = {
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
}

const STEP_TITLES = [
    /Welcome to NetTrailers/,
    /Quick Search/,
    /Advanced Filters/,
    /Content Cards/,
    /Quick Actions/,
    /Your Personal Hub/,
    /Custom Collections/,
    /Rankings & Community/,
    /Child Safety Mode/,
    /Ready to Explore/,
]
// Steps that point at something on the page (the rest are centered on purpose)
const ANCHORED = new Set([1, 2, 3, 4, 5])

async function newPage(
    browser: Browser,
    baseURL: string | undefined,
    options: typeof DESKTOP | typeof PHONE
) {
    // A fresh context keeps the config's baseURL but not its storage, so the
    // first-visit welcome is marked seen again here
    const context = await browser.newContext({
        ...options,
        baseURL,
        storageState: {
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

/** The card is fully on screen inside the gutters, and a highlight (if any) has size. */
async function expectStepOnScreen(page: Page, index: number) {
    const viewport = page.viewportSize()!
    const card = page.getByTestId('tour-card')
    await expect(card.getByRole('heading', { name: STEP_TITLES[index] })).toBeVisible()
    await expect(async () => {
        const box = (await card.boundingBox())!
        expect(box.x).toBeGreaterThanOrEqual(GUTTER - 0.5)
        expect(box.y).toBeGreaterThanOrEqual(GUTTER - 0.5)
        expect(box.x + box.width).toBeLessThanOrEqual(viewport.width - GUTTER + 0.5)
        expect(box.y + box.height).toBeLessThanOrEqual(viewport.height - GUTTER + 0.5)
        if (ANCHORED.has(index)) {
            await expect(card).toHaveAttribute('data-placement', 'anchored')
            const spot = (await page.getByTestId('tour-spotlight').boundingBox())!
            expect(spot.width).toBeGreaterThan(30)
            expect(spot.height).toBeGreaterThan(30)
            expect(spot.y).toBeGreaterThanOrEqual(0)
            expect(spot.y + spot.height).toBeLessThanOrEqual(viewport.height)
            expect(spot.x).toBeGreaterThanOrEqual(0)
            expect(spot.x + spot.width).toBeLessThanOrEqual(viewport.width)
            // The card does not cover what it points at
            const apart =
                box.y >= spot.y + spot.height - 1 ||
                box.y + box.height <= spot.y + 1 ||
                box.x >= spot.x + spot.width - 1 ||
                box.x + box.width <= spot.x + 1
            expect(apart).toBe(true)
        }
    }).toPass({ timeout: 5_000 })
}

async function walkTour(page: Page, { touch }: { touch: boolean }) {
    const card = page.getByTestId('tour-card')
    for (let i = 0; i < STEP_TITLES.length; i++) {
        await expectStepOnScreen(page, i)
        // Keyboard hints only where there is a keyboard and mouse
        await expect(card.getByText(/arrow keys/)).toHaveCount(touch ? 0 : 1)
        // The phone copy never promises a keyboard shortcut
        if (touch) await expect(card.getByText(/Alt\+/)).toHaveCount(0)
        const primary = card.getByRole('button', {
            name: i === STEP_TITLES.length - 1 ? 'Finish' : 'Next',
        })
        if (!touch) await expect(primary).toBeFocused()
        await primary.click()
    }
    await expect(page.getByTestId('tour-overlay')).toHaveCount(0)
    await expect(page.getByText('Tour Complete!').first()).toBeVisible()
}

/** Open a footer window and click its tour button (Help: "Start Tour", About: "Show me around"). */
async function startTourFromFooter(page: Page, item: RegExp, tourButton: string) {
    const button = page.getByRole('button', { name: tourButton })
    // A click before hydration does nothing: retry until the window opens
    await expect(async () => {
        if (!(await button.isVisible())) {
            await page.getByRole('button', { name: item }).first().click({ timeout: 2_000 })
        }
        await expect(button).toBeVisible({ timeout: 2_000 })
    }).toPass({ timeout: 20_000 })
    await button.click()
}

for (const [label, options, touch] of [
    ['desktop', DESKTOP, false],
    ['phone', PHONE, true],
] as const) {
    test(`guest: About "Show me around" on /profile goes home and runs every step on screen (${label})`, async ({
        browser,
        baseURL,
    }) => {
        const { context, page } = await newPage(browser, baseURL, options)
        await page.goto('/profile')
        await startTourFromFooter(page, /About this project/, 'Show me around')

        await expect(page).toHaveURL(/\/$/)
        await expect(page.getByTestId('tour-card')).toBeVisible({ timeout: 15_000 })
        await walkTour(page, { touch })
        await context.close()
    })
}

test('the tour card takes focus, Enter acts once, arrows move and Escape skips', async ({
    browser,
    baseURL,
}) => {
    const { context, page } = await newPage(browser, baseURL, DESKTOP)
    await page.goto('/')
    await startTourFromFooter(page, /About this project/, 'Show me around')
    const card = page.getByTestId('tour-card')
    await expect(card.getByRole('heading', { name: STEP_TITLES[0] })).toBeVisible({
        timeout: 15_000,
    })

    // Enter on the focused Next advances exactly one step
    await expect(card.getByRole('button', { name: 'Next' })).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(card.getByRole('heading', { name: STEP_TITLES[1] })).toBeVisible()
    await page.keyboard.press('ArrowRight')
    await expect(card.getByRole('heading', { name: STEP_TITLES[2] })).toBeVisible()
    await page.keyboard.press('ArrowLeft')
    await expect(card.getByRole('heading', { name: STEP_TITLES[1] })).toBeVisible()

    // Tab stays inside the card
    for (let i = 0; i < 6; i++) {
        await page.keyboard.press('Tab')
        expect(await card.evaluate((el) => el.contains(document.activeElement))).toBe(true)
    }

    // Enter on "Skip tour" ends the tour without also advancing it
    await card.getByRole('button', { name: 'Skip tour' }).focus()
    await page.keyboard.press('Enter')
    await expect(page.getByTestId('tour-overlay')).toHaveCount(0)
    await expect(page.getByText('Tour Complete!')).toHaveCount(0)

    // Escape skips from a fresh start
    await startTourFromFooter(page, /About this project/, 'Show me around')
    await expect(card).toBeVisible({ timeout: 15_000 })
    await page.keyboard.press('Escape')
    await expect(page.getByTestId('tour-overlay')).toHaveCount(0)
    await context.close()
})

test.describe('signed in', () => {
    test.describe.configure({ mode: 'serial' })

    const email = `e2e-tour-${Date.now()}@nettrailers.test`
    const linkFile = join(process.cwd(), '.e2e', 'magic-links', `${email}.txt`)
    let session: Awaited<ReturnType<BrowserContext['storageState']>>

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

    for (const [label, options, touch] of [
        ['desktop', DESKTOP, false],
        ['phone', PHONE, true],
    ] as const) {
        test(`Help "Start Tour" on /profile goes home and starts the tour (${label})`, async ({
            browser,
            baseURL,
        }) => {
            const context = await browser.newContext({ ...options, baseURL, storageState: session })
            const page = await context.newPage()
            await stubExternalMedia(page)

            await page.goto('/profile')
            await startTourFromFooter(page, /Help & tutorial/, 'Start Tour')

            await expect(page).toHaveURL(/\/$/)
            await expect(page.getByTestId('tour-card')).toBeVisible({ timeout: 15_000 })
            await walkTour(page, { touch })
            await context.close()
        })
    }
})

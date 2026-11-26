import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { expect, test, type Page } from '@playwright/test'

import { stubExternalMedia } from './stub-media'

/**
 * Child Safety Mode is decided by the server, not by the page: once it is on,
 * calling the content API straight from the page, without the
 * `childSafetyMode` parameter (or with it set to false), still gets filtered
 * titles. That holds while signed in (the account's stored setting) and, after
 * signing out, for the guest in that browser (the httpOnly cookie the server
 * set). The TMDB answers are hand-made fixtures (e2e/fixtures/child-safety-tmdb.mjs):
 * a PG film and a TV-Y show the mode keeps, an R film, a TV-MA show and an
 * adult film it must hide.
 */

const email = `e2e-child-safety-enforced-${Date.now()}@nettrailers.test`
const linkFile = join(process.cwd(), '.e2e', 'magic-links', `${email}.txt`)

const KEPT = ['Fixture Family Film', 'Fixture Kids Show']
const HIDDEN = ['Fixture R Film', 'Fixture Mature Show', 'Fixture Adult Film']
const R_FILM_ID = 990002

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

interface Answers {
    searchTitles: string[]
    detailsStatus: number
    detailsReason: string | null
}

/** Calls two content routes from the page itself, the way any script on it could. */
async function callContentApi(page: Page, extra = ''): Promise<Answers> {
    return page.evaluate(
        async ({ id, extra }) => {
            const search = await fetch(`/api/search?query=childsafetyfixture${extra}`)
            const body = await search.json()
            const details = await fetch(`/api/content/${id}?${extra.replace(/^&/, '')}`)
            const detailsBody = await details.json().catch(() => ({}))
            return {
                searchTitles: (body.results ?? []).map(
                    (r: { title?: string; name?: string }) => r.title ?? r.name ?? ''
                ),
                detailsStatus: details.status,
                detailsReason: detailsBody.reason ?? null,
            }
        },
        { id: R_FILM_ID, extra }
    )
}

function expectFiltered(answers: Answers) {
    for (const title of KEPT) expect(answers.searchTitles).toContain(title)
    for (const title of HIDDEN) expect(answers.searchTitles).not.toContain(title)
    expect(answers.detailsStatus).toBe(403)
    expect(answers.detailsReason).toBe('child_safety')
}

const modeSwitch = (page: Page) =>
    page
        .locator('div.flex.items-start.justify-between', { hasText: 'Child Safety Mode' })
        .locator('input[type="checkbox"]')

test('with Child Safety Mode on, the content API filters whatever the page asks', async ({
    page,
    context,
}) => {
    await stubExternalMedia(page)
    await page.goto('/')

    // Before: a visitor without the mode gets every fixture title.
    const before = await callContentApi(page)
    for (const title of [...KEPT, ...HIDDEN]) expect(before.searchTitles).toContain(title)
    expect(before.detailsStatus).toBe(200)

    // Sign in and switch the mode on in the settings screen.
    await page.getByRole('button', { name: 'Sign in', exact: true }).click()
    await page.getByPlaceholder('you@example.com').fill(email)
    await page.getByRole('button', { name: /Email me a sign-in link/i }).click()
    await expect(page.getByText('Check your inbox')).toBeVisible()
    await page.goto(await readMagicLink())
    await page.goto('/settings/preferences')
    await expect(modeSwitch(page)).not.toBeChecked()
    await modeSwitch(page).locator('..').click()
    await expect(modeSwitch(page)).toBeChecked()
    await expect(page.getByText('Child Safety Mode enabled')).toBeVisible()

    // The server wrote the guest cookie, out of reach of page scripts.
    await expect
        .poll(async () =>
            (await context.cookies()).find((c) => c.name === 'nettrailer_child_safety')
        )
        .toMatchObject({ value: 'true', httpOnly: true })
    expect(await page.evaluate(() => document.cookie)).not.toContain('nettrailer_child_safety')

    // Signed in: no parameter, or the parameter set to false, still filters.
    expectFiltered(await callContentApi(page))
    expectFiltered(await callContentApi(page, '&childSafetyMode=false'))

    // Signed out, the same browser is a guest whose cookie keeps the mode on.
    await page.goto('/settings/account-management')
    await page.getByRole('button', { name: 'Sign out', exact: true }).click()
    await expect
        .poll(async () =>
            (await context.cookies()).some((c) => c.name.includes('authjs.session-token'))
        )
        .toBe(false)
    await page.goto('/')
    expectFiltered(await callContentApi(page))
    expectFiltered(await callContentApi(page, '&childSafetyMode=false'))
})

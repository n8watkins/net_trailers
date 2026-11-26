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

interface CatalogueTitle {
    id: number
    title?: string
    name?: string
    shown: boolean
}

interface Consistency {
    lists: { path: string; titles: { id: number; media_type: string; name: string }[] }[]
    statuses: Record<string, number[]>
}

/**
 * Lists and single titles with the mode on, asked from the page: every list
 * route's titles, and for each of those and each catalogue title, the answers
 * of the two single-title routes (details and content).
 */
async function listsAndTitles(page: Page, catalogue: string[]): Promise<Consistency> {
    return page.evaluate(
        async ({ catalogue, query }) => {
            const listPaths = [
                '/api/movies/trending',
                '/api/tv/trending',
                '/api/movies/top-rated',
                '/api/tv/top-rated',
                `/api/search?query=${query}`,
                '/api/search?query=childsafetyfixture',
            ]
            const lists = []
            for (const path of listPaths) {
                const body = await (await fetch(path)).json()
                const titles = (body.results ?? []).map(
                    (r: { id: number; media_type?: string; title?: string; name?: string }) => ({
                        id: r.id,
                        media_type: r.media_type ?? (path.startsWith('/api/tv/') ? 'tv' : 'movie'),
                        name: r.title ?? r.name ?? '',
                    })
                )
                lists.push({ path, titles })
            }
            const keys = new Set<string>(catalogue)
            for (const list of lists)
                for (const t of list.titles) keys.add(`${t.media_type}:${t.id}`)
            const statuses: Record<string, number[]> = {}
            for (const key of keys) {
                const [mediaType, id] = key.split(':')
                const details = await fetch(`/api/movies/details/${id}?media_type=${mediaType}`)
                const content = await fetch(`/api/content/${id}`)
                statuses[key] = [details.status, content.status]
            }
            return { lists, statuses }
        },
        { catalogue, query: 'childsafetycatalogue' }
    )
}

test('with Child Safety Mode on, every list agrees with the single-title routes', async ({
    page,
    context,
}) => {
    const catalogue = JSON.parse(
        await readFile(
            join(process.cwd(), 'e2e', 'fixtures', 'child-safety-catalogue.json'),
            'utf8'
        )
    ) as { movies: CatalogueTitle[]; shows: CatalogueTitle[] }
    const expected = new Map<string, CatalogueTitle>([
        ...catalogue.movies.map((m) => [`movie:${m.id}`, m] as const),
        ...catalogue.shows.map((s) => [`tv:${s.id}`, s] as const),
    ])

    await stubExternalMedia(page)
    await page.goto('/')
    // A guest browser whose server-set cookie has the mode on (as after an
    // account turned it on and signed out; see the test above).
    await context.addCookies([
        { name: 'nettrailer_child_safety', value: 'true', url: new URL(page.url()).origin },
    ])

    const { lists, statuses } = await listsAndTitles(page, [...expected.keys()])
    // Allowed: the details route answers 200 and the content route does not
    // block it (recorded trending titles have no content-route fixture: 404).
    const allowed = (key: string) => statuses[key]?.[0] === 200 && statuses[key]?.[1] !== 403

    // The single-title routes decide each catalogue title as the rule says.
    for (const [key, title] of expected) {
        expect(statuses[key], `${key} ${title.title ?? title.name}`).toEqual(
            title.shown ? [200, 200] : [403, 403]
        )
    }

    // Every listed title is allowed by both single-title routes, so every title
    // they block is absent from every list.
    for (const list of lists) {
        const notAllowed = list.titles.filter((t) => !allowed(`${t.media_type}:${t.id}`))
        expect(notAllowed, list.path).toEqual([])
    }

    // And the search lists every catalogue title the rule shows, nothing else.
    const search = lists.find((l) => l.path.includes('childsafetycatalogue'))!
    expect(search.titles.map((t) => `${t.media_type}:${t.id}`).sort()).toEqual(
        [...expected]
            .filter(([, t]) => t.shown)
            .map(([key]) => key)
            .sort()
    )
})

// The post-deploy check (DEPLOYMENT.md, "After each deploy"): requests every
// edge-cached public page as a signed-out visitor, several times over about a
// minute, and fails if any answer is not a 200 from the build just deployed or
// names a /_next/static file that does not load.
//
//   node scripts/check-deploy.ts --build <worker version id> [--base URL]
//       [--settle 15] [--rounds 6] [--interval 10]
//
// The deploy workflow passes the version `wrangler deploy` printed. By hand,
// `npx wrangler deployments status` shows the live one. Read-only: only GETs.

import { BUILD_HEADER, CHECKED_PAGES, problemsWith, staticAssetPaths } from './deploy-check.ts'
import type { PageAnswer } from './deploy-check.ts'

function option(name: string, fallback?: string): string {
    const at = process.argv.indexOf(`--${name}`)
    const value = at === -1 ? fallback : process.argv[at + 1]
    if (value === undefined || value.startsWith('--')) {
        console.error(`Missing --${name}. Usage: node scripts/check-deploy.ts --build <version id>`)
        process.exit(2)
    }
    return value
}

const build = option('build').trim()
const base = option('base', 'https://net-trailers.n8builds.dev').replace(/\/$/, '')
const settleSeconds = Number(option('settle', '15'))
const rounds = Number(option('rounds', '6'))
const intervalSeconds = Number(option('interval', '10'))
if (!/^[0-9a-f-]{8,}$/i.test(build)) {
    console.error(`--build must be a Worker version id, got "${build}"`)
    process.exit(2)
}

// A plain visitor: no cookies, no session, no RSC headers.
const headers = { 'user-agent': 'nettrailers-deploy-check', accept: 'text/html' }
const wait = (seconds: number) => new Promise((done) => setTimeout(done, seconds * 1000))

async function fetchPage(path: string): Promise<PageAnswer> {
    const response = await fetch(`${base}${path}`, { headers, redirect: 'manual' })
    const html = response.status === 200 ? await response.text() : ''
    if (response.status !== 200) await response.body?.cancel()
    return {
        path,
        status: response.status,
        build: response.headers.get(BUILD_HEADER),
        cacheStatus: response.headers.get('cf-cache-status'),
        assets: staticAssetPaths(html),
    }
}

/** Build files are immutable, so each is fetched once. */
const assetStatus = new Map<string, number>()
async function fetchAssets(paths: string[]): Promise<void> {
    const fresh = paths.filter((path) => !assetStatus.has(path))
    await Promise.all(
        fresh.map(async (path) => {
            try {
                const response = await fetch(`${base}${path}`, {
                    headers: { 'user-agent': headers['user-agent'] },
                })
                await response.arrayBuffer()
                assetStatus.set(path, response.status)
            } catch {
                assetStatus.set(path, 0)
            }
        })
    )
}

async function main(): Promise<number> {
    console.log(
        `Checking ${CHECKED_PAGES.length} cached pages on ${base} for build ${build}: ` +
            `${rounds} rounds, ${intervalSeconds}s apart, after ${settleSeconds}s for the deploy to spread.`
    )
    // A deploy takes up to a few seconds to reach every location; until then an
    // old location rightly answers with the old build and its own files.
    await wait(settleSeconds)
    const problems = new Set<string>()
    for (let round = 1; round <= rounds; round++) {
        const pages: PageAnswer[] = []
        const answers = await Promise.allSettled(CHECKED_PAGES.map(fetchPage))
        answers.forEach((answer, i) => {
            if (answer.status === 'fulfilled') pages.push(answer.value)
            else problems.add(`${CHECKED_PAGES[i]} could not be fetched: ${String(answer.reason)}`)
        })
        await fetchAssets([...new Set(pages.flatMap((page) => page.assets))])
        const found = pages.flatMap((page) => problemsWith(page, build, assetStatus))
        found.forEach((problem) => problems.add(problem))
        const hits = pages.filter((page) => page.cacheStatus === 'HIT').length
        console.log(
            `Round ${round}: ${pages.length} pages, ${hits} from the cache, ${assetStatus.size} build files checked, ` +
                (found.length ? `${found.length} problems` : 'all from this build and complete')
        )
        if (round < rounds) await wait(intervalSeconds)
    }
    if (problems.size === 0) {
        console.log(`OK: every cached page is from build ${build} and all its files load.`)
        return 0
    }
    console.error(
        `FAILED: signed-out visitors are getting broken or outdated pages (${problems.size} problems):`
    )
    for (const problem of problems) console.error(`- ${problem}`)
    return 1
}

process.exit(await main())

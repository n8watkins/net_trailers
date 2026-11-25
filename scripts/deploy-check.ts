// What the post-deploy check (scripts/check-deploy.ts) looks at, kept apart
// from the network so the tests can run it (__tests__/scripts/deployCheck.test.ts).
// Plain erasable TypeScript: Node runs it with its built-in type stripping.

import { BUILD_HEADER, PUBLIC_PAGES } from '../worker/edgeCache.ts'

export { BUILD_HEADER }

/**
 * The pages a signed-out visitor gets from the edge cache (worker/edgeCache.ts):
 * the home page, every listed public page, and one of each kind of public
 * detail page. The sitemap is cached too, but names no build files.
 */
export const CHECKED_PAGES: readonly string[] = [
    '/',
    ...PUBLIC_PAGES.filter((path) => path !== '/sitemap.xml'),
    '/person/287',
    '/genres/movie/28',
]

const STATIC_ASSET = /\/_next\/static\/[^"'\s<>\\)]+/g

/** Every /_next/static path a page names, in its tags and in its inline payload, once each. */
export function staticAssetPaths(html: string): string[] {
    return [...new Set(html.match(STATIC_ASSET) ?? [])].sort()
}

export interface PageAnswer {
    path: string
    status: number
    /** The Worker version that rendered it (BUILD_HEADER), or null. */
    build: string | null
    cacheStatus: string | null
    assets: string[]
}

/**
 * What is wrong with one answer: not a 200, not from the deployed build, no
 * build files at all, or a build file that does not load.
 */
export function problemsWith(
    page: PageAnswer,
    deployedBuild: string,
    assetStatus: ReadonlyMap<string, number>
): string[] {
    const where = `${page.path} (cf-cache-status ${page.cacheStatus ?? 'none'})`
    if (page.status !== 200) return [`${where} answered ${page.status}`]
    const problems: string[] = []
    if (page.build !== deployedBuild) {
        const from = page.build ? `build ${page.build}` : `no build (no ${BUILD_HEADER} header)`
        problems.push(`${where} is from ${from}, not the deployed build ${deployedBuild}`)
    }
    if (page.assets.length === 0) problems.push(`${where} names no /_next/static files`)
    for (const asset of page.assets) {
        const status = assetStatus.get(asset)
        if (status !== 200)
            problems.push(`${where} names ${asset}, which answered ${status ?? 'nothing'}`)
    }
    return problems
}

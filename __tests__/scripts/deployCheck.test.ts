/**
 * @jest-environment node
 */

import {
    BUILD_HEADER,
    CHECKED_PAGES,
    COOKIE_PROBES,
    probeProblem,
    problemsWith,
    staticAssetPaths,
    type PageAnswer,
} from '../../scripts/deploy-check'
import { mayUseEdgeCache, PUBLIC_PAGES } from '../../worker/edgeCache'

const BUILD = '0fec2c73-1a7c-4af0-8cb9-f9771870ab05'
const OLD = 'c72ad127-8efa-41df-a3a1-9a3430f150fc'
const host = 'net-trailers.n8builds.dev'

describe('CHECKED_PAGES', () => {
    it('covers the home page and every cached public page a visitor can open', () => {
        expect(CHECKED_PAGES).toContain('/')
        for (const path of PUBLIC_PAGES.filter((p) => p !== '/sitemap.xml')) {
            expect(CHECKED_PAGES).toContain(path)
        }
        for (const path of CHECKED_PAGES) {
            expect(mayUseEdgeCache(new Request(`https://${host}${path}`), host)).toBe(true)
        }
    })
})

describe('staticAssetPaths', () => {
    it('finds the build files in tags and in the inline payload, once each', () => {
        const html = [
            '<link rel="stylesheet" href="/_next/static/css/a1b2.css" data-precedence="next"/>',
            '<script src="/_next/static/chunks/webpack-1.js" async=""></script>',
            '<script>self.__next_f.push([1,"2:I[\\"/_next/static/chunks/app/page-9.js\\"]"])</script>',
            '<script src="/_next/static/chunks/webpack-1.js"></script>',
            '<img src="/_next/image?url=%2Fposter.jpg&w=640"/>',
        ].join('')
        expect(staticAssetPaths(html)).toEqual([
            '/_next/static/chunks/app/page-9.js',
            '/_next/static/chunks/webpack-1.js',
            '/_next/static/css/a1b2.css',
        ])
    })
})

describe('problemsWith', () => {
    const answer = (fields: Partial<PageAnswer>): PageAnswer => ({
        path: '/',
        status: 200,
        build: BUILD,
        cacheStatus: 'HIT',
        assets: ['/_next/static/chunks/a.js', '/_next/static/css/b.css'],
        ...fields,
    })
    const loaded = new Map([
        ['/_next/static/chunks/a.js', 200],
        ['/_next/static/css/b.css', 200],
    ])

    it('passes a complete page from the deployed build', () => {
        expect(problemsWith(answer({}), BUILD, loaded)).toEqual([])
    })

    it("flags the 2026-11-25 failure: the previous build's page with files that are gone", () => {
        const gone = new Map([...loaded, ['/_next/static/chunks/old.js', 404]])
        const problems = problemsWith(
            answer({ build: OLD, assets: ['/_next/static/chunks/old.js'] }),
            BUILD,
            gone
        )
        expect(problems).toEqual([
            `/ (cf-cache-status HIT) is from build ${OLD}, not the deployed build ${BUILD}`,
            '/ (cf-cache-status HIT) names /_next/static/chunks/old.js, which answered 404',
        ])
    })

    it('flags a page with no build stamp, no build files, or another status', () => {
        expect(problemsWith(answer({ build: null }), BUILD, loaded)[0]).toContain(
            `no ${BUILD_HEADER} header`
        )
        expect(problemsWith(answer({ assets: [] }), BUILD, loaded)).toEqual([
            '/ (cf-cache-status HIT) names no /_next/static files',
        ])
        expect(problemsWith(answer({ status: 307 }), BUILD, loaded)).toEqual([
            '/ (cf-cache-status HIT) answered 307',
        ])
    })
})

describe('cookie probes', () => {
    it('only uses requests the edge cache never answers', () => {
        for (const probe of COOKIE_PROBES) {
            const request = new Request(`https://${host}${probe.path}`)
            expect(mayUseEdgeCache(request, host)).toBe(false)
        }
    })

    it('passes the expected status and flags a server error', () => {
        const probe = { path: '/api/health/ai', status: 200 }
        expect(probeProblem(probe, 200)).toEqual([])
        expect(probeProblem(probe, 500)).toEqual([
            '/api/health/ai sent with a cookie answered 500, expected 200',
        ])
    })
})

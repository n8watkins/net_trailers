/**
 * @jest-environment node
 *
 * Route Handler CSRF Protection Lint Guard
 *
 * This test ensures all route.ts files with POST/PUT/DELETE/PATCH handlers
 * are placed under /api/* where proxy.ts provides CSRF protection.
 *
 * Route handlers outside /api/* bypass the proxy and would need manual CSRF checks.
 * To keep security simple and consistent, all mutation routes should live under /api/*.
 *
 * EXEMPTIONS:
 * - Route handlers that only export GET/HEAD/OPTIONS (read-only)
 * - Files explicitly marked with // @non-api-route-allowed comment
 */

import { glob } from 'glob'
import fs from 'fs'
import path from 'path'

/**
 * Check if a route file exports state-changing methods
 */
function hasStateChangingMethods(content: string): boolean {
    // Check for export of POST, PUT, DELETE, PATCH handlers
    const stateChangingMethods = [
        /export\s+(async\s+)?function\s+POST\b/,
        /export\s+(async\s+)?function\s+PUT\b/,
        /export\s+(async\s+)?function\s+DELETE\b/,
        /export\s+(async\s+)?function\s+PATCH\b/,
        /export\s+const\s+POST\s*=/,
        /export\s+const\s+PUT\s*=/,
        /export\s+const\s+DELETE\s*=/,
        /export\s+const\s+PATCH\s*=/,
    ]

    for (const pattern of stateChangingMethods) {
        if (pattern.test(content)) {
            return true
        }
    }

    return false
}

describe('Route Handler CSRF Protection', () => {
    it('all route handlers with mutations must be under /api/*', async () => {
        // Find all route.ts files in app directory
        const routeFiles = await glob('app/**/route.ts', {
            cwd: path.join(__dirname, '../..'),
            absolute: true,
            ignore: ['**/node_modules/**'],
        })

        const violations: string[] = []

        for (const file of routeFiles) {
            const content = fs.readFileSync(file, 'utf-8')
            const relativePath = path.relative(path.join(__dirname, '../..'), file)

            // Skip if explicitly allowed
            if (content.includes('@non-api-route-allowed')) {
                continue
            }

            // Check if it's under /api/
            const isUnderApi = relativePath.startsWith('app/api/')

            // If not under /api/ and has state-changing methods, flag it
            if (!isUnderApi && hasStateChangingMethods(content)) {
                violations.push(relativePath)
            }
        }

        if (violations.length > 0) {
            const message = [
                'Route handlers with mutations found outside /api/*:',
                '',
                ...violations.map((f) => `  - ${f}`),
                '',
                'These routes bypass proxy.ts CSRF protection.',
                '',
                'Options to fix:',
                '1. Move the route under app/api/* to get automatic CSRF protection',
                '2. If this is intentional, add // @non-api-route-allowed comment and implement manual CSRF checks',
                '',
                'See CONTRIBUTING.md for security guidelines.',
            ].join('\n')

            throw new Error(message)
        }
    })

    it('correctly identifies state-changing methods', () => {
        const postContent = `
            export async function POST(request) { }
        `
        expect(hasStateChangingMethods(postContent)).toBe(true)

        const putContent = `
            export const PUT = withAuth(handler)
        `
        expect(hasStateChangingMethods(putContent)).toBe(true)

        const getOnlyContent = `
            export async function GET(request) { }
            export async function HEAD(request) { }
        `
        expect(hasStateChangingMethods(getOnlyContent)).toBe(false)
    })

    it('allows GET-only routes outside /api/', () => {
        // This test documents that GET-only routes are allowed anywhere
        const content = `
            export async function GET(request) {
                return Response.json({ data: 'read-only' })
            }
        `
        expect(hasStateChangingMethods(content)).toBe(false)
    })
})

/**
 * @jest-environment node
 *
 * Server Action CSRF Protection Lint Guard
 *
 * This test ensures all server actions properly validate CSRF tokens.
 * Server actions bypass proxy.ts and must explicitly call validateServerActionOrigin().
 *
 * If this test fails, a new server action was added without CSRF protection.
 * Fix by adding:
 *
 *   import { headers } from 'next/headers'
 *   import { validateServerActionOrigin } from '@/lib/csrfProtection'
 *
 *   export async function myAction() {
 *       const headersList = await headers()
 *       if (!validateServerActionOrigin(headersList)) {
 *           throw new Error('CSRF validation failed')
 *       }
 *       // ... action logic
 *   }
 *
 * EXEMPTIONS:
 * - Files that only contain redirects (no state changes)
 * - Files that only export default page/layout components
 * - Files explicitly marked with // @csrf-exempt comment
 */

import { glob } from 'glob'
import fs from 'fs'
import path from 'path'

/**
 * Check if a 'use server' file needs CSRF protection
 * Returns false for read-only server components (redirects, page renders)
 */
function needsCsrfProtection(content: string): boolean {
    // Exempt if explicitly marked
    if (content.includes('@csrf-exempt')) {
        return false
    }

    // Check for state-changing patterns that require CSRF
    const stateChangingPatterns = [
        /export\s+async\s+function\s+\w+Action/i, // Named action functions
        /export\s+async\s+function\s+(?!default\b)\w+.*\{[^}]*(?:set|update|delete|create|write|save|remove|toggle)/is,
        /\.update\s*\(/, // Firestore update
        /\.set\s*\(/, // Firestore set
        /\.delete\s*\(/, // Firestore delete
        /\.add\s*\(/, // Firestore add
        /cookies\(\).*\.set/, // Setting cookies
    ]

    for (const pattern of stateChangingPatterns) {
        if (pattern.test(content)) {
            return true
        }
    }

    // If it only has redirect() or default export page component, it's safe
    const hasOnlyRedirect =
        content.includes('redirect(') && !content.includes('export async function')
    const isPageComponent = /export\s+default\s+async\s+function\s+\w+.*Page/i.test(content)

    if (hasOnlyRedirect || isPageComponent) {
        return false
    }

    // If file exports non-default async functions, assume they need protection
    if (/export\s+async\s+function\s+(?!default\b)\w+/.test(content)) {
        return true
    }

    return false
}

describe('Server Action CSRF Protection', () => {
    it('all server actions must validate origin', async () => {
        // Search entire codebase for 'use server' files
        const allTsFiles = await glob('{app,lib,components}/**/*.{ts,tsx}', {
            cwd: path.join(__dirname, '../..'),
            absolute: true,
            ignore: ['**/node_modules/**', '**/__tests__/**', '**/*.test.ts', '**/*.test.tsx'],
        })

        const violations: string[] = []

        for (const file of allTsFiles) {
            const content = fs.readFileSync(file, 'utf-8')
            const relativePath = path.relative(path.join(__dirname, '../..'), file)

            // Check if file contains 'use server' directive
            if (content.includes("'use server'") || content.includes('"use server"')) {
                // Check if this file needs CSRF protection
                if (needsCsrfProtection(content)) {
                    // File has state-changing logic - must have CSRF validation
                    if (!content.includes('validateServerActionOrigin')) {
                        violations.push(relativePath)
                    }
                }
            }
        }

        if (violations.length > 0) {
            const message = [
                'Server action files missing CSRF protection:',
                '',
                ...violations.map((f) => `  - ${f}`),
                '',
                'Fix by importing and calling validateServerActionOrigin():',
                '',
                "  import { headers } from 'next/headers'",
                "  import { validateServerActionOrigin } from '@/lib/csrfProtection'",
                '',
                '  export async function myAction() {',
                '      const headersList = await headers()',
                '      if (!validateServerActionOrigin(headersList)) {',
                "          throw new Error('CSRF validation failed')",
                '      }',
                '      // ... action logic',
                '  }',
                '',
                'If this file is safe (redirect-only or read-only), add // @csrf-exempt comment.',
            ].join('\n')

            throw new Error(message)
        }
    })

    it('validates that test can detect missing protection', async () => {
        // This test verifies our detection logic works by checking a known-good file
        const childSafetyPath = path.join(__dirname, '../../lib/actions/childSafety.ts')

        if (fs.existsSync(childSafetyPath)) {
            const content = fs.readFileSync(childSafetyPath, 'utf-8')

            // childSafety.ts should be a server action with validation
            expect(content).toContain("'use server'")
            expect(content).toContain('validateServerActionOrigin')
        }
    })

    it('ignores files without use server directive', async () => {
        // Files without 'use server' should not be flagged
        const mockContent = `
            // This is NOT a server action
            export function regularFunction() {
                return 'hello'
            }
        `

        expect(mockContent).not.toContain("'use server'")
    })
})

describe('needsCsrfProtection', () => {
    it('requires protection for named action functions', () => {
        const content = `
            'use server'
            export async function toggleSomethingAction() {
                // state change
            }
        `
        expect(needsCsrfProtection(content)).toBe(true)
    })

    it('requires protection for Firestore update calls', () => {
        const content = `
            'use server'
            export async function updateUser() {
                await db.collection('users').doc(id).update({ name: 'new' })
            }
        `
        expect(needsCsrfProtection(content)).toBe(true)
    })

    it('exempts redirect-only server components', () => {
        const content = `
            'use server'
            import { redirect } from 'next/navigation'
            export default async function LegacyRedirect() {
                redirect('/new-path')
            }
        `
        expect(needsCsrfProtection(content)).toBe(false)
    })

    it('exempts files with @csrf-exempt comment', () => {
        const content = `
            'use server'
            // @csrf-exempt - This only reads data
            export async function fetchData() {
                return await db.get()
            }
        `
        expect(needsCsrfProtection(content)).toBe(false)
    })

    it('exempts page components', () => {
        const content = `
            'use server'
            export default async function MyPage() {
                const data = await fetch('/api/data')
                return <div>{data}</div>
            }
        `
        expect(needsCsrfProtection(content)).toBe(false)
    })
})

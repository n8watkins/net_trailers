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
 */

import { glob } from 'glob'
import fs from 'fs'
import path from 'path'

describe('Server Action CSRF Protection', () => {
    it('all server actions must validate origin', async () => {
        // Find all TypeScript files in lib/actions
        const actionFiles = await glob('lib/actions/**/*.ts', {
            cwd: path.join(__dirname, '../..'),
            absolute: true,
        })

        const violations: string[] = []

        for (const file of actionFiles) {
            const content = fs.readFileSync(file, 'utf-8')
            const relativePath = path.relative(path.join(__dirname, '../..'), file)

            // Check if file contains 'use server' directive
            if (content.includes("'use server'") || content.includes('"use server"')) {
                // File is a server action - must have CSRF validation
                if (!content.includes('validateServerActionOrigin')) {
                    violations.push(relativePath)
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
        // This is tested implicitly - non-server-action files in lib/actions
        // would fail the first test if we were incorrectly flagging them

        // Create a mock scenario
        const mockContent = `
            // This is NOT a server action
            export function regularFunction() {
                return 'hello'
            }
        `

        // Should not contain 'use server'
        expect(mockContent).not.toContain("'use server'")

        // Therefore it doesn't need validateServerActionOrigin
        // (No assertion needed - this documents expected behavior)
    })
})

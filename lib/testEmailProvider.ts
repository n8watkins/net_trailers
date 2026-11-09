/**
 * Test-only magic-link provider (APP_ENV=test). Instead of sending email it
 * writes the sign-in link to `<E2E_MAGIC_LINK_DIR>/<email>.txt`, where the
 * Playwright suite reads it and opens it, so the real Auth.js email flow
 * (verification token, callback, database session) is exercised end to end.
 */

import type { Provider } from 'next-auth/providers'

import { assertTestMode } from '@/lib/testMode'

export function magicLinkFileName(email: string): string {
    return `${email.toLowerCase().replace(/[^a-z0-9@._-]/g, '_')}.txt`
}

export function TestEmailProvider(): Provider {
    assertTestMode('The test email provider')
    return {
        id: 'email',
        type: 'email',
        name: 'Email',
        from: 'e2e@nettrailers.test',
        server: {},
        maxAge: 60 * 60,
        options: {},
        async sendVerificationRequest({ identifier, url }) {
            assertTestMode('The test email provider')
            const { mkdir, writeFile } = await import('node:fs/promises')
            const { join } = await import('node:path')
            const dir = process.env.E2E_MAGIC_LINK_DIR || join(process.cwd(), '.e2e', 'magic-links')
            await mkdir(dir, { recursive: true })
            await writeFile(join(dir, magicLinkFileName(identifier)), url, 'utf8')
        },
    }
}

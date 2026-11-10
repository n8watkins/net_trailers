import { defineConfig, devices } from '@playwright/test'

/**
 * End-to-end tests against a production build (`next build` first), served in
 * test mode: a fresh local libSQL database (scripts/e2e-db.mjs), magic links
 * written to .e2e/magic-links instead of emailed, and TMDB answered from
 * e2e/fixtures/tmdb. No secrets are needed.
 */

const PORT = Number(process.env.E2E_PORT || 3105)
const baseURL = `http://localhost:${PORT}`

export default defineConfig({
    testDir: './e2e',
    fullyParallel: false,
    workers: 1,
    retries: process.env.CI ? 1 : 0,
    timeout: 60_000,
    expect: { timeout: 10_000 },
    reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
    use: {
        baseURL,
        // The first-visit welcome pop-up (lib/welcome.ts) is marked seen so it
        // does not cover the pages under test
        storageState: {
            cookies: [],
            origins: [
                {
                    origin: baseURL,
                    localStorage: [{ name: 'nettrailers-welcome-seen-v1', value: 'e2e' }],
                },
            ],
        },
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
    },
    projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
    webServer: {
        command: `node scripts/e2e-db.mjs && npx next start -p ${PORT}`,
        url: baseURL,
        timeout: 120_000,
        reuseExistingServer: false,
        stdout: 'pipe',
        env: {
            APP_ENV: 'test',
            TURSO_DATABASE_URL: 'file:.e2e/test.db',
            AUTH_SECRET: 'e2e-only-auth-secret-not-used-anywhere-else',
            AUTH_URL: baseURL,
            NEXT_PUBLIC_APP_URL: baseURL,
            E2E_MAGIC_LINK_DIR: '.e2e/magic-links',
            // Cloudflare's always-pass Turnstile test secret, matching the test
            // site key the build falls back to (hooks/useTurnstile.ts).
            TURNSTILE_SECRET_KEY: '1x0000000000000000000000000000000AA',
            // Placeholder: TMDB answers from fixtures (unless E2E_TMDB_RECORD=1).
            TMDB_API_KEY: process.env.TMDB_API_KEY || 'fixture',
            E2E_TMDB_RECORD: process.env.E2E_TMDB_RECORD || '',
            NEXT_PUBLIC_SENTRY_DSN: '',
            NEXT_PUBLIC_GA_MEASUREMENT_ID: '',
        },
    },
})

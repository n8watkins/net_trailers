/**
 * Test-only switches for the end-to-end suite (e2e/). They turn on only when
 * APP_ENV=test, and refuse to run against anything but a local file: database,
 * so they can never be active in production (where wrangler.jsonc sets
 * APP_ENV=production and the database is Turso).
 */

export function isTestMode(env: NodeJS.ProcessEnv = process.env): boolean {
    if (env.APP_ENV !== 'test') return false
    const url = env.TURSO_DATABASE_URL ?? ''
    if (!url.startsWith('file:') && url !== ':memory:') {
        throw new Error('APP_ENV=test is only allowed with a local file: database')
    }
    return true
}

/** Throws unless test mode is on; called by every test-only code path. */
export function assertTestMode(feature: string, env: NodeJS.ProcessEnv = process.env): void {
    if (env.APP_ENV === 'production' || !isTestMode(env)) {
        throw new Error(`${feature} is test-only and is disabled outside APP_ENV=test`)
    }
}

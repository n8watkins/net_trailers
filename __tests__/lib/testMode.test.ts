import { assertTestMode, isTestMode } from '../../lib/testMode'

const env = (vars: Record<string, string>) => vars as unknown as NodeJS.ProcessEnv

describe('test mode guard', () => {
    it('is off unless APP_ENV=test', () => {
        expect(isTestMode(env({ TURSO_DATABASE_URL: 'file:./x.db' }))).toBe(false)
        expect(isTestMode(env({ APP_ENV: 'production', TURSO_DATABASE_URL: 'file:./x.db' }))).toBe(
            false
        )
    })

    it('refuses test mode against a remote database', () => {
        expect(() =>
            isTestMode(env({ APP_ENV: 'test', TURSO_DATABASE_URL: 'libsql://prod.turso.io' }))
        ).toThrow(/local file/)
    })

    it('allows test mode with a local file database', () => {
        expect(isTestMode(env({ APP_ENV: 'test', TURSO_DATABASE_URL: 'file:./e2e.db' }))).toBe(true)
        expect(() =>
            assertTestMode('x', env({ APP_ENV: 'test', TURSO_DATABASE_URL: 'file:./e2e.db' }))
        ).not.toThrow()
    })

    it('test-only features throw in production', () => {
        expect(() =>
            assertTestMode('The test email provider', env({ APP_ENV: 'production' }))
        ).toThrow(/test-only/)
    })
})

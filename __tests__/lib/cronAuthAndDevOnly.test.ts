/**
 * @jest-environment node
 */

import { hasCronSecret, isValidCronSecret } from '@/lib/cronAuth'
import { isDevOnlyAllowed } from '@/lib/devOnly'

describe('cron secret check', () => {
    const original = process.env.CRON_SECRET
    afterEach(() => {
        process.env.CRON_SECRET = original
    })

    it('accepts only the exact secret, with or without Bearer', () => {
        process.env.CRON_SECRET = 'cron-secret-value'
        expect(isValidCronSecret('cron-secret-value')).toBe(true)
        expect(isValidCronSecret('cron-secret-valuX')).toBe(false)
        expect(isValidCronSecret('cron-secret')).toBe(false)
        expect(hasCronSecret(new Headers({ authorization: 'Bearer cron-secret-value' }))).toBe(true)
        expect(hasCronSecret(new Headers({ authorization: 'Bearer wrong' }))).toBe(false)
        expect(hasCronSecret(new Headers())).toBe(false)
    })

    it('refuses everything when no secret is configured', () => {
        delete process.env.CRON_SECRET
        expect(isValidCronSecret('undefined')).toBe(false)
        expect(hasCronSecret(new Headers({ authorization: 'Bearer undefined' }))).toBe(false)
    })
})

describe('dev-only routes', () => {
    it('answer only in development, never with APP_ENV=production', () => {
        expect(isDevOnlyAllowed({ NODE_ENV: 'development' } as NodeJS.ProcessEnv)).toBe(true)
        expect(isDevOnlyAllowed({ NODE_ENV: 'production' } as NodeJS.ProcessEnv)).toBe(false)
        expect(isDevOnlyAllowed({ NODE_ENV: 'test' } as NodeJS.ProcessEnv)).toBe(false)
        expect(
            isDevOnlyAllowed({
                NODE_ENV: 'development',
                APP_ENV: 'production',
            } as unknown as NodeJS.ProcessEnv)
        ).toBe(false)
    })
})

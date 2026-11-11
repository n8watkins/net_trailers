/**
 * @jest-environment node
 */

import { readFileSync } from 'fs'
import { join } from 'path'
import ts from 'typescript'

import { CRON_ROUTES, runCron, type FetchHandler, type WorkerEnv } from '../../worker/crons'

const root = join(__dirname, '..', '..')
const ctx = {} as ExecutionContext

function wrangler() {
    const parsed = ts.parseConfigFileTextToJson(
        'wrangler.jsonc',
        readFileSync(join(root, 'wrangler.jsonc'), 'utf8')
    )
    return parsed.config as {
        triggers: { crons: string[] }
        vars: Record<string, string>
        r2_buckets: { binding: string }[]
        services: { binding: string; service: string }[]
        send_email: { name: string; allowed_sender_addresses?: string[] }[]
        routes: { pattern: string; custom_domain?: boolean }[]
        name: string
    }
}

function app(status = 200) {
    const fetch = jest.fn(async (_request: Request) => new Response('{}', { status }))
    return { fetch } satisfies FetchHandler
}

const env = (vars: Partial<WorkerEnv>) =>
    ({ CRONS_ENABLED: 'true', CRON_SECRET: 's3cret', ...vars }) as WorkerEnv

describe('wrangler.jsonc', () => {
    it('has the bindings the app reads (lib/cloudflare/env.ts)', () => {
        const config = wrangler()
        expect(config.r2_buckets.map((bucket) => bucket.binding)).toContain('UPLOADS')
        expect(config.services).toContainEqual({
            binding: 'WORKER_SELF_REFERENCE',
            service: config.name,
        })
        expect(config.vars.APP_ENV).toBe('production')
        // Email only from the app's own address (lib/email/cloudflare.ts), on
        // n8builds.dev, the domain onboarded for Email Sending
        expect(config.send_email).toEqual([
            { name: 'EMAIL', allowed_sender_addresses: [config.vars.EMAIL_FROM] },
        ])
        expect(config.vars.EMAIL_FROM).toBe('net-trailers@n8builds.dev')
    })

    it('serves net-trailers.n8builds.dev and keeps the old address only to redirect it', () => {
        const config = wrangler()
        expect(config.vars.PUBLIC_URL).toBe('https://net-trailers.n8builds.dev')
        expect(config.routes).toEqual([
            { pattern: 'net-trailers.n8builds.dev', custom_domain: true },
            { pattern: 'nettrailers.n8builds.dev', custom_domain: true },
        ])
    })
})

describe('Cron Triggers', () => {
    it('run the three crons at the schedules Vercel used', () => {
        // The schedules the Vercel project ran (vercel.json, removed at the
        // cutover); weekdays are named because Cloudflare counts from 1 = Sunday.
        const fromVercel = {
            '0 2 * * MON': '/api/cron/update-trending',
            '0 2 * * SUN': '/api/cron/refresh-collection-cache',
            '0 2 * * WED': '/api/cron/social-digest',
        }
        expect(CRON_ROUTES).toEqual(fromVercel)
        expect([...wrangler().triggers.crons].sort()).toEqual(Object.keys(CRON_ROUTES).sort())
    })

    it('run on the Worker, and stay off whenever CRONS_ENABLED is not "true"', async () => {
        expect(wrangler().vars.CRONS_ENABLED).toBe('true')
        const next = app()
        expect(
            await runCron(next, '0 2 * * WED', env({ CRONS_ENABLED: 'false' }), ctx)
        ).toHaveProperty('skipped')
        expect(next.fetch).not.toHaveBeenCalled()
    })

    it('call each route in-process with the cron secret', async () => {
        const next = app()
        await runCron(next, '0 2 * * MON', env({}), ctx)
        const request = next.fetch.mock.calls[0][0]
        expect(new URL(request.url).pathname).toBe('/api/cron/update-trending')
        expect(request.headers.get('authorization')).toBe('Bearer s3cret')
        expect(request.headers.get('host')).toBe(new URL(request.url).host)
    })

    it('fail the run when the route fails or the secret is missing', async () => {
        await expect(runCron(app(500), '0 2 * * SUN', env({}), ctx)).rejects.toThrow(/500/)
        await expect(
            runCron(app(), '0 2 * * SUN', env({ CRON_SECRET: undefined }), ctx)
        ).rejects.toThrow(/CRON_SECRET/)
        await expect(runCron(app(), '* * * * *', env({}), ctx)).rejects.toThrow(/No route/)
    })
})

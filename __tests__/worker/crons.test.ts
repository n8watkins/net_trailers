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
    })
})

describe('Cron Triggers', () => {
    it('run the Vercel crons at the same schedules', () => {
        const vercel = JSON.parse(readFileSync(join(root, 'vercel.json'), 'utf8')) as {
            crons: { path: string; schedule: string }[]
        }
        // Vercel (standard cron) counts weekdays from 0 = Sunday; the Worker names them.
        const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
        const named = (schedule: string) => {
            const fields = schedule.split(' ')
            fields[4] = DAYS[Number(fields[4])]
            return fields.join(' ')
        }
        const fromVercel = Object.fromEntries(
            vercel.crons.map((cron) => [named(cron.schedule), cron.path])
        )
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

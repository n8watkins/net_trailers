/**
 * @jest-environment node
 */

import { readFileSync } from 'fs'
import { join } from 'path'

import { isInternalPath, readAdminStats } from '../../worker/adminStats'
import type { FetchHandler, WorkerEnv } from '../../worker/crons'

const ctx = {} as ExecutionContext

function app(body: unknown, status = 200) {
    const fetch = jest.fn(
        async (_request: Request) => new Response(JSON.stringify(body), { status })
    )
    return { fetch } satisfies FetchHandler
}

const meta = { id: 'abcdef1234567890', tag: '', timestamp: '2026-11-10T12:00:00.000Z' }
const env = (vars: Partial<WorkerEnv> = {}) =>
    ({ CRON_SECRET: 's3cret', CF_VERSION_METADATA: meta, ...vars }) as WorkerEnv

describe('the AdminStats entrypoint (worker/adminStats.ts)', () => {
    it('refuses the service-only paths to outside requests', () => {
        expect(isInternalPath('/api/internal/admin-stats')).toBe(true)
        expect(isInternalPath('/api/internal/')).toBe(true)
        expect(isInternalPath('/api/internals')).toBe(false)
        expect(isInternalPath('/api/admin/users')).toBe(false)
    })

    it('reads the totals in-process with the secret and adds the live version', async () => {
        const handler = app({ schema: 1, app: 'nettrailers', totals: [] })
        const stats = await readAdminStats(handler, env(), ctx)
        const request = handler.fetch.mock.calls[0][0]
        expect(new URL(request.url).pathname).toBe('/api/internal/admin-stats')
        expect(request.headers.get('authorization')).toBe('Bearer s3cret')
        expect(request.headers.get('host')).toBe('worker.internal')
        expect(stats).toMatchObject({
            schema: 1,
            app: 'nettrailers',
            deploy: { version: 'abcdef12', deployedAt: '2026-11-10T12:00:00.000Z' },
        })
    })

    it('prefers a version tag, and says unknown without metadata', async () => {
        const tagged = await readAdminStats(
            app({}),
            env({ CF_VERSION_METADATA: { ...meta, tag: 'v2.1.0' } }),
            ctx
        )
        expect(tagged.deploy).toEqual({ version: 'v2.1.0', deployedAt: meta.timestamp })
        const bare = await readAdminStats(
            app({}),
            env({ CF_VERSION_METADATA: undefined as unknown as WorkerVersionMetadata }),
            ctx
        )
        expect(bare.deploy).toEqual({ version: 'unknown', deployedAt: null })
    })

    it('fails loudly without the secret or when the route fails', async () => {
        await expect(readAdminStats(app({}), env({ CRON_SECRET: undefined }), ctx)).rejects.toThrow(
            'CRON_SECRET is not set'
        )
        await expect(readAdminStats(app({}, 500), env(), ctx)).rejects.toThrow('status 500')
    })

    it('is exported from the Worker entry under the name n8builds-admin binds', () => {
        const source = readFileSync(join(__dirname, '..', '..', 'worker', 'index.ts'), 'utf8')
        expect(source).toMatch(/export class AdminStats extends WorkerEntrypoint/)
    })
})

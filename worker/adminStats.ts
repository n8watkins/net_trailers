// The AdminStats entrypoint: n8builds-admin (admin.n8builds.dev) binds to it
// as NETTRAILERS_ADMIN and calls stats() over RPC. A named entrypoint is
// reachable only through a service binding on the same account, never from
// the internet. The totals come from /api/internal/admin-stats, run in-process
// the same way the crons are (worker/crons.ts); the shape is n8builds-admin's
// docs/APP-STATS.md.

import type { FetchHandler, WorkerEnv } from './crons'

export const INTERNAL_PREFIX = '/api/internal/'
const INTERNAL_HOST = 'worker.internal'

/** Whether an outside request is for a service-only route (the Worker answers 404). */
export function isInternalPath(pathname: string): boolean {
    return pathname.startsWith(INTERNAL_PREFIX)
}

/** Reads the app's totals in-process; throws with the status when the route fails. */
export async function readAdminStats(
    app: FetchHandler,
    env: WorkerEnv,
    ctx: ExecutionContext
): Promise<Record<string, unknown>> {
    if (!env.CRON_SECRET) throw new Error('CRON_SECRET is not set on net-trailers')
    const request = new Request(`https://${INTERNAL_HOST}${INTERNAL_PREFIX}admin-stats`, {
        headers: { host: INTERNAL_HOST, authorization: `Bearer ${env.CRON_SECRET}` },
    })
    const response = await app.fetch(request, env, ctx)
    if (!response.ok) throw new Error(`net-trailers stats failed with status ${response.status}`)
    const stats = (await response.json()) as Record<string, unknown>
    const meta = env.CF_VERSION_METADATA
    return {
        ...stats,
        deploy: {
            version: meta?.tag || meta?.id?.slice(0, 8) || 'unknown',
            deployedAt: meta?.timestamp ?? null,
        },
    }
}

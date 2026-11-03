// The Cron Triggers that replaced the three Vercel crons (vercel.json), with
// the same schedules. Each calls its existing /api/cron/* route in-process
// through the OpenNext handler (no network hop), with the same
// `Authorization: Bearer $CRON_SECRET` Vercel Cron sent, so the routes and the
// proxy's cron check stay as they are.

export type FetchHandler = {
    fetch(request: Request, env: WorkerEnv, ctx: ExecutionContext): Promise<Response>
}

/** The bindings (cloudflare-env.d.ts) plus the secrets read here, which may be unset. */
export type WorkerEnv = CloudflareEnv & { CRON_SECRET?: string }

/**
 * wrangler.jsonc triggers.crons, each mapped to the route it runs. Weekdays are
 * named: Cloudflare counts them from 1 = Sunday, so Vercel's `1` (Monday) would
 * run a day early and its `0` (Sunday) is refused.
 */
export const CRON_ROUTES: Record<string, string> = {
    '0 2 * * MON': '/api/cron/update-trending',
    '0 2 * * SUN': '/api/cron/refresh-collection-cache',
    '0 2 * * WED': '/api/cron/social-digest',
}

// Handled in-process, so the host never resolves. The host header must match
// it, or OpenNext treats the request as external and fetches it over the network.
const INTERNAL_HOST = 'worker.internal'

export async function runCron(
    app: FetchHandler,
    cron: string,
    env: WorkerEnv,
    ctx: ExecutionContext
): Promise<{ route: string; status: number } | { skipped: string }> {
    const route = CRON_ROUTES[cron]
    if (!route) throw new Error(`No route for cron "${cron}"`)
    // Vercel runs the same crons against the same database until that project
    // is turned off, and two social digests at once could email people twice.
    // The owner sets CRONS_ENABLED to "true" in wrangler.jsonc when Vercel stops.
    if (env.CRONS_ENABLED !== 'true') return { skipped: 'CRONS_ENABLED is not "true"' }
    if (!env.CRON_SECRET) throw new Error('CRON_SECRET is not set')
    const request = new Request(`https://${INTERNAL_HOST}${route}`, {
        headers: { host: INTERNAL_HOST, authorization: `Bearer ${env.CRON_SECRET}` },
    })
    const response = await app.fetch(request, env, ctx)
    // A failed run throws, so Cloudflare records the cron run as failed.
    if (!response.ok) throw new Error(`${route} failed with status ${response.status}`)
    return { route, status: response.status }
}

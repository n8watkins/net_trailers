/**
 * Development-only routes (debug helpers) answer only under `next dev`.
 *
 * Two independent checks, so one misconfiguration cannot turn them on in
 * production: NODE_ENV must be "development" (the build inlines "production"
 * into the Worker bundle), and APP_ENV must not be "production" (set in
 * wrangler.jsonc for the deployed Worker).
 */

import { NextResponse } from 'next/server'

export function isDevOnlyAllowed(env: NodeJS.ProcessEnv = process.env): boolean {
    return env.NODE_ENV === 'development' && env.APP_ENV !== 'production'
}

/** The 404 a dev-only route answers with elsewhere (it does not exist there). */
export function devOnlyNotFound(): NextResponse {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
}

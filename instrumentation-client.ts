/**
 * Sentry in the browser. Next runs this file before the app starts
 * (instrumentation-client.ts); the old sentry.client.config.ts was only loaded
 * by Sentry's webpack plugin, so under Turbopack the browser SDK never started.
 *
 * Errors only, plus a small sample of page-load traces: no Session Replay
 * (it would record what people type) and no feedback button. Builds without
 * NEXT_PUBLIC_SENTRY_DSN (local, CI, tests) load nothing.
 */

import * as Sentry from '@sentry/nextjs'

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN

if (dsn) {
    Sentry.init({
        dsn,
        environment: process.env.NODE_ENV,
        tracesSampleRate: 0.1,
        sendDefaultPii: false,
        ignoreErrors: [
            'Non-Error promise rejection captured',
            'ResizeObserver loop limit exceeded',
            'Network request failed',
            'ChunkLoadError',
            'Loading chunk',
        ],
        beforeSend(event) {
            if (event.user) {
                delete event.user.email
                delete event.user.ip_address
            }
            return event
        },
    })
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart

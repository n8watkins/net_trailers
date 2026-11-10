import type { Instrumentation } from 'next'
import { errorSummary, logError, pathOf, safeCode } from './lib/log'

export async function register() {
    // End-to-end tests only (APP_ENV=test): answer TMDB from recorded fixtures.
    if (process.env.APP_ENV === 'test' && process.env.NEXT_RUNTIME === 'nodejs') {
        const { installTmdbFixtures } = await import('./lib/e2eTmdbFixtures')
        installTmdbFixtures()
    }

    // Only initialize Sentry if we have a valid DSN
    const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN
    if (!sentryDsn || sentryDsn === 'YOUR_SENTRY_DSN_HERE') {
        console.log('Sentry disabled: No valid DSN provided')
        return
    }

    if (process.env.NEXT_RUNTIME === 'nodejs') {
        // Server-side initialization
        const { init } = await import('@sentry/nextjs')

        init({
            dsn: sentryDsn,

            // Performance Monitoring
            tracesSampleRate: 1.0,

            // Environment
            environment: process.env.NODE_ENV,

            // Server-specific configurations
            debug: false,

            // Filter out sensitive data
            beforeSend(event) {
                // Remove sensitive user data
                if (event.user) {
                    delete event.user.email
                    delete event.user.ip_address
                }
                return event
            },
        })
    }

    if (process.env.NEXT_RUNTIME === 'edge') {
        // Edge runtime initialization
        const { init } = await import('@sentry/nextjs')

        init({
            dsn: sentryDsn,

            // Performance Monitoring
            tracesSampleRate: 1.0,

            // Environment
            environment: process.env.NODE_ENV,

            // Edge runtime specific configurations
            debug: false,
        })
    }
}

// Errors thrown in pages, route handlers and the proxy: one JSON line with the
// route for Workers Logs. The path drops its query string, which can carry
// codes or state.
export const onRequestError: Instrumentation.onRequestError = (error, request, context) => {
    logError({
        event: 'unhandled_exception',
        reason: context.routeType,
        route: context.routePath,
        path: pathOf(request.path),
        method: request.method,
        status: 500,
        error: errorSummary(error),
        digest: safeCode((error as { digest?: unknown } | null)?.digest),
    })
}

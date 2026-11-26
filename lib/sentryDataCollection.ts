import type { BrowserOptions } from '@sentry/nextjs'

const IDENTIFYING_HEADERS = { deny: ['forwarded', '-ip', 'remote-', 'via', '-user'] }

/**
 * What Sentry may attach to events: no user details, cookies, bodies, database
 * queries or AI prompts, and headers and query strings with identifying values
 * left out. Sentry 11 replaced `sendDefaultPii: false` with this option and
 * collects all of it when the option is left unset, so every Sentry.init here
 * passes it. These are the values Sentry's migration guide gives for keeping
 * the 10.x default.
 */
export const SENTRY_DATA_COLLECTION: NonNullable<BrowserOptions['dataCollection']> = {
    userInfo: false,
    cookies: false,
    httpHeaders: { request: IDENTIFYING_HEADERS, response: IDENTIFYING_HEADERS },
    httpBodies: [],
    urlQueryParams: IDENTIFYING_HEADERS,
    genAI: { inputs: false, outputs: false },
    databaseQueryData: false,
    queues: false,
    graphQL: { document: false, variables: false },
}

/**
 * What the Security page says. Every line here is a claim about the running
 * app, so each one names the code that makes it true (the `evidence` field is
 * for maintainers and is not shown). When the code changes, change the line.
 *
 * The page once described a previous version of the app. The words that must
 * never come back are listed in __tests__/app/securityPage.test.ts.
 */

export type SecurityIcon = 'signin' | 'data' | 'limits' | 'browser' | 'child'

export interface SecurityClaim {
    text: string
    /** File (and line) that makes the claim true. Not rendered. */
    evidence: string
}

export interface SecuritySection {
    id: string
    icon: SecurityIcon
    title: string
    claims: SecurityClaim[]
}

export const SECURITY_INTRO =
    'NetTrailers is a portfolio project. This page lists what the code does today to protect accounts and data. It has not been through an independent audit.'

export const SECURITY_DOC_URL = 'https://github.com/n8watkins/net_trailers/blob/main/SECURITY.md'
export const SECURITY_ISSUES_URL = 'https://github.com/n8watkins/net_trailers/issues/new'

export const SECURITY_SECTIONS: SecuritySection[] = [
    {
        id: 'signing-in',
        icon: 'signin',
        title: 'Signing in',
        claims: [
            {
                text: 'There are no passwords. You sign in with a link emailed to you, or with GitHub.',
                evidence: 'auth.ts:36-47 (email provider), auth.ts:72-84 (GitHub provider)',
            },
            {
                text: 'A sign-in link works once and expires after 24 hours.',
                evidence:
                    'auth.ts:44 (maxAge), node_modules/@auth/drizzle-adapter useVerificationToken deletes the row',
            },
            {
                text: 'Asking for a link has to pass a Cloudflare Turnstile check on the server first, and is refused if the check cannot be completed.',
                evidence:
                    'lib/turnstile.ts:15-17 and :44-58 (fails closed), app/api/auth/[...nextauth]/route.ts:4-8',
            },
            {
                text: 'Sign-in emails are limited per address, per network address and for the whole site each day.',
                evidence: 'lib/email/signInLimits.ts:18-37, auth.ts signIn callback',
            },
            {
                text: 'Your session is stored in our database and carried by an HttpOnly cookie.',
                evidence:
                    'auth.ts:61 (database sessions), @auth/core lib/utils/cookie.js httpOnly: true',
            },
        ],
    },
    {
        id: 'your-data',
        icon: 'data',
        title: 'Your data',
        claims: [
            {
                text: 'The browser never talks to the database. Every read and write goes through a server route.',
                evidence:
                    'db/index.ts is imported only by app/api routes, db/queries and server code',
            },
            {
                text: 'Changes to your data use the account from your session, never an id sent with the request.',
                evidence:
                    'lib/auth-middleware.ts (withAuth), app/api/watch-history/route.ts, app/api/child-safety/pin/route.ts, app/api/notifications/[id]/route.ts, app/api/collections/duplicate/route.ts, app/api/upload/route.ts',
            },
            {
                text: 'You can edit or delete a ranking or a forum thread only if you wrote it. Admins can also moderate them.',
                evidence:
                    'db/queries/rankings.ts:195-205 (edit), app/api/rankings/[id]/delete/route.ts:39, db/queries/threads.ts:207 and :243',
            },
            {
                text: 'Uploaded images must be JPEG, PNG, WebP, GIF or AVIF and under 5 MB. They are stored under your own user folder, and SVG is refused.',
                evidence: 'lib/uploads.ts:12-22 and :29-31, app/api/upload/route.ts:30-38',
            },
            {
                text: 'Tag-shaped text is stripped from collection names and descriptions, and React escapes what it renders.',
                evidence:
                    'services/userListsService.ts:25-34; no dangerouslySetInnerHTML in app, components, hooks, utils or services outside app/docs',
            },
            {
                text: 'Error reports sent to Sentry have the email address and IP address removed.',
                evidence: 'instrumentation-client.ts:20-33, instrumentation.ts:35-41',
            },
        ],
    },
    {
        id: 'abuse',
        icon: 'limits',
        title: 'Limits and checks',
        claims: [
            {
                text: 'Live AI searches have a daily cap per visitor and another for the whole site, counted in the database.',
                evidence: 'lib/aiQuota.ts:14-19, app/api/gemini/analyze/route.ts:31-33',
            },
            {
                text: 'API requests that declare a body over 1 MB, or over 500 KB for JSON, are refused.',
                evidence: 'proxy.ts:11-12 and :84-106',
            },
            {
                text: 'API requests that change something must come from this site: the origin is checked against an exact match.',
                evidence: 'proxy.ts:72-79, lib/csrfProtection.ts:41-60',
            },
            {
                text: 'Scheduled jobs need a secret, compared in constant time.',
                evidence: 'lib/cronAuth.ts:4-17, proxy.ts:56-67',
            },
            {
                text: 'Admin pages need a signed-in session whose email is on the admin list.',
                evidence: 'lib/admin.ts, utils/adminMiddleware.ts:20-30',
            },
        ],
    },
    {
        id: 'browser',
        icon: 'browser',
        title: 'In your browser',
        claims: [
            {
                text: 'A Content Security Policy with a fresh script nonce on every request. Scripts cannot use eval, and no other site can frame NetTrailers.',
                evidence: 'lib/csp.ts:32-69 (checked on the live site headers)',
            },
            {
                text: 'HTTPS is enforced for a year with Strict-Transport-Security, and the site sends X-Content-Type-Options: nosniff, a referrer policy that limits what other sites learn and a Permissions-Policy that turns off the camera and location.',
                evidence: 'next.config.js:86-120 (checked on the live site headers)',
            },
        ],
    },
    {
        id: 'child-safety',
        icon: 'child',
        title: 'Child safety PIN',
        claims: [
            {
                text: 'The optional PIN is 4 to 6 digits. Only a bcrypt hash (10 rounds) is stored, and it is never sent back.',
                evidence: 'types/childSafety.ts:86-98, db/queries/childSafety.ts:36-46 and :95-107',
            },
            {
                text: 'After 5 wrong PINs, further tries are refused until the 5-minute window ends. The count is kept in the database.',
                evidence: 'app/api/child-safety/pin/route.ts:33-58 and :104-120',
            },
            {
                text: 'A correct PIN is remembered only in the open page, so you enter it again after reloading.',
                evidence: 'stores/childSafetyStore.ts:167-185 (no persistence)',
            },
        ],
    },
]

/**
 * Auth.js (NextAuth v5) configuration.
 *
 * Authentication via passwordless email magic links (sent through Cloudflare
 * Email Service by the email gate, lib/email/gate.ts) and, optionally, GitHub,
 * backed by the Turso/Drizzle adapter. Replaces Firebase Auth. Database session
 * strategy so `session.user.id` is the canonical Turso user id used for all
 * ownership checks.
 *
 * Admin is identified by email (ADMIN_EMAILS, lib/admin.ts) rather than a
 * generated user id, so it can be configured before the first sign-in.
 */

import { DrizzleAdapter } from '@auth/drizzle-adapter'
import NextAuth from 'next-auth'
import { headers } from 'next/headers'
import GitHub from 'next-auth/providers/github'
import type { Provider } from 'next-auth/providers'

import { db } from '@/db'
import { accounts, sessions, users, verificationTokens } from '@/db/schema'
import { authLogger } from '@/lib/log'
import { isAdminEmail } from '@/lib/admin'
import { isGitHubAuthConfigured } from '@/lib/authConfig'
import { githubUser, isGitHubSignInAllowed } from '@/lib/githubAuth'
import { isTestMode } from '@/lib/testMode'
import { deliverSignInLink } from '@/lib/email/gate'
import { SIGN_IN_EMAIL_LIMIT_ERROR, reserveSignInEmail } from '@/lib/email/signInLimits'
import { TestEmailProvider } from '@/lib/testEmailProvider'

/**
 * Passwordless email sign-in. The link is reserved against the email limits in
 * the signIn callback below and delivered through Cloudflare Email Service
 * (lib/email/gate.ts). The provider id "email" is what the client asks for.
 */
function CloudflareEmail(): Provider {
    return {
        id: 'email',
        type: 'email',
        name: 'Email',
        from: process.env.EMAIL_FROM || 'net-trailers@n8builds.dev',
        server: {},
        maxAge: 24 * 60 * 60,
        options: {},
        async sendVerificationRequest({ identifier, url }) {
            await deliverSignInLink(identifier, url)
        },
    }
}

// APP_ENV=test (end-to-end tests with a local file database only) swaps in a
// provider that writes the link to disk; lib/testMode.ts refuses it elsewhere.
const emailProvider = isTestMode() ? TestEmailProvider() : CloudflareEmail()

export const { handlers, auth, signIn, signOut } = NextAuth({
    adapter: DrizzleAdapter(db, {
        usersTable: users,
        accountsTable: accounts,
        sessionsTable: sessions,
        verificationTokensTable: verificationTokens,
    }),
    session: { strategy: 'database' },
    // Callback and magic-link URLs follow the host the request came in on
    // (net-trailers.n8builds.dev in production; the old host 301s there first).
    trustHost: true,
    // Error type and a masked message only; see lib/log.ts.
    logger: authLogger,
    providers: [
        // Passwordless email magic links (see emailProvider above).
        emailProvider,
        // GitHub sign-in is an extra option for visitors, registered only when
        // both OAuth App values exist. The modal asks /api/auth/providers and
        // hides the button when it is absent. See lib/githubAuth.ts for linking.
        ...(isGitHubAuthConfigured()
            ? [
                  GitHub({
                      // AUTH_GITHUB_ID / AUTH_GITHUB_SECRET are read from env automatically.
                      authorization: { params: { scope: 'read:user user:email' } },
                      // Safe only because the profile email is GitHub-verified (lib/githubAuth.ts).
                      allowDangerousEmailAccountLinking: true,
                      async profile(profile, tokens) {
                          return githubUser(profile, tokens.access_token)
                      },
                  }),
              ]
            : []),
    ],
    callbacks: {
        /**
         * For a request to email a sign-in link, the email limits: per address,
         * per IP and site-wide (lib/email/signInLimits.ts). There is no cap on
         * the number of accounts (removed 2026-11-10, docs/costs-and-limits.md).
         */
        async signIn({ user, email, account }) {
            // A GitHub sign-in without a verified primary email is refused.
            if (!isGitHubSignInAllowed(account?.provider, user.email)) return false
            if (email?.verificationRequest && user.email) {
                const reservation = await reserveSignInEmail(user.email, await headers())
                if (!reservation.allowed) {
                    // Auth.js redirects here; the sign-in form reads `error`.
                    return `/?error=${SIGN_IN_EMAIL_LIMIT_ERROR}`
                }
            }
            return true
        },
        session({ session, user }) {
            if (session.user) {
                session.user.id = user.id
                session.user.isAdmin = isAdminEmail(user.email)
            }
            return session
        },
    },
})

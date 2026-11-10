/**
 * Auth.js (NextAuth v5) configuration.
 *
 * Authentication via GitHub OAuth and passwordless email magic links (sent
 * through Cloudflare Email Service by the email gate, lib/email/gate.ts),
 * backed by the Turso/Drizzle adapter. Replaces Firebase Auth. Database session
 * strategy so `session.user.id` is the canonical Turso user id used for all
 * ownership checks.
 *
 * Admin is identified by GitHub login (ADMIN_GITHUB_LOGIN) rather than a
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
import { isTestMode } from '@/lib/testMode'
import { deliverSignInLink } from '@/lib/email/gate'
import { SIGN_IN_EMAIL_LIMIT_ERROR, reserveSignInEmail } from '@/lib/email/signInLimits'
import { TestEmailProvider } from '@/lib/testEmailProvider'

const adminLogin = process.env.ADMIN_GITHUB_LOGIN?.toLowerCase()

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
        from: process.env.EMAIL_FROM || 'nettrailers@n8builds.dev',
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
    // Required when running behind a proxy (Vercel) so Auth.js trusts the
    // X-Forwarded-Host header for callback URL construction.
    trustHost: true,
    // Error type and a masked message only; see lib/log.ts.
    logger: authLogger,
    providers: [
        GitHub({
            // AUTH_GITHUB_ID / AUTH_GITHUB_SECRET are read from env automatically.
            profile(profile) {
                return {
                    id: profile.id.toString(),
                    name: profile.name ?? profile.login,
                    email: profile.email,
                    image: profile.avatar_url,
                    // Persisted on the users row; used for admin identification.
                    githubLogin: profile.login,
                }
            },
        }),
        // Passwordless email magic links (see emailProvider above).
        emailProvider,
    ],
    callbacks: {
        /**
         * For a request to email a sign-in link, the email limits: per address,
         * per IP and site-wide (lib/email/signInLimits.ts). There is no cap on
         * the number of accounts (removed 2026-11-10, docs/costs-and-limits.md).
         */
        async signIn({ user, email }) {
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
                const login = (user as { githubLogin?: string }).githubLogin
                session.user.githubLogin = login
                session.user.isAdmin = !!adminLogin && login?.toLowerCase() === adminLogin
            }
            return session
        },
    },
})

/**
 * Auth.js (NextAuth v5) configuration.
 *
 * Authentication via GitHub OAuth and passwordless email magic links (Resend),
 * backed by the Turso/Drizzle adapter. Replaces Firebase Auth. Database session
 * strategy so `session.user.id` is the canonical Turso user id used for all
 * ownership checks.
 *
 * Admin is identified by GitHub login (ADMIN_GITHUB_LOGIN) rather than a
 * generated user id, so it can be configured before the first sign-in.
 */

import { DrizzleAdapter } from '@auth/drizzle-adapter'
import { and, eq, sql } from 'drizzle-orm'
import NextAuth from 'next-auth'
import GitHub from 'next-auth/providers/github'
import Resend from 'next-auth/providers/resend'
import type { Provider } from 'next-auth/providers'

import { db } from '@/db'
import { accounts, sessions, users, verificationTokens } from '@/db/schema'

const adminLogin = process.env.ADMIN_GITHUB_LOGIN?.toLowerCase()

// Hard cap on total accounts — a cost guard for this portfolio project. The
// signIn callback blocks brand-new signups once the cap is hit; existing users
// always sign in. 0 / unset disables the cap.
const maxTotalAccounts = parseInt(process.env.NEXT_PUBLIC_MAX_TOTAL_ACCOUNTS || '50', 10)

// The "From" address for magic-link emails (a verified sender). Both providers
// share it. Falls back to Resend's shared test sender for local dev.
const emailFrom =
    process.env.EMAIL_FROM || process.env.RESEND_SENDER_EMAIL || 'onboarding@resend.dev'

/**
 * Brevo magic-link provider — delivers the sign-in link via Brevo's
 * transactional email HTTP API. Needs only BREVO_API_KEY + a verified sender
 * (no domain required). Tokens live in the verificationToken table (adapter).
 */
function BrevoEmail(): Provider {
    return {
        id: 'email',
        type: 'email',
        name: 'Email',
        from: emailFrom,
        server: {},
        maxAge: 24 * 60 * 60,
        options: {},
        async sendVerificationRequest({ identifier, url }) {
            const res = await fetch('https://api.brevo.com/v3/smtp/email', {
                method: 'POST',
                headers: {
                    accept: 'application/json',
                    'content-type': 'application/json',
                    'api-key': process.env.BREVO_API_KEY ?? '',
                },
                body: JSON.stringify({
                    sender: { email: emailFrom, name: 'NetTrailer' },
                    to: [{ email: identifier }],
                    subject: 'Your NetTrailer sign-in link',
                    htmlContent: `<div style="font-family:sans-serif;max-width:480px;margin:auto">
                        <h2 style="color:#e50914">Sign in to NetTrailer</h2>
                        <p>Click the button below to sign in. This link expires in 24 hours.</p>
                        <p><a href="${url}" style="display:inline-block;background:#e50914;color:#fff;padding:12px 22px;border-radius:6px;text-decoration:none;font-weight:600">Sign in</a></p>
                        <p style="color:#888;font-size:13px">Tip: open this link in the browser where you want to be signed in (e.g. Safari or Chrome), not inside an email app's preview.</p>
                        <p style="color:#666;font-size:13px">Or paste this URL into your browser:<br>${url}</p>
                    </div>`,
                }),
            })
            if (!res.ok) {
                const body = await res.text().catch(() => '')
                throw new Error(`Brevo email send failed (${res.status}): ${body}`)
            }
        },
    }
}

// Email magic-link provider, selectable via EMAIL_PROVIDER without code changes.
// Both providers use the same verificationToken table, so switching is seamless.
// Default: Brevo (single API key, verify a single sender — no domain needed).
// Set EMAIL_PROVIDER=resend to switch to Resend (requires a verified domain).
// Both expose the stable provider id "email" so the client never changes.
const emailProvider =
    process.env.EMAIL_PROVIDER === 'resend'
        ? Resend({ id: 'email', apiKey: process.env.RESEND_API_KEY, from: emailFrom })
        : BrevoEmail()

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
        // Passwordless email magic links (SendGrid or Resend — see emailProvider above).
        emailProvider,
    ],
    callbacks: {
        /**
         * Enforce the total-account cap on new signups. This runs BEFORE the
         * adapter creates the user (verified against @auth/core's callback
         * ordering), so a brand-new user has no users/accounts row yet:
         *  - returning OAuth user → an `accounts` row already matches → allow.
         *  - returning email user → a `users` row already matches by email → allow.
         *  - otherwise it's a new signup → block once count >= cap.
         */
        async signIn({ user, account }) {
            if (!Number.isFinite(maxTotalAccounts) || maxTotalAccounts <= 0) return true

            // Returning user via a linked OAuth account?
            if (account?.provider && account.providerAccountId) {
                const linked = await db
                    .select({ userId: accounts.userId })
                    .from(accounts)
                    .where(
                        and(
                            eq(accounts.provider, account.provider),
                            eq(accounts.providerAccountId, account.providerAccountId)
                        )
                    )
                    .limit(1)
                if (linked.length > 0) return true
            }

            // Returning user by email (covers the email magic-link provider)?
            if (user.email) {
                const existing = await db
                    .select({ id: users.id })
                    .from(users)
                    .where(eq(users.email, user.email))
                    .limit(1)
                if (existing.length > 0) return true
            }

            // Brand-new signup — enforce the hard cap.
            const [row] = await db.select({ count: sql<number>`count(*)` }).from(users)
            if (Number(row?.count ?? 0) >= maxTotalAccounts) {
                console.warn('[auth] Signup blocked — account cap reached:', maxTotalAccounts)
                return false
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

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
import NextAuth from 'next-auth'
import GitHub from 'next-auth/providers/github'
import Resend from 'next-auth/providers/resend'
import SendGrid from 'next-auth/providers/sendgrid'

import { db } from '@/db'
import { accounts, sessions, users, verificationTokens } from '@/db/schema'

const adminLogin = process.env.ADMIN_GITHUB_LOGIN?.toLowerCase()

// The "From" address for magic-link emails (a verified sender). Both providers
// share it. Falls back to Resend's shared test sender for local dev.
const emailFrom =
    process.env.EMAIL_FROM || process.env.RESEND_SENDER_EMAIL || 'onboarding@resend.dev'

// Email magic-link provider, selectable via EMAIL_PROVIDER without code changes.
// Both providers use the same verificationToken table, so switching is seamless.
// Default: SendGrid (single-sender verification — no domain needed). Set
// EMAIL_PROVIDER=resend to switch to Resend (requires a verified domain).
// Both expose the stable provider id "email" so the client never changes.
const emailProvider =
    process.env.EMAIL_PROVIDER === 'resend'
        ? Resend({ id: 'email', apiKey: process.env.RESEND_API_KEY, from: emailFrom })
        : SendGrid({ id: 'email', apiKey: process.env.AUTH_SENDGRID_KEY, from: emailFrom })

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

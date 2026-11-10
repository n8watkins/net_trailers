/**
 * The email gate: every email the app sends is counted here first.
 *
 * Email goes out through Cloudflare Email Service (lib/email/cloudflare.ts),
 * which bills past its included monthly amount and has no per-app cap of its
 * own, so the app's own cap is the hard stop. Each send spends one unit from:
 *  - any per-caller rules the sender passes (per address, per IP, per user),
 *  - the site-wide daily cap (EMAIL_DAILY_CAP, default 200),
 *  - the site-wide monthly cap (EMAIL_MONTHLY_CAP, default 2,000).
 * If any is used up, nothing is sent and nothing is spent. Counters live in
 * the database (lib/durableLimit.ts), so they hold across Worker isolates.
 *
 * It also keeps per-kind daily counts of sent and refused emails (never the
 * address or the body) for `getEmailUsage`.
 *
 * Sign-in links are reserved in auth.ts's signIn callback, where a refusal can
 * be shown to the visitor, and delivered right after by `deliverSignInLink`;
 * every other email goes through `sendEmail`, which reserves and delivers.
 */

import type { ReactElement } from 'react'
import { render, toPlainText } from '@react-email/render'

import {
    consumeLimits,
    countEvent,
    readCount,
    readLimit,
    type LimitResult,
    type LimitRule,
} from '@/lib/durableLimit'
import { EMAIL_FROM, emailBinding } from './cloudflare'
import { signInEmail } from './templates/sign-in'

export type EmailKind =
    'sign-in' | 'forum-reply' | 'social-digest' | 'trending' | 'announcement' | 'custom'

export const EMAIL_KINDS: EmailKind[] = [
    'sign-in',
    'forum-reply',
    'social-digest',
    'trending',
    'announcement',
    'custom',
]

/** Emails the whole site may send per UTC day. */
export function emailDailyCap(): number {
    return readLimit('EMAIL_DAILY_CAP', 200)
}

/** Emails the whole site may send per UTC month. */
export function emailMonthlyCap(): number {
    return readLimit('EMAIL_MONTHLY_CAP', 2000)
}

/** One key, two windows: the daily and the monthly site-wide counters. */
const SITE_KEY = 'email:site'

function siteRules(): LimitRule[] {
    return [
        { key: SITE_KEY, limit: emailDailyCap(), window: 'day' },
        { key: SITE_KEY, limit: emailMonthlyCap(), window: 'month' },
    ]
}

export type RefusedReservation = Extract<LimitResult, { allowed: false }> & {
    /** True when the site-wide cap, not a per-caller rule, refused it. */
    siteCap: boolean
}

/** Thrown by `sendEmail` when a limit refuses the send. */
export class EmailLimitError extends Error {
    constructor(readonly refusal: RefusedReservation) {
        super(
            refusal.siteCap
                ? 'The site has reached its email limit for now'
                : 'Email limit reached for this sender or recipient'
        )
        this.name = 'EmailLimitError'
    }
}

/**
 * Spend one email from the caller's rules and the site-wide caps. Refused
 * (nothing spent) when any is used up.
 */
export async function reserveEmail(
    kind: EmailKind,
    rules: LimitRule[] = [],
    now: Date = new Date()
): Promise<{ allowed: true } | RefusedReservation> {
    const result = await consumeLimits([...rules, ...siteRules()], now)
    await countEvent(`email:kind:${kind}:${result.allowed ? 'sent' : 'refused'}`, 'day', now).catch(
        () => undefined
    )
    if (result.allowed) return result
    const siteCap = result.rule.key === SITE_KEY
    if (siteCap) {
        // Shows in Workers logs; the owner's alert keys on this line.
        console.error(
            `[email-gate] Site-wide email cap reached (${result.rule.window === 'day' ? 'daily' : 'monthly'} limit ${result.rule.limit}); refused a ${kind} email`
        )
    }
    return { ...result, siteCap }
}

export interface EmailMessage {
    to: string
    subject: string
    html?: string
    react?: ReactElement
    /** Display name before the sender address. */
    fromName?: string
}

/** Whether email can be sent here (the Worker's binding); otherwise nothing is reserved or sent. */
export function emailConfigured(): boolean {
    return emailBinding() !== undefined
}

/** Sends one message that has already been reserved. Throws when Cloudflare refuses it. */
async function deliver(message: EmailMessage & { text?: string }): Promise<{ id: string | null }> {
    const binding = emailBinding()
    if (!binding) throw new Error('No email binding on this deployment')
    const html = message.react ? await render(message.react) : (message.html ?? '')
    const text = message.text ?? toPlainText(html)
    const result = await binding.send({
        to: message.to,
        from: { email: EMAIL_FROM, name: message.fromName ?? 'NetTrailers' },
        subject: message.subject,
        html,
        text,
    })
    return { id: result?.messageId ?? null }
}

/**
 * Delivers a sign-in link that auth.ts's signIn callback has already reserved
 * (lib/email/signInLimits.ts), so it spends nothing more here.
 */
export async function deliverSignInLink(to: string, url: string): Promise<void> {
    await deliver({ to, ...signInEmail(url) })
}

/**
 * Reserve and send one email. Returns null when no provider is configured
 * (local development); throws EmailLimitError when a limit refuses it.
 */
export async function sendEmail(
    kind: EmailKind,
    message: EmailMessage,
    rules: LimitRule[] = []
): Promise<{ id: string | null } | null> {
    if (!emailConfigured()) {
        console.warn(`[email-gate] No email provider configured; ${kind} email not sent`)
        return null
    }
    const reservation = await reserveEmail(kind, rules)
    if (!reservation.allowed) throw new EmailLimitError(reservation)
    return deliver(message)
}

export interface EmailUsage {
    today: number
    thisMonth: number
    dailyCap: number
    monthlyCap: number
    /** Today's sent and refused counts per kind. */
    byKind: Record<EmailKind, { sent: number; refused: number }>
}

/** Today's and this month's counts against the caps. */
export async function getEmailUsage(now: Date = new Date()): Promise<EmailUsage> {
    const [today, thisMonth, ...kinds] = await Promise.all([
        readCount(SITE_KEY, 'day', now),
        readCount(SITE_KEY, 'month', now),
        ...EMAIL_KINDS.flatMap((kind) => [
            readCount(`email:kind:${kind}:sent`, 'day', now),
            readCount(`email:kind:${kind}:refused`, 'day', now),
        ]),
    ])
    const byKind = Object.fromEntries(
        EMAIL_KINDS.map((kind, i) => [kind, { sent: kinds[2 * i], refused: kinds[2 * i + 1] }])
    ) as EmailUsage['byKind']
    return { today, thisMonth, dailyCap: emailDailyCap(), monthlyCap: emailMonthlyCap(), byKind }
}

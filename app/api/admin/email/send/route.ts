/**
 * POST /api/admin/email/send (admin only, fresh sign-in)
 *
 * `mode: 'send'` emails an announcement or a custom email to the selected
 * users who have email turned on (lib/admin/recipients.ts): the others,
 * including everyone who unsubscribed, are skipped and counted. `mode: 'test'`
 * sends the same email to the signed-in admin only.
 *
 * Every call writes an audit row (counts only) and a send-history row.
 */

import { eq, inArray } from 'drizzle-orm'
import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/db'
import { adminEmails, profiles, userPreferences, users } from '@/db/schema'
import { writeAdminAudit } from '@/lib/admin/audit'
import { badRequest, readJson, requireAdmin, serverError } from '@/lib/admin/guard'
import { canReceiveAdminEmail } from '@/lib/admin/recipients'
import { emailSendBody, type EmailSendBody } from '@/lib/admin/schemas'
import type { LimitRule } from '@/lib/durableLimit'
import { EmailService } from '@/lib/email/email-service'
import { sanitizeEmailHtml, validateEmailTemplate } from '@/lib/email/email-validation'
import { EmailLimitError } from '@/lib/email/gate'
import { batchEnsureUnsubscribeTokens } from '@/lib/email/unsubscribe-token'

type Recipient = { userId: string; email: string; displayName: string; token?: string }

async function sendOne(
    body: EmailSendBody,
    html: string | undefined,
    to: Recipient,
    limits: LimitRule[]
) {
    if (body.template === 'announcement') {
        await EmailService.sendAnnouncement(
            {
                to: to.email,
                userName: to.displayName,
                subject: body.subject,
                message: body.customMessage ?? '',
                unsubscribeToken: to.token,
            },
            limits
        )
    } else {
        await EmailService.sendCustomEmail(
            {
                to: to.email,
                userName: to.displayName,
                subject: body.subject,
                htmlContent: html ?? '',
                unsubscribeToken: to.token,
            },
            limits
        )
    }
}

export async function POST(request: NextRequest) {
    const guard = await requireAdmin({ fresh: true })
    if (!guard.ok) return guard.response
    const { actor } = guard

    const parsed = emailSendBody.safeParse(await readJson(request))
    if (!parsed.success) return badRequest()
    const body = parsed.data

    const validation = validateEmailTemplate(body)
    if (!validation.valid) return badRequest(validation.error)
    const html =
        body.template === 'custom' && body.customHtmlContent
            ? sanitizeEmailHtml(body.customHtmlContent)
            : undefined

    // This admin's hourly quota, plus each recipient's daily quota of admin
    // emails, on top of the site-wide caps (lib/email/gate.ts).
    const adminLimit: LimitRule = {
        key: `email:admin:${actor.userId}`,
        limit: 100,
        window: { ms: 60 * 60 * 1000 },
    }

    try {
        if (body.mode === 'test') {
            if (!actor.email) return badRequest('Your account has no email address')
            const [profile] = await db
                .select({ displayName: profiles.displayName })
                .from(profiles)
                .where(eq(profiles.userId, actor.userId))
                .limit(1)
            let sent = 0
            let error: string | undefined
            try {
                await sendOne(
                    body,
                    html,
                    {
                        userId: actor.userId,
                        email: actor.email,
                        displayName: profile?.displayName ?? 'there',
                    },
                    [adminLimit]
                )
                sent = 1
            } catch (err) {
                error = err instanceof EmailLimitError ? err.message : 'The test email failed'
            }
            await writeAdminAudit(actor, 'email.test', { template: body.template, sent })
            return NextResponse.json({ success: sent === 1, emailsSent: sent, error })
        }

        const requested = [...new Set(body.userIds)]
        const rows = await db
            .select({
                id: users.id,
                email: users.email,
                name: users.name,
                displayName: profiles.displayName,
                prefs: userPreferences.data,
            })
            .from(users)
            .leftJoin(profiles, eq(profiles.userId, users.id))
            .leftJoin(userPreferences, eq(userPreferences.userId, users.id))
            .where(inArray(users.id, requested))

        const notFound = requested.length - rows.length
        const eligible = rows.filter((row) => row.email && canReceiveAdminEmail(row.prefs))
        const skippedOptedOut = rows.length - eligible.length

        const tokens = await batchEnsureUnsubscribeTokens(eligible.map((row) => row.id))
        let emailsSent = 0
        let failed = 0
        let stoppedByLimit = false

        for (const row of eligible) {
            try {
                await sendOne(
                    body,
                    html,
                    {
                        userId: row.id,
                        email: row.email!,
                        displayName: row.displayName ?? row.name ?? 'there',
                        token: tokens.get(row.id),
                    },
                    [adminLimit, { key: `email:admin-to:${row.id}`, limit: 3, window: 'day' }]
                )
                emailsSent++
            } catch (err) {
                failed++
                // The site-wide cap or this admin's quota stops the whole batch.
                if (
                    err instanceof EmailLimitError &&
                    !err.refusal.rule.key.startsWith('email:admin-to:')
                ) {
                    stoppedByLimit = true
                    break
                }
            }
        }

        await db.insert(adminEmails).values({
            type: body.template,
            subject: body.subject,
            sentCount: emailsSent,
            failedCount: failed,
            targetFilter: `userIds:${requested.length}`,
            sentAt: Date.now(),
            sentBy: actor.userId,
        })
        await writeAdminAudit(actor, 'email.send', {
            template: body.template,
            requested: requested.length,
            sent: emailsSent,
            failed,
            skippedOptedOut,
            notFound,
        })

        return NextResponse.json({
            success: true,
            emailsSent,
            failed,
            skippedOptedOut,
            notFound,
            stoppedByLimit,
        })
    } catch (error) {
        console.error('[AdminEmailSend] Error:', error)
        return serverError('Failed to send emails')
    }
}

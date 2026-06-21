/**
 * POST /api/admin/email/send
 *
 * Send emails to selected users. ADMIN ONLY.
 *
 * User data is read from Drizzle `user` + `profiles` tables.
 * History is written to the `adminEmails` table (PII-minimised: counts only).
 * Unsubscribe tokens are stored in `userPreferences.data.unsubscribeToken`.
 * Auth via validateAdminRequest (session-based).
 */

import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/db'
import { adminEmails, profiles, users } from '@/db/schema'
import { EmailService } from '@/lib/email/email-service'
import { sanitizeEmailHtml, validateEmailTemplate } from '@/lib/email/email-validation'
import { checkAdminEmailRateLimit, checkRecipientEmailRateLimit } from '@/lib/email/rate-limiter'
import { batchEnsureUnsubscribeTokens } from '@/lib/email/unsubscribe-token'
import {
    createForbiddenResponse,
    createUnauthorizedResponse,
    validateAdminRequest,
} from '@/utils/adminMiddleware'

export async function POST(request: NextRequest) {
    try {
        const authResult = await validateAdminRequest(request)
        if (!authResult.authorized) {
            return authResult.error?.includes('not an administrator')
                ? createForbiddenResponse(authResult.error)
                : createUnauthorizedResponse(authResult.error)
        }

        const adminUserId = authResult.userId!

        const body = await request.json()
        const {
            template,
            userIds,
            subject,
            customMessage,
            customHtmlContent,
        }: {
            template: 'trending' | 'social' | 'announcement' | 'custom'
            userIds: string[]
            subject?: string
            customMessage?: string
            customHtmlContent?: string
        } = body

        const MAX_RECIPIENTS_PER_REQUEST = 100

        if (!template || !userIds || userIds.length === 0) {
            return NextResponse.json(
                { error: 'Missing required fields: template, userIds' },
                { status: 400 }
            )
        }

        if (userIds.length > MAX_RECIPIENTS_PER_REQUEST) {
            return NextResponse.json(
                {
                    error: `Too many recipients (max ${MAX_RECIPIENTS_PER_REQUEST} per request)`,
                    limit: MAX_RECIPIENTS_PER_REQUEST,
                    requested: userIds.length,
                },
                { status: 400 }
            )
        }

        const validation = validateEmailTemplate({
            template,
            subject,
            customMessage,
            customHtmlContent,
        })
        if (!validation.valid) {
            return NextResponse.json({ error: validation.error }, { status: 400 })
        }

        const rateCheck = checkAdminEmailRateLimit(adminUserId)
        if (!rateCheck.allowed) {
            const retryAfter = rateCheck.resetAt
                ? Math.ceil((rateCheck.resetAt - Date.now()) / 1000)
                : 3600
            return NextResponse.json(
                {
                    error: 'Rate limit exceeded',
                    message: `You can send up to ${rateCheck.limit} emails per hour.`,
                    limit: rateCheck.limit,
                    remaining: 0,
                    resetAt: rateCheck.resetAt,
                },
                {
                    status: 429,
                    headers: {
                        'Retry-After': retryAfter.toString(),
                        'X-RateLimit-Limit': rateCheck.limit.toString(),
                        'X-RateLimit-Remaining': '0',
                        'X-RateLimit-Reset': rateCheck.resetAt
                            ? (rateCheck.resetAt / 1000).toString()
                            : '',
                    },
                }
            )
        }

        const sanitizedHtmlContent =
            template === 'custom' && customHtmlContent
                ? sanitizeEmailHtml(customHtmlContent)
                : customHtmlContent

        console.log(`[AdminEmailSend] Sending ${template} to ${userIds.length} users`)

        const errors: string[] = []
        let emailsSent = 0

        // Fetch user + profile data from Drizzle.
        const userRows = await db
            .select({ id: users.id, email: users.email, name: users.name })
            .from(users)

        const profileRows = await db
            .select({ userId: profiles.userId, displayName: profiles.displayName })
            .from(profiles)

        const userMap = new Map(userRows.map((u) => [u.id, u]))
        const profileMap = new Map(profileRows.map((p) => [p.userId, p]))

        const resolvedUsers = userIds
            .map((uid) => {
                const u = userMap.get(uid)
                const p = profileMap.get(uid)
                if (!u) {
                    errors.push(`User not found: ${uid}`)
                    return null
                }
                return {
                    userId: uid,
                    email: u.email,
                    displayName: p?.displayName ?? u.name ?? 'there',
                }
            })
            .filter((u): u is NonNullable<typeof u> => u !== null)

        // Batch-generate unsubscribe tokens (CAN-SPAM compliance).
        const unsubscribeTokens = await batchEnsureUnsubscribeTokens(
            resolvedUsers.map((u) => u.userId)
        )

        switch (template) {
            case 'trending':
            case 'social':
                return NextResponse.json(
                    {
                        error: 'Not Implemented',
                        message: `The ${template} email template is not yet implemented. Use 'announcement' or 'custom'.`,
                    },
                    { status: 501 }
                )

            case 'announcement':
                for (const user of resolvedUsers) {
                    if (!user.email) {
                        errors.push(`Missing email for user: ${user.userId}`)
                        continue
                    }
                    const rc = checkRecipientEmailRateLimit(user.userId)
                    if (!rc.allowed) {
                        errors.push(`User ${user.email} daily limit exceeded`)
                        continue
                    }
                    try {
                        await EmailService.sendAnnouncement({
                            to: user.email,
                            userName: user.displayName,
                            subject: subject!,
                            message: customMessage!,
                            unsubscribeToken: unsubscribeTokens.get(user.userId),
                        })
                        emailsSent++
                    } catch (err) {
                        errors.push(
                            `Failed to send to ${user.email}: ${err instanceof Error ? err.message : 'Unknown error'}`
                        )
                    }
                }
                break

            case 'custom':
                for (const user of resolvedUsers) {
                    if (!user.email) {
                        errors.push(`Missing email for user: ${user.userId}`)
                        continue
                    }
                    const rc = checkRecipientEmailRateLimit(user.userId)
                    if (!rc.allowed) {
                        errors.push(`User ${user.email} daily limit exceeded`)
                        continue
                    }
                    try {
                        await EmailService.sendCustomEmail({
                            to: user.email,
                            userName: user.displayName,
                            subject: subject!,
                            htmlContent: sanitizedHtmlContent!,
                            unsubscribeToken: unsubscribeTokens.get(user.userId),
                        })
                        emailsSent++
                    } catch (err) {
                        errors.push(
                            `Failed to send to ${user.email}: ${err instanceof Error ? err.message : 'Unknown error'}`
                        )
                    }
                }
                break

            default:
                return NextResponse.json({ error: 'Invalid template type' }, { status: 400 })
        }

        console.log(`[AdminEmailSend] ${emailsSent} sent, ${errors.length} errors`)

        // Write PII-minimised history record.
        try {
            await db.insert(adminEmails).values({
                type: template,
                subject: subject ?? template,
                sentCount: emailsSent,
                failedCount: errors.length,
                targetFilter: `userIds:${userIds.length}`,
                sentAt: Date.now(),
                sentBy: adminUserId,
            })
        } catch (historyError) {
            console.error('[AdminEmailSend] History write failed:', historyError)
        }

        return NextResponse.json({
            success: true,
            emailsSent,
            totalUsers: userIds.length,
            errors: errors.length > 0 ? errors : undefined,
        })
    } catch (error) {
        console.error('[AdminEmailSend] Error:', error)
        return NextResponse.json(
            {
                error: 'Failed to send emails',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        )
    }
}

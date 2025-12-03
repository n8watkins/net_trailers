import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '../../../../../lib/auth-middleware'
import { getAdminDb } from '../../../../../lib/firebase-admin'
import { EmailService } from '../../../../../lib/email/email-service'
import {
    validateEmailTemplate,
    CUSTOM_HTML_SANITIZATION_CONFIG,
} from '../../../../../lib/email/email-validation'
import {
    checkAdminEmailRateLimit,
    checkRecipientEmailRateLimit,
} from '../../../../../lib/email/rate-limiter'
import { batchEnsureUnsubscribeTokens } from '../../../../../lib/email/unsubscribe-token'
import DOMPurify from 'isomorphic-dompurify'

/**
 * POST /api/admin/email/send
 *
 * Send emails to selected users with chosen template (ADMIN ONLY)
 * Requires authentication
 */
async function handleSendEmail(request: NextRequest, userId: string): Promise<NextResponse> {
    try {
        // ADMIN ONLY: Check if user is admin
        const ADMIN_UID = process.env.ADMIN_UID
        if (!ADMIN_UID || userId !== ADMIN_UID) {
            console.error('[AdminEmailSend] User is not admin:', userId)
            return NextResponse.json(
                { error: 'Forbidden - Admin access required' },
                { status: 403 }
            )
        }

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

        // Prevent overwhelming Resend API and excessive costs
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

        // Validate template-specific requirements
        const validation = validateEmailTemplate({
            template,
            subject,
            customMessage,
            customHtmlContent,
        })
        if (!validation.valid) {
            return NextResponse.json({ error: validation.error }, { status: 400 })
        }

        // Check admin rate limit (100 emails/hour)
        const rateCheck = checkAdminEmailRateLimit(userId)
        if (!rateCheck.allowed) {
            const retryAfter = rateCheck.resetAt
                ? Math.ceil((rateCheck.resetAt - Date.now()) / 1000)
                : 3600

            return NextResponse.json(
                {
                    error: 'Rate limit exceeded',
                    message: `You can send up to ${rateCheck.limit} emails per hour. Please try again later.`,
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

        // Sanitize custom HTML content to prevent XSS attacks
        const sanitizedHtmlContent =
            template === 'custom' && customHtmlContent
                ? DOMPurify.sanitize(customHtmlContent, CUSTOM_HTML_SANITIZATION_CONFIG)
                : customHtmlContent

        console.log(`📧 [AdminEmailSend] Sending ${template} emails to ${userIds.length} user(s)`)

        let emailsSent = 0
        const errors: string[] = []

        const db = getAdminDb()

        // Fetch user data from Firestore
        const userPromises = userIds.map(async (uid) => {
            try {
                const userDoc = await db.collection('users').doc(uid).get()
                if (!userDoc.exists) {
                    console.warn(`[AdminEmailSend] User not found: ${uid}`)
                    errors.push(`User not found: ${uid}`)
                    return null
                }

                const userData = userDoc.data()
                return {
                    userId: uid,
                    email: userData?.email,
                    displayName: userData?.displayName,
                    emailNotifications: userData?.emailNotifications,
                }
            } catch (error) {
                console.error(`[AdminEmailSend] Error fetching user ${uid}:`, error)
                errors.push(
                    `Error fetching user ${uid}: ${error instanceof Error ? error.message : 'Unknown error'}`
                )
                return null
            }
        })

        const users = (await Promise.all(userPromises)).filter((u) => u !== null)

        // Generate unsubscribe tokens for all recipients (CAN-SPAM compliance)
        const unsubscribeTokens = await batchEnsureUnsubscribeTokens(users.map((u) => u.userId))

        // Send emails based on template
        switch (template) {
            case 'trending':
            case 'social': {
                // These templates require data integration not yet implemented
                // Returning 501 to prevent sending broken emails with empty data
                return NextResponse.json(
                    {
                        error: 'Not Implemented',
                        message: `The ${template} email template is not yet fully implemented. Please use 'announcement' or 'custom' templates.`,
                    },
                    { status: 501 }
                )
            }

            case 'announcement': {
                // Send announcement emails
                for (const user of users) {
                    try {
                        if (!user.email) {
                            errors.push(`Missing email for user: ${user.userId}`)
                            continue
                        }

                        // Check recipient rate limit (max 3 admin emails/day)
                        const recipientCheck = checkRecipientEmailRateLimit(user.userId)
                        if (!recipientCheck.allowed) {
                            console.log(
                                `[AdminEmailSend] User ${user.userId} has exceeded daily admin email limit, skipping`
                            )
                            errors.push(
                                `User ${user.email} has received too many admin emails today (limit: ${recipientCheck.limit}/day)`
                            )
                            continue
                        }

                        await EmailService.sendAnnouncement({
                            to: user.email,
                            userName: user.displayName || 'there',
                            subject: subject!,
                            message: customMessage!,
                            unsubscribeToken: unsubscribeTokens.get(user.userId),
                        })

                        emailsSent++
                        console.log(`[AdminEmailSend] Sent announcement to ${user.email}`)
                    } catch (error) {
                        console.error(
                            `[AdminEmailSend] Failed to send announcement to ${user.email}:`,
                            error
                        )
                        errors.push(
                            `Failed to send to ${user.email}: ${error instanceof Error ? error.message : 'Unknown error'}`
                        )
                    }
                }
                break
            }

            case 'custom': {
                // Send custom emails with sanitized HTML
                for (const user of users) {
                    try {
                        if (!user.email) {
                            errors.push(`Missing email for user: ${user.userId}`)
                            continue
                        }

                        // Check recipient rate limit (max 3 admin emails/day)
                        const recipientCheck = checkRecipientEmailRateLimit(user.userId)
                        if (!recipientCheck.allowed) {
                            console.log(
                                `[AdminEmailSend] User ${user.userId} has exceeded daily admin email limit, skipping`
                            )
                            errors.push(
                                `User ${user.email} has received too many admin emails today (limit: ${recipientCheck.limit}/day)`
                            )
                            continue
                        }

                        await EmailService.sendCustomEmail({
                            to: user.email,
                            userName: user.displayName || 'there',
                            subject: subject!,
                            htmlContent: sanitizedHtmlContent!,
                            unsubscribeToken: unsubscribeTokens.get(user.userId),
                        })

                        emailsSent++
                        console.log(`[AdminEmailSend] Sent custom email to ${user.email}`)
                    } catch (error) {
                        console.error(
                            `[AdminEmailSend] Failed to send custom email to ${user.email}:`,
                            error
                        )
                        errors.push(
                            `Failed to send to ${user.email}: ${error instanceof Error ? error.message : 'Unknown error'}`
                        )
                    }
                }
                break
            }

            default:
                return NextResponse.json({ error: 'Invalid template type' }, { status: 400 })
        }

        console.log(`📧 [AdminEmailSend] Completed: ${emailsSent} sent, ${errors.length} errors`)

        // Create email history record (minimal data for GDPR compliance)
        try {
            const historyRecord = {
                template,
                subject: subject || `${template} email`,
                recipientCount: userIds.length,
                successCount: emailsSent,
                failureCount: errors.length,
                // Store only first 10 errors to prevent large documents
                errors: errors.length > 0 ? errors.slice(0, 10) : [],
                sentBy: userId,
                sentAt: Date.now(),
                metadata: {
                    customMessage: customMessage || null,
                    // Don't store HTML content in history (too large, unnecessary)
                    customHtmlContent: null,
                },
            }
            // Note: Deliberately not storing recipient emails to minimize PII exposure
            // Recipient count provides sufficient audit trail

            await db.collection('admin_emails').add(historyRecord)
            console.log(`📧 [AdminEmailSend] History record created`)
        } catch (historyError) {
            console.error('[AdminEmailSend] Failed to create history record:', historyError)
            // Don't fail the request if history fails
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

export const POST = withAuth(handleSendEmail)

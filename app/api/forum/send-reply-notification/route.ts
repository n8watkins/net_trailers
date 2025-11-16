/**
 * API Route: Send Reply Notification Email
 *
 * Sends email notifications when someone replies to a thread or comment
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuth } from '@/lib/firebase-admin'
import { Resend } from 'resend'

interface NotificationRequest {
    recipientUserId: string // Firebase UID to get email from
    replierUserId: string // To prevent self-notification
    replierName: string
    threadTitle: string
    threadId: string
    replyContent: string
    isReplyToReply: boolean // true if replying to a comment, false if replying to thread
}

export async function POST(request: NextRequest) {
    try {
        // Only allow requests from same origin
        const origin = request.headers.get('origin')
        if (origin && !origin.includes(request.headers.get('host') || '')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body: NotificationRequest = await request.json()
        const {
            recipientUserId,
            replierUserId,
            replierName,
            threadTitle,
            threadId,
            replyContent,
            isReplyToReply,
        } = body

        // Validate required fields
        if (
            !recipientUserId ||
            !replierUserId ||
            !replierName ||
            !threadTitle ||
            !threadId ||
            !replyContent
        ) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        // Don't send notification if replying to yourself
        if (recipientUserId === replierUserId) {
            return NextResponse.json({ success: true, skipped: true, reason: 'self-reply' })
        }

        // Skip if Resend API key is not configured
        const resendApiKey = process.env.RESEND_API_KEY
        if (!resendApiKey || resendApiKey === 'your_resend_api_key_here') {
            console.log('Resend API key not configured, skipping email notification')
            return NextResponse.json({ success: true, skipped: true, reason: 'no-api-key' })
        }
        const resend = new Resend(resendApiKey)

        // Get recipient's email and name from Firebase Auth
        const auth = getAdminAuth()
        let recipientEmail: string
        let recipientName: string

        try {
            const userRecord = await auth.getUser(recipientUserId)
            recipientEmail = userRecord.email || ''
            recipientName = userRecord.displayName || 'User'

            if (!recipientEmail) {
                console.log('Recipient has no email, skipping notification')
                return NextResponse.json({ success: true, skipped: true, reason: 'no-email' })
            }
        } catch (error) {
            console.error('Failed to get user email:', error)
            return NextResponse.json({ error: 'Failed to get recipient email' }, { status: 500 })
        }

        // Truncate reply content for email preview
        const truncatedContent =
            replyContent.length > 200 ? replyContent.substring(0, 200) + '...' : replyContent

        // Build thread URL
        const baseUrl =
            process.env.NEXT_PUBLIC_SITE_URL ||
            request.headers.get('origin') ||
            'http://localhost:3000'
        const threadUrl = `${baseUrl}/community/thread/${threadId}`

        // Email subject
        const subject = isReplyToReply
            ? `${replierName} replied to your comment on "${threadTitle}"`
            : `${replierName} replied to your thread "${threadTitle}"`

        // Send email
        const { data, error } = await resend.emails.send({
            from: 'NetTrailers Community <noreply@resend.dev>', // Use your verified domain
            to: [recipientEmail],
            subject,
            html: generateEmailHTML({
                recipientName,
                replierName,
                threadTitle,
                replyContent: truncatedContent,
                threadUrl,
                isReplyToReply,
            }),
        })

        if (error) {
            console.error('Failed to send email:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true, data })
    } catch (error) {
        console.error('Error sending reply notification:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        )
    }
}

interface EmailData {
    recipientName: string
    replierName: string
    threadTitle: string
    replyContent: string
    threadUrl: string
    isReplyToReply: boolean
}

function generateEmailHTML({
    recipientName,
    replierName,
    threadTitle,
    replyContent,
    threadUrl,
    isReplyToReply,
}: EmailData) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Reply Notification</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0f0f0f; color: #e5e5e5;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0f0f0f;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #1a1a1a; border-radius: 12px; overflow: hidden; border: 1px solid #2a2a2a;">
                    <!-- Header -->
                    <tr>
                        <td style="padding: 32px 40px; background: linear-gradient(135deg, #1e40af 0%, #7c3aed 100%);">
                            <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #ffffff;">
                                💬 New Reply on NetTrailers
                            </h1>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 32px 40px;">
                            <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 24px; color: #d1d5db;">
                                Hi <strong style="color: #ffffff;">${recipientName}</strong>,
                            </p>

                            <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 24px; color: #d1d5db;">
                                <strong style="color: #60a5fa;">${replierName}</strong> replied to your ${isReplyToReply ? 'comment' : 'thread'}:
                            </p>

                            <!-- Thread Title -->
                            <div style="margin: 0 0 24px 0; padding: 16px; background-color: #2a2a2a; border-left: 4px solid #60a5fa; border-radius: 6px;">
                                <p style="margin: 0; font-size: 14px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">
                                    ${isReplyToReply ? 'Thread' : 'Your Thread'}
                                </p>
                                <h2 style="margin: 8px 0 0 0; font-size: 18px; font-weight: 600; color: #ffffff;">
                                    ${threadTitle}
                                </h2>
                            </div>

                            <!-- Reply Content -->
                            <div style="margin: 0 0 32px 0; padding: 20px; background-color: #0f0f0f; border: 1px solid #2a2a2a; border-radius: 8px;">
                                <p style="margin: 0; font-size: 15px; line-height: 24px; color: #d1d5db; white-space: pre-wrap;">
${replyContent}
                                </p>
                            </div>

                            <!-- CTA Button -->
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center">
                                        <a href="${threadUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%); color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; border-radius: 8px; box-shadow: 0 4px 6px rgba(37, 99, 235, 0.3);">
                                            View Reply →
                                        </a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="padding: 24px 40px; background-color: #0f0f0f; border-top: 1px solid #2a2a2a;">
                            <p style="margin: 0 0 12px 0; font-size: 14px; line-height: 20px; color: #6b7280;">
                                You're receiving this email because you have notifications enabled for NetTrailers community discussions.
                            </p>
                            <p style="margin: 0; font-size: 12px; line-height: 18px; color: #4b5563;">
                                © ${new Date().getFullYear()} NetTrailers. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `.trim()
}

/**
 * The email that tells someone their forum thread or reply got a reply.
 *
 * Built entirely on the server from the stored reply: the sender is the
 * reply's author (the signed-in user who just posted it), the recipient is
 * the author of the thread or of the reply being answered, and the text,
 * names and thread title are read from the database, escaped. Nothing comes
 * from the request, so it cannot be used to send arbitrary text to arbitrary
 * users. It goes through the email gate with per-sender and per-recipient
 * daily limits, and only to recipients who turned email notifications on.
 */

import { eq } from 'drizzle-orm'

import { db } from '@/db'
import { users } from '@/db/schema'
import { getAuthorIdentity } from '@/db/queries/profiles'
import { getReplyById, getThreadById } from '@/db/queries/threads'
import { loadUserPreferences } from '@/db/queries/userPreferences'
import { readLimit, type LimitRule } from '@/lib/durableLimit'
import { EmailLimitError, emailConfigured, sendEmail } from './gate'
import { generateUnsubscribeToken } from './unsubscribe-token'

export type ReplyNotificationResult =
    | { sent: true }
    | {
          sent: false
          reason:
              | 'no-reply'
              | 'not-author'
              | 'no-thread'
              | 'self'
              | 'no-recipient'
              | 'opted-out'
              | 'not-configured'
              | 'limited'
      }

export function replyNotificationRules(senderId: string, recipientId: string): LimitRule[] {
    return [
        {
            key: `email:forum-from:${senderId}`,
            limit: readLimit('EMAIL_FORUM_PER_SENDER_DAILY', 10),
            window: 'day',
        },
        {
            key: `email:forum-to:${recipientId}`,
            limit: readLimit('EMAIL_FORUM_PER_RECIPIENT_DAILY', 5),
            window: 'day',
        },
    ]
}

export function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
}

/**
 * Email the person a stored reply answers. `senderId` must be the reply's
 * author; `origin` is the site's own origin for links.
 */
export async function notifyReply(
    replyId: string,
    senderId: string,
    origin: string
): Promise<ReplyNotificationResult> {
    const reply = await getReplyById(replyId)
    if (!reply) return { sent: false, reason: 'no-reply' }
    if (reply.userId !== senderId) return { sent: false, reason: 'not-author' }

    const thread = await getThreadById(reply.threadId)
    if (!thread) return { sent: false, reason: 'no-thread' }

    let recipientId = thread.userId
    let isReplyToReply = false
    if (reply.parentReplyId) {
        const parent = await getReplyById(reply.parentReplyId)
        if (parent && parent.threadId === thread.id) {
            recipientId = parent.userId
            isReplyToReply = true
        }
    }
    if (recipientId === senderId) return { sent: false, reason: 'self' }

    const [recipient] = await db
        .select({ email: users.email, name: users.name })
        .from(users)
        .where(eq(users.id, recipientId))
        .limit(1)
    if (!recipient?.email) return { sent: false, reason: 'no-recipient' }

    // Email notifications are opt-in, as for the digests.
    const prefs = await loadUserPreferences(recipientId)
    if (prefs?.notifications?.email !== true) return { sent: false, reason: 'opted-out' }
    if (!emailConfigured()) return { sent: false, reason: 'not-configured' }

    const [sender, recipientIdentity] = await Promise.all([
        getAuthorIdentity(senderId),
        getAuthorIdentity(recipientId),
    ])

    let unsubscribeUrl: string | null = null
    try {
        const token = await generateUnsubscribeToken(recipientId)
        unsubscribeUrl = `${origin}/unsubscribe?token=${encodeURIComponent(token)}`
    } catch (error) {
        console.warn('[forum-reply] Could not create an unsubscribe token:', error)
    }

    const preview = reply.content.length > 200 ? `${reply.content.slice(0, 200)}...` : reply.content
    const threadUrl = `${origin}/community/thread/${encodeURIComponent(thread.id)}`
    // Header-safe: no line breaks in the subject.
    const oneLine = (value: string, max: number) => value.replace(/\s+/g, ' ').trim().slice(0, max)
    const subject = isReplyToReply
        ? `${oneLine(sender.name, 60)} replied to your comment on "${oneLine(thread.title, 100)}"`
        : `${oneLine(sender.name, 60)} replied to your thread "${oneLine(thread.title, 100)}"`

    try {
        await sendEmail(
            'forum-reply',
            {
                to: recipient.email,
                subject,
                fromName: 'NetTrailers Community',
                html: replyEmailHtml({
                    recipientName: recipientIdentity.name,
                    replierName: sender.name,
                    threadTitle: thread.title,
                    replyContent: preview,
                    threadUrl,
                    unsubscribeUrl,
                    isReplyToReply,
                }),
            },
            replyNotificationRules(senderId, recipientId)
        )
        return { sent: true }
    } catch (error) {
        if (error instanceof EmailLimitError) return { sent: false, reason: 'limited' }
        throw error
    }
}

interface ReplyEmailData {
    recipientName: string
    replierName: string
    threadTitle: string
    replyContent: string
    threadUrl: string
    unsubscribeUrl: string | null
    isReplyToReply: boolean
}

/** Every value is escaped: names, titles and replies are user-written. */
export function replyEmailHtml(data: ReplyEmailData): string {
    const recipientName = escapeHtml(data.recipientName)
    const replierName = escapeHtml(data.replierName)
    const threadTitle = escapeHtml(data.threadTitle)
    const replyContent = escapeHtml(data.replyContent)
    const threadUrl = escapeHtml(data.threadUrl)
    const what = data.isReplyToReply ? 'comment' : 'thread'
    const unsubscribe = data.unsubscribeUrl
        ? `<p style="margin: 0 0 12px 0; font-size: 12px; color: #6b7280;"><a href="${escapeHtml(data.unsubscribeUrl)}" style="color: #9ca3af;">Unsubscribe from NetTrailers emails</a></p>`
        : ''
    return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>New reply on NetTrailers</title></head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background-color: #0f0f0f; color: #e5e5e5;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0f0f0f;"><tr><td align="center" style="padding: 40px 20px;">
<table width="600" cellpadding="0" cellspacing="0" style="background-color: #1a1a1a; border-radius: 12px; border: 1px solid #2a2a2a;">
<tr><td style="padding: 32px 40px; background: #1e40af;"><h1 style="margin: 0; font-size: 24px; color: #ffffff;">New reply on NetTrailers</h1></td></tr>
<tr><td style="padding: 32px 40px;">
<p style="margin: 0 0 24px 0; font-size: 16px; color: #d1d5db;">Hi <strong style="color: #ffffff;">${recipientName}</strong>,</p>
<p style="margin: 0 0 24px 0; font-size: 16px; color: #d1d5db;"><strong style="color: #60a5fa;">${replierName}</strong> replied to your ${what}:</p>
<div style="margin: 0 0 24px 0; padding: 16px; background-color: #2a2a2a; border-left: 4px solid #60a5fa; border-radius: 6px;"><h2 style="margin: 0; font-size: 18px; color: #ffffff;">${threadTitle}</h2></div>
<div style="margin: 0 0 32px 0; padding: 20px; background-color: #0f0f0f; border: 1px solid #2a2a2a; border-radius: 8px;"><p style="margin: 0; font-size: 15px; line-height: 24px; color: #d1d5db; white-space: pre-wrap;">${replyContent}</p></div>
<p style="text-align: center; margin: 0;"><a href="${threadUrl}" style="display: inline-block; padding: 14px 32px; background: #2563eb; color: #ffffff; text-decoration: none; font-weight: 600; border-radius: 8px;">View reply</a></p>
</td></tr>
<tr><td style="padding: 24px 40px; background-color: #0f0f0f; border-top: 1px solid #2a2a2a;">
<p style="margin: 0 0 12px 0; font-size: 14px; color: #6b7280;">You get this email because email notifications are on in your NetTrailers settings.</p>
${unsubscribe}
</td></tr>
</table></td></tr></table>
</body>
</html>`
}

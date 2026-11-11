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
import { replyEmail } from './templates'
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

    let unsubscribeToken: string | null = null
    try {
        unsubscribeToken = await generateUnsubscribeToken(recipientId)
    } catch (error) {
        console.warn('[forum-reply] Could not create an unsubscribe token:', error)
    }

    const preview = reply.content.length > 200 ? `${reply.content.slice(0, 200)}...` : reply.content
    const threadUrl = `${origin}/community/thread/${encodeURIComponent(thread.id)}`

    try {
        const email = await replyEmail({
            recipientName: recipientIdentity.name,
            replierName: sender.name,
            threadTitle: thread.title,
            replyContent: preview,
            threadUrl,
            unsubscribeToken,
            isReplyToReply,
        })
        await sendEmail(
            'forum-reply',
            { to: recipient.email, ...email },
            replyNotificationRules(senderId, recipientId)
        )
        return { sent: true }
    } catch (error) {
        if (error instanceof EmailLimitError) return { sent: false, reason: 'limited' }
        throw error
    }
}

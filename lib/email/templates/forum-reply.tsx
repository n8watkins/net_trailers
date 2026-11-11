/** The email that tells someone their thread or comment got a reply. */

import * as React from 'react'

import { SANS, unsubscribeUrl as unsubscribeLink } from '../brand'
import {
    Button,
    EmailLayout,
    Heading,
    Panel,
    Paragraph,
    Quote,
    TextLink,
    emailText,
    renderEmail,
} from '../layout'
import { oneLine } from '../subjects'

export interface ReplyEmailData {
    recipientName: string
    replierName: string
    threadTitle: string
    replyContent: string
    threadUrl: string
    unsubscribeToken: string | null
    isReplyToReply: boolean
}

const REASON =
    "You're getting this because email notifications are on for your NetTrailers account."

export function replySubject(
    data: Pick<ReplyEmailData, 'replierName' | 'threadTitle' | 'isReplyToReply'>
) {
    const who = oneLine(data.replierName, 60)
    const title = oneLine(data.threadTitle, 100)
    return data.isReplyToReply
        ? `${who} replied to your comment on "${title}"`
        : `${who} replied to your thread "${title}"`
}

/** Every value is rendered as text (React escapes it): names, titles and replies are user-written. */
export async function replyEmail(data: ReplyEmailData) {
    const subject = replySubject(data)
    const unsubscribeUrl = data.unsubscribeToken ? unsubscribeLink(data.unsubscribeToken) : null
    const what = data.isReplyToReply ? 'comment' : 'thread'
    const element = (
        <EmailLayout
            title={subject}
            preheader={oneLine(data.replyContent, 110)}
            reason={REASON}
            unsubscribeUrl={unsubscribeUrl}
        >
            <Heading>
                {data.replierName} replied to your {what}
            </Heading>
            <Paragraph>
                Hi {data.recipientName}, there is a new reply in{' '}
                <TextLink href={data.threadUrl}>{data.threadTitle}</TextLink>.
            </Paragraph>
            <Panel>
                <p
                    className="nt-ink"
                    style={{ margin: '0 0 4px', font: `700 14px/20px ${SANS}`, color: '#ffffff' }}
                >
                    {data.replierName}
                </p>
                <Quote>{data.replyContent}</Quote>
            </Panel>
            <Button href={data.threadUrl}>Read the reply</Button>
        </EmailLayout>
    )
    const text = emailText({
        lines: [
            `${data.replierName} replied to your ${what} "${data.threadTitle}":`,
            '',
            `"${data.replyContent}"`,
            '',
            `Read the reply: ${data.threadUrl}`,
        ],
        reason: REASON,
        unsubscribeUrl,
    })
    return { subject, unsubscribeUrl, ...(await renderEmail(element, text)) }
}

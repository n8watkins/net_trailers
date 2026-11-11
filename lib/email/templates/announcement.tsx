/** An admin announcement: plain text from the admin, in the shared layout. */

import * as React from 'react'

import { unsubscribeUrl as unsubscribeLink } from '../brand'
import { EmailLayout, Heading, Paragraph, emailText, renderEmail } from '../layout'
import { oneLine } from '../subjects'

export interface AnnouncementProps {
    userName: string
    subject: string
    message: string
    unsubscribeToken?: string
}

const REASON =
    "You're getting this because email notifications are on for your NetTrailers account."

export async function announcementEmail({
    userName,
    subject,
    message,
    unsubscribeToken,
}: AnnouncementProps) {
    const unsubscribeUrl = unsubscribeToken ? unsubscribeLink(unsubscribeToken) : null
    const paragraphs = message
        .split(/\n+/)
        .map((l) => l.trim())
        .filter(Boolean)
    const element = (
        <EmailLayout
            title={subject}
            preheader={oneLine(paragraphs[0] ?? subject, 110)}
            reason={REASON}
            unsubscribeUrl={unsubscribeUrl}
        >
            <Heading>{subject}</Heading>
            <Paragraph>Hi {userName},</Paragraph>
            {paragraphs.map((line, i) => (
                <Paragraph key={i}>{line}</Paragraph>
            ))}
            <Paragraph style={{ margin: 0 }}>The NetTrailers team</Paragraph>
        </EmailLayout>
    )
    const text = emailText({
        lines: [
            subject,
            '',
            `Hi ${userName},`,
            '',
            ...paragraphs.flatMap((l) => [l, '']),
            'The NetTrailers team',
        ],
        reason: REASON,
        unsubscribeUrl,
    })
    return { subject, unsubscribeUrl, ...(await renderEmail(element, text)) }
}

/** An admin-written email: sanitised HTML (email-validation.ts) inside the shared layout. */

import * as React from 'react'
import { toPlainText } from '@react-email/render'

import { unsubscribeUrl as unsubscribeLink } from '../brand'
import { EmailLayout, Heading, emailText, renderEmail } from '../layout'
import { oneLine } from '../subjects'

export interface CustomProps {
    userName: string
    subject: string
    /** Already sanitised by sanitizeEmailHtml. */
    htmlContent: string
    unsubscribeToken?: string
}

const REASON =
    "You're getting this because email notifications are on for your NetTrailers account."

export async function customEmail({ subject, htmlContent, unsubscribeToken }: CustomProps) {
    const unsubscribeUrl = unsubscribeToken ? unsubscribeLink(unsubscribeToken) : null
    const body = toPlainText(htmlContent)
    const element = (
        <EmailLayout
            title={subject}
            preheader={oneLine(body, 110)}
            reason={REASON}
            unsubscribeUrl={unsubscribeUrl}
        >
            <Heading>{subject}</Heading>
            <div className="nt-content" dangerouslySetInnerHTML={{ __html: htmlContent }} />
        </EmailLayout>
    )
    const text = emailText({ lines: [subject, '', body], reason: REASON, unsubscribeUrl })
    return { subject, unsubscribeUrl, ...(await renderEmail(element, text)) }
}

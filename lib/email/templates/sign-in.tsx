/** The sign-in link email. Transactional: no unsubscribe or preferences links. */

import * as React from 'react'

import { EmailLayout, Button, Heading, Paragraph, Small, emailText, renderEmail } from '../layout'
import { TextLink } from '../layout'

const REASON =
    "You got this because someone asked to sign in to NetTrailers with this address. If it wasn't you, ignore it: nobody can sign in without the link."

export const SIGN_IN_SUBJECT = 'Your NetTrailers sign-in link'

export async function signInEmail(url: string) {
    const element = (
        <EmailLayout
            title="Sign in to NetTrailers"
            preheader="The link works once and expires in 24 hours."
            reason={REASON}
            unsubscribeUrl={null}
        >
            <Heading>Sign in to NetTrailers</Heading>
            <Paragraph>
                Use the button below to sign in. The link works once and expires in 24 hours.
            </Paragraph>
            <Button href={url}>Sign in</Button>
            <div style={{ height: '16px' }} />
            <Small>
                Open it in the browser where you want to be signed in (Safari or Chrome), not in
                your email app&apos;s preview.
            </Small>
            <Small style={{ margin: 0 }}>
                Button not working? Copy this link into your browser:
                <br />
                <TextLink href={url} style={{ fontWeight: 400, wordBreak: 'break-all' }}>
                    {url}
                </TextLink>
            </Small>
        </EmailLayout>
    )
    const text = emailText({
        lines: [
            'Sign in to NetTrailers',
            '',
            'Use this link to sign in. It works once and expires in 24 hours:',
            url,
            '',
            'Open it in the browser where you want to be signed in.',
        ],
        reason: REASON,
        unsubscribeUrl: null,
    })
    return { subject: SIGN_IN_SUBJECT, ...(await renderEmail(element, text)) }
}

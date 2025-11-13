import * as React from 'react'
import { BaseEmail } from './base-email'

interface EmailVerificationEmailProps {
    userName?: string
    verificationUrl: string
    email: string
}

/**
 * Email verification template
 * Sent when user signs up or changes their email
 */
export const EmailVerificationEmail = ({
    userName,
    verificationUrl,
    email,
}: EmailVerificationEmailProps) => {
    return (
        <BaseEmail
            userName={userName}
            title="Verify Your Email Address"
            subtitle="Account Setup"
            ctaButton={{
                text: 'Verify Email Address',
                url: verificationUrl,
            }}
        >
            <p style={{ marginBottom: '20px' }}>
                Thanks for joining Net Trailers! To get started, please verify your email address by
                clicking the button below.
            </p>

            <div className="box">
                <p style={{ margin: 0, fontSize: '14px', color: '#b3b3b3' }}>
                    <strong style={{ color: '#ffffff' }}>Email to verify:</strong>
                    <br />
                    <span style={{ color: '#e50914', fontSize: '16px', fontWeight: '600' }}>
                        {email}
                    </span>
                </p>
            </div>

            <p style={{ marginTop: '30px', fontSize: '14px', color: '#b3b3b3' }}>
                Verifying your email allows you to:
            </p>
            <ul
                style={{
                    fontSize: '14px',
                    color: '#e5e5e5',
                    paddingLeft: '20px',
                    lineHeight: '1.8',
                }}
            >
                <li>Recover your account if you forget your password</li>
                <li>Receive important notifications about your watchlist</li>
                <li>Get updates when new content is added to your collections</li>
                <li>Participate in community rankings and discussions</li>
            </ul>

            <p style={{ marginTop: '30px', fontSize: '14px', color: '#b3b3b3' }}>
                If the button above doesn't work, copy and paste this link into your browser:
            </p>
            <p
                style={{
                    fontSize: '13px',
                    color: '#808080',
                    wordBreak: 'break-all',
                    backgroundColor: '#141414',
                    padding: '12px',
                    borderRadius: '4px',
                    border: '1px solid #313131',
                }}
            >
                {verificationUrl}
            </p>

            <div className="divider" style={{ margin: '30px 0' }}></div>

            <p style={{ fontSize: '14px', color: '#b3b3b3', marginBottom: '10px' }}>
                <strong style={{ color: '#ffffff' }}>Didn't create an account?</strong>
            </p>
            <p style={{ fontSize: '14px', color: '#b3b3b3', lineHeight: '1.6' }}>
                If you didn't sign up for Net Trailers, you can safely ignore this email. No account
                will be created until you verify this email address.
            </p>
        </BaseEmail>
    )
}

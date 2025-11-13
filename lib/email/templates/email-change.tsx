import * as React from 'react'
import { BaseEmail } from './base-email'

interface EmailChangeEmailProps {
    userName?: string
    oldEmail: string
    newEmail: string
    confirmUrl: string
}

/**
 * Email change confirmation template
 * Sent to both old and new email addresses when user changes their email
 */
export const EmailChangeEmail = ({
    userName,
    oldEmail,
    newEmail,
    confirmUrl,
}: EmailChangeEmailProps) => {
    return (
        <BaseEmail
            userName={userName}
            title="Confirm Your Email Change"
            subtitle="Account Security"
            ctaButton={{
                text: 'Confirm Email Change',
                url: confirmUrl,
            }}
        >
            <p style={{ marginBottom: '20px' }}>
                We received a request to change the email address associated with your Net Trailers
                account.
            </p>

            <div className="box">
                <div style={{ marginBottom: '15px' }}>
                    <p
                        style={{
                            margin: '0 0 5px 0',
                            fontSize: '12px',
                            color: '#808080',
                            textTransform: 'uppercase',
                        }}
                    >
                        Current Email
                    </p>
                    <p style={{ margin: 0, fontSize: '16px', color: '#e5e5e5' }}>{oldEmail}</p>
                </div>
                <div
                    style={{
                        height: '1px',
                        backgroundColor: '#313131',
                        margin: '15px 0',
                    }}
                ></div>
                <div>
                    <p
                        style={{
                            margin: '0 0 5px 0',
                            fontSize: '12px',
                            color: '#808080',
                            textTransform: 'uppercase',
                        }}
                    >
                        New Email
                    </p>
                    <p style={{ margin: 0, fontSize: '16px', color: '#e50914', fontWeight: '600' }}>
                        {newEmail}
                    </p>
                </div>
            </div>

            <p style={{ marginTop: '30px', fontSize: '14px', color: '#b3b3b3' }}>
                Click the button above to confirm this change. After confirmation, you'll use{' '}
                <strong style={{ color: '#ffffff' }}>{newEmail}</strong> to sign in to your account.
            </p>

            <p style={{ marginTop: '20px', fontSize: '14px', color: '#b3b3b3' }}>
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
                {confirmUrl}
            </p>

            <div className="divider" style={{ margin: '30px 0' }}></div>

            <p style={{ fontSize: '14px', color: '#b3b3b3', marginBottom: '10px' }}>
                <strong style={{ color: '#ffffff' }}>Didn't request this change?</strong>
            </p>
            <p style={{ fontSize: '14px', color: '#b3b3b3', lineHeight: '1.6' }}>
                If you didn't request to change your email address, please secure your account
                immediately by changing your password. This could indicate that someone else has
                access to your account.
            </p>
        </BaseEmail>
    )
}

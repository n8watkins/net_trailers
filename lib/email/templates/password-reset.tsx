import * as React from 'react'
import { BaseEmail } from './base-email'

interface PasswordResetEmailProps {
    userName?: string
    resetUrl: string
    expiresIn?: number // in hours
}

/**
 * Password reset email template
 * Sent when user requests to reset their password
 */
export const PasswordResetEmail = ({
    userName,
    resetUrl,
    expiresIn = 1,
}: PasswordResetEmailProps) => {
    return (
        <BaseEmail
            userName={userName}
            title="Reset Your Password"
            subtitle="Account Security"
            ctaButton={{
                text: 'Reset Password',
                url: resetUrl,
            }}
        >
            <p style={{ marginBottom: '20px' }}>
                We received a request to reset the password for your Net Trailers account. Click the
                button below to create a new password.
            </p>

            <div className="box">
                <p style={{ margin: 0, fontSize: '14px', color: '#b3b3b3' }}>
                    <strong style={{ color: '#ffffff' }}>Important:</strong> This link will expire
                    in{' '}
                    <strong style={{ color: '#e50914' }}>
                        {expiresIn} hour{expiresIn !== 1 ? 's' : ''}
                    </strong>
                    . If you don't reset your password within this time, you'll need to request a
                    new reset link.
                </p>
            </div>

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
                {resetUrl}
            </p>

            <div className="divider" style={{ margin: '30px 0' }}></div>

            <p style={{ fontSize: '14px', color: '#b3b3b3', marginBottom: '10px' }}>
                <strong style={{ color: '#ffffff' }}>Didn't request this?</strong>
            </p>
            <p style={{ fontSize: '14px', color: '#b3b3b3', lineHeight: '1.6' }}>
                If you didn't request a password reset, you can safely ignore this email. Your
                password will remain unchanged, and no one will be able to access your account
                without your current password.
            </p>

            <p style={{ marginTop: '30px', fontSize: '13px', color: '#808080' }}>
                For security reasons, we recommend:
            </p>
            <ul style={{ fontSize: '13px', color: '#808080', paddingLeft: '20px' }}>
                <li>Using a strong, unique password</li>
                <li>Enabling two-factor authentication if available</li>
                <li>Never sharing your password with anyone</li>
            </ul>
        </BaseEmail>
    )
}

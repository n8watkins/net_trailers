import React from 'react'
import { BaseEmail } from './base-email'

interface CustomEmailProps {
    userName: string
    subject: string
    htmlContent: string
    unsubscribeToken?: string
}

/**
 * Custom Email Template
 *
 * For fully custom emails with rich HTML content
 */
export default function CustomEmail({
    userName,
    subject,
    htmlContent,
    unsubscribeToken,
}: CustomEmailProps) {
    return (
        <BaseEmail title={`✉️ ${subject}`} userName={userName} unsubscribeToken={unsubscribeToken}>
            {/* Custom HTML Content */}
            <table width="100%" cellPadding="0" cellSpacing="0" style={{ marginBottom: '32px' }}>
                <tr>
                    <td>
                        <div
                            style={{
                                color: '#ffffff',
                                fontSize: '16px',
                                lineHeight: '1.8',
                            }}
                            dangerouslySetInnerHTML={{ __html: htmlContent }}
                        />
                    </td>
                </tr>
            </table>

            {/* Footer Note */}
            <table width="100%" cellPadding="0" cellSpacing="0">
                <tr>
                    <td>
                        <p
                            style={{
                                color: '#999999',
                                fontSize: '14px',
                                lineHeight: '1.5',
                                margin: '0',
                            }}
                        >
                            This email was sent from the Net Trailers admin panel.
                        </p>
                    </td>
                </tr>
            </table>
        </BaseEmail>
    )
}

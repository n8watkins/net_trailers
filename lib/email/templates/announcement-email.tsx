import React from 'react'
import BaseEmail from './base-email'

interface AnnouncementEmailProps {
    userName: string
    subject: string
    message: string
    unsubscribeToken?: string
}

/**
 * Announcement Email Template
 *
 * For system announcements and important updates
 */
export default function AnnouncementEmail({
    userName,
    subject,
    message,
    unsubscribeToken,
}: AnnouncementEmailProps) {
    return (
        <BaseEmail previewText={`📢 ${subject}`} unsubscribeToken={unsubscribeToken}>
            {/* Header */}
            <table width="100%" cellPadding="0" cellSpacing="0" style={{ marginBottom: '32px' }}>
                <tr>
                    <td style={{ textAlign: 'center' }}>
                        <div
                            style={{
                                fontSize: '48px',
                                marginBottom: '16px',
                            }}
                        >
                            📢
                        </div>
                        <h1
                            style={{
                                color: '#ffffff',
                                fontSize: '28px',
                                fontWeight: 'bold',
                                margin: '0',
                                lineHeight: '1.3',
                            }}
                        >
                            {subject}
                        </h1>
                    </td>
                </tr>
            </table>

            {/* Greeting */}
            <table width="100%" cellPadding="0" cellSpacing="0" style={{ marginBottom: '24px' }}>
                <tr>
                    <td>
                        <p
                            style={{
                                color: '#cccccc',
                                fontSize: '16px',
                                lineHeight: '1.6',
                                margin: '0',
                            }}
                        >
                            Hello {userName},
                        </p>
                    </td>
                </tr>
            </table>

            {/* Message Content */}
            <table width="100%" cellPadding="0" cellSpacing="0" style={{ marginBottom: '32px' }}>
                <tr>
                    <td>
                        <table
                            width="100%"
                            cellPadding="20"
                            cellSpacing="0"
                            style={{
                                backgroundColor: '#222222',
                                borderLeft: '4px solid #e50914',
                                borderRadius: '4px',
                            }}
                        >
                            <tr>
                                <td>
                                    <p
                                        style={{
                                            color: '#ffffff',
                                            fontSize: '16px',
                                            lineHeight: '1.8',
                                            margin: '0',
                                            whiteSpace: 'pre-wrap',
                                        }}
                                    >
                                        {message}
                                    </p>
                                </td>
                            </tr>
                        </table>
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
                            This is an official announcement from the Net Trailers admin team.
                        </p>
                    </td>
                </tr>
            </table>
        </BaseEmail>
    )
}

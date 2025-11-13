import * as React from 'react'

interface BaseEmailProps {
    userName?: string
    title: string
    subtitle?: string
    children: React.ReactNode
    showLogo?: boolean
    showFooter?: boolean
    ctaButton?: {
        text: string
        url: string
    }
}

/**
 * Base email template component with consistent NetTrailer branding
 * All email templates should use this as a wrapper for consistent styling
 */
export const BaseEmail = ({
    userName,
    title,
    subtitle,
    children,
    showLogo = true,
    showFooter = true,
    ctaButton,
}: BaseEmailProps) => {
    return (
        <html>
            <head>
                <meta charSet="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <style>{`
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                        background-color: #000000;
                        color: #ffffff;
                        margin: 0;
                        padding: 0;
                        -webkit-font-smoothing: antialiased;
                        -moz-osx-font-smoothing: grayscale;
                    }
                    .container {
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 40px 20px;
                    }
                    .header {
                        text-align: center;
                        margin-bottom: 40px;
                    }
                    .logo {
                        font-size: 32px;
                        font-weight: bold;
                        color: #e50914;
                        margin-bottom: 10px;
                        letter-spacing: 2px;
                    }
                    .subtitle {
                        font-size: 16px;
                        color: #b3b3b3;
                        margin-top: 10px;
                    }
                    .greeting {
                        font-size: 24px;
                        font-weight: 600;
                        margin-bottom: 20px;
                    }
                    .title {
                        font-size: 28px;
                        font-weight: 700;
                        margin-bottom: 20px;
                        color: #ffffff;
                        line-height: 1.3;
                    }
                    .content {
                        font-size: 16px;
                        color: #e5e5e5;
                        line-height: 1.6;
                    }
                    .cta-button {
                        display: inline-block;
                        background-color: #e50914;
                        color: #ffffff !important;
                        padding: 14px 32px;
                        border-radius: 4px;
                        text-decoration: none;
                        font-weight: 600;
                        font-size: 16px;
                        margin: 30px 0;
                        transition: background-color 0.2s;
                    }
                    .cta-button:hover {
                        background-color: #f40612;
                    }
                    .divider {
                        height: 1px;
                        background-color: #313131;
                        margin: 30px 0;
                    }
                    .footer {
                        text-align: center;
                        margin-top: 50px;
                        padding-top: 30px;
                        border-top: 1px solid #313131;
                        color: #b3b3b3;
                        font-size: 13px;
                        line-height: 1.6;
                    }
                    .footer-links {
                        margin-top: 20px;
                    }
                    .footer-link {
                        color: #b3b3b3;
                        text-decoration: none;
                        margin: 0 10px;
                        font-size: 12px;
                    }
                    .footer-link:hover {
                        color: #e50914;
                    }
                    .copyright {
                        margin-top: 20px;
                        font-size: 12px;
                        color: #808080;
                    }
                    .box {
                        background-color: #141414;
                        border: 1px solid #313131;
                        border-radius: 8px;
                        padding: 24px;
                        margin: 20px 0;
                    }
                    .text-center {
                        text-align: center;
                    }
                    .text-muted {
                        color: #b3b3b3;
                    }
                    .text-small {
                        font-size: 14px;
                    }
                    .mb-20 {
                        margin-bottom: 20px;
                    }
                    .mt-20 {
                        margin-top: 20px;
                    }
                `}</style>
            </head>
            <body>
                <div className="container">
                    {showLogo && (
                        <div className="header">
                            <div className="logo">NET TRAILERS</div>
                            {subtitle && <div className="subtitle">{subtitle}</div>}
                        </div>
                    )}

                    {userName && (
                        <div className="greeting">Hello{userName ? `, ${userName}` : ''}! 👋</div>
                    )}

                    <div className="title">{title}</div>

                    <div className="content">{children}</div>

                    {ctaButton && (
                        <div className="text-center">
                            <a href={ctaButton.url} className="cta-button">
                                {ctaButton.text}
                            </a>
                        </div>
                    )}

                    {showFooter && (
                        <div className="footer">
                            <p>
                                You're receiving this email because you have an account with Net
                                Trailers.
                                <br />
                                Manage your notification preferences in your{' '}
                                <a
                                    href={`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings`}
                                    className="footer-link"
                                >
                                    account settings
                                </a>
                                .
                            </p>
                            <div className="footer-links">
                                <a
                                    href={`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}`}
                                    className="footer-link"
                                >
                                    Home
                                </a>
                                •
                                <a
                                    href={`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings`}
                                    className="footer-link"
                                >
                                    Settings
                                </a>
                                •
                                <a
                                    href={`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings#notifications`}
                                    className="footer-link"
                                >
                                    Unsubscribe
                                </a>
                            </div>
                            <div className="copyright">
                                © {new Date().getFullYear()} Net Trailers. All rights reserved.
                            </div>
                        </div>
                    )}
                </div>
            </body>
        </html>
    )
}

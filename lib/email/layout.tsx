/**
 * The one layout every NetTrailers email is built on: header (mark and live
 * text wordmark), card, footer. Dark by default; clients that report
 * `prefers-color-scheme: light` get a light variant through the classes below.
 * Backgrounds are set on table cells (bgcolor and style), not only on <body>,
 * so clients that re-colour emails (Gmail's dark mode) keep the layout legible.
 */

import * as React from 'react'
import { Body, Head, Html, Img, Link, Preview } from '@react-email/components'
import { render } from '@react-email/render'

import {
    BRAND_FONT,
    COLORS,
    N8BUILDS_URL,
    PORTFOLIO_PROJECT_URL,
    SANS,
    logoUrl,
    preferencesUrl,
    siteUrl,
} from './brand'

const D = COLORS.dark
const L = COLORS.light
const AMBER = COLORS.amber

/** The legacy bgcolor attribute: older clients and recolouring ones read it where they ignore CSS. */
const bgcolor = (color: string): Record<string, string> => ({ bgcolor: color })

const CSS = `
:root{color-scheme:dark light;supported-color-schemes:dark light}
body{margin:0;padding:0;-webkit-text-size-adjust:100%;text-size-adjust:100%}
a{text-decoration:none}
img{border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic}
.nt-content h2{margin:24px 0 8px;font:700 19px/26px ${SANS};color:${D.ink}}
.nt-content h3{margin:20px 0 6px;font:700 16px/22px ${SANS};color:${D.ink}}
.nt-content p,.nt-content li{margin:0 0 14px;font:400 16px/24px ${SANS};color:${D.body}}
.nt-content a{color:${D.link};text-decoration:underline}
.nt-content img{max-width:100%!important;height:auto!important}
@media (prefers-color-scheme:light){
.nt-bg{background:${L.page}!important}
.nt-card{background:${L.card}!important;border-color:${L.border}!important;border-top-color:${AMBER}!important}
.nt-panel{background:${L.panel}!important;border-color:${L.border}!important}
.nt-rule{border-color:${L.border}!important}
.nt-ink,.nt-content h2,.nt-content h3{color:${L.ink}!important}
.nt-body,.nt-content p,.nt-content li{color:${L.body}!important}
.nt-subtle{color:${L.subtle}!important}
.nt-link,.nt-content a{color:${L.link}!important}
.nt-net{color:${L.net}!important}
.nt-trailers{color:${L.trailers}!important}
}
@media only screen and (max-width:480px){
.nt-pad{padding-left:20px!important;padding-right:20px!important}
.nt-card-pad{padding:28px 20px!important}
.nt-h1{font-size:22px!important;line-height:28px!important}
.nt-btn-table{width:100%!important}
.nt-btn{display:block!important;text-align:center!important}
.nt-poster{width:64px!important}
.nt-poster img{width:64px!important;height:96px!important}
}`

export function Heading({ children }: { children: React.ReactNode }) {
    return (
        <h1
            className="nt-h1 nt-ink"
            style={{
                margin: '0 0 12px',
                font: `700 24px/30px ${SANS}`,
                color: D.ink,
            }}
        >
            {children}
        </h1>
    )
}

export function Paragraph({
    children,
    style,
}: {
    children: React.ReactNode
    style?: React.CSSProperties
}) {
    return (
        <p
            className="nt-body"
            style={{ margin: '0 0 16px', font: `400 16px/24px ${SANS}`, color: D.body, ...style }}
        >
            {children}
        </p>
    )
}

export function Small({
    children,
    style,
}: {
    children: React.ReactNode
    style?: React.CSSProperties
}) {
    return (
        <p
            className="nt-subtle"
            style={{ margin: '0 0 10px', font: `400 13px/20px ${SANS}`, color: D.subtle, ...style }}
        >
            {children}
        </p>
    )
}

export function TextLink({
    href,
    children,
    style,
}: {
    href: string
    children: React.ReactNode
    style?: React.CSSProperties
}) {
    return (
        <Link
            className="nt-link"
            href={href}
            style={{ color: D.link, textDecoration: 'none', fontWeight: 600, ...style }}
        >
            {children}
        </Link>
    )
}

/** A small bold section label (sentence case, never all caps). */
export function Label({ children }: { children: React.ReactNode }) {
    return (
        <p
            className="nt-subtle"
            style={{ margin: '0 0 12px', font: `700 14px/20px ${SANS}`, color: D.subtle }}
        >
            {children}
        </p>
    )
}

export function Rule() {
    return (
        <div
            className="nt-rule"
            style={{ borderTop: `1px solid ${D.border}`, margin: '8px 0 16px' }}
        />
    )
}

/** An amber button with near-black text; the colour sits on the cell and the link. */
export function Button({ href, children }: { href: string; children: React.ReactNode }) {
    return (
        <table
            role="presentation"
            className="nt-btn-table"
            cellPadding={0}
            cellSpacing={0}
            border={0}
            style={{ margin: '8px 0 4px' }}
        >
            <tbody>
                <tr>
                    <td {...bgcolor(AMBER)} style={{ borderRadius: '8px', background: AMBER }}>
                        <Link
                            className="nt-btn"
                            href={href}
                            style={{
                                display: 'inline-block',
                                padding: '13px 26px',
                                font: `700 15px/20px ${SANS}`,
                                color: COLORS.onAmber,
                                textDecoration: 'none',
                                borderRadius: '8px',
                                background: AMBER,
                            }}
                        >
                            {children}
                        </Link>
                    </td>
                </tr>
            </tbody>
        </table>
    )
}

/** A raised box for grouped content. */
export function Panel({ children }: { children: React.ReactNode }) {
    return (
        <table
            role="presentation"
            width="100%"
            cellPadding={0}
            cellSpacing={0}
            border={0}
            style={{ margin: '0 0 16px' }}
        >
            <tbody>
                <tr>
                    <td
                        className="nt-panel"
                        {...bgcolor(D.panel)}
                        style={{
                            background: D.panel,
                            border: `1px solid ${D.border}`,
                            borderRadius: '10px',
                            padding: '18px 18px 8px',
                        }}
                    >
                        {children}
                    </td>
                </tr>
            </tbody>
        </table>
    )
}

/** A quoted piece of user text, with an amber bar. Line breaks are kept. */
export function Quote({ children }: { children: React.ReactNode }) {
    return (
        <table
            role="presentation"
            width="100%"
            cellPadding={0}
            cellSpacing={0}
            border={0}
            style={{ margin: '6px 0 12px' }}
        >
            <tbody>
                <tr>
                    <td style={{ borderLeft: `3px solid ${AMBER}`, padding: '2px 0 2px 12px' }}>
                        <p
                            className="nt-ink"
                            style={{
                                margin: 0,
                                font: `400 15px/22px ${SANS}`,
                                color: D.ink,
                                whiteSpace: 'pre-wrap',
                            }}
                        >
                            {children}
                        </p>
                    </td>
                </tr>
            </tbody>
        </table>
    )
}

export interface EmailLayoutProps {
    /** The document title (shown by some clients and in "view in browser"). */
    title: string
    /** The inbox preview line. */
    preheader: string
    /** One sentence on why this person got the email. */
    reason: string
    /** Null for a transactional email (sign-in): no unsubscribe or preferences links. */
    unsubscribeUrl: string | null
    children: React.ReactNode
}

const FOOT_LINK = {
    color: D.subtle,
    textDecoration: 'underline',
    whiteSpace: 'nowrap' as const,
}

export function EmailLayout({
    title,
    preheader,
    reason,
    unsubscribeUrl,
    children,
}: EmailLayoutProps) {
    const site = siteUrl()
    const sep = (
        <span className="nt-subtle" style={{ color: D.subtle }}>
            &nbsp;&middot;&nbsp;
        </span>
    )
    const links: React.ReactNode[] = []
    if (unsubscribeUrl) {
        links.push(
            <Link key="prefs" className="nt-subtle" href={preferencesUrl()} style={FOOT_LINK}>
                Email preferences
            </Link>,
            <Link key="unsub" className="nt-subtle" href={unsubscribeUrl} style={FOOT_LINK}>
                Unsubscribe
            </Link>
        )
    }
    links.push(
        <Link key="site" className="nt-subtle" href={site} style={FOOT_LINK}>
            {site.replace(/^https?:\/\//, '')}
        </Link>
    )
    return (
        <Html lang="en">
            <Head>
                <meta name="color-scheme" content="dark light" />
                <meta name="supported-color-schemes" content="dark light" />
                <meta name="x-apple-disable-message-reformatting" />
                <title>{title}</title>
                <link
                    href="https://fonts.googleapis.com/css2?family=Lexend:wght@700&display=swap"
                    rel="stylesheet"
                />
                <style dangerouslySetInnerHTML={{ __html: CSS }} />
            </Head>
            <Preview>{preheader}</Preview>
            <Body className="nt-bg" style={{ margin: 0, padding: 0, background: D.page }}>
                <table
                    role="presentation"
                    className="nt-bg"
                    width="100%"
                    cellPadding={0}
                    cellSpacing={0}
                    border={0}
                    {...bgcolor(D.page)}
                    style={{ background: D.page }}
                >
                    <tbody>
                        <tr>
                            <td
                                align="center"
                                className="nt-bg"
                                {...bgcolor(D.page)}
                                style={{ padding: '28px 12px 32px', background: D.page }}
                            >
                                <table
                                    role="presentation"
                                    width="100%"
                                    cellPadding={0}
                                    cellSpacing={0}
                                    border={0}
                                    style={{ maxWidth: '600px' }}
                                >
                                    <tbody>
                                        <tr>
                                            <td
                                                className="nt-pad"
                                                style={{ padding: '0 8px 18px' }}
                                            >
                                                <Link
                                                    href={site}
                                                    style={{ textDecoration: 'none' }}
                                                >
                                                    <table
                                                        role="presentation"
                                                        cellPadding={0}
                                                        cellSpacing={0}
                                                        border={0}
                                                    >
                                                        <tbody>
                                                            <tr>
                                                                <td
                                                                    style={{
                                                                        paddingRight: '10px',
                                                                        verticalAlign: 'middle',
                                                                    }}
                                                                >
                                                                    <Img
                                                                        src={logoUrl()}
                                                                        width={32}
                                                                        height={32}
                                                                        alt=""
                                                                        style={{
                                                                            display: 'block',
                                                                            width: '32px',
                                                                            height: '32px',
                                                                            borderRadius: '7px',
                                                                        }}
                                                                    />
                                                                </td>
                                                                <td
                                                                    style={{
                                                                        verticalAlign: 'middle',
                                                                        font: `700 22px/28px ${BRAND_FONT}`,
                                                                        letterSpacing: '-.3px',
                                                                    }}
                                                                >
                                                                    <span
                                                                        className="nt-net"
                                                                        style={{ color: D.net }}
                                                                    >
                                                                        Net
                                                                    </span>
                                                                    <span
                                                                        className="nt-trailers"
                                                                        style={{
                                                                            color: D.trailers,
                                                                        }}
                                                                    >
                                                                        Trailers
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        </tbody>
                                                    </table>
                                                </Link>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td
                                                className="nt-card nt-card-pad"
                                                {...bgcolor(D.card)}
                                                style={{
                                                    background: D.card,
                                                    border: `1px solid ${D.border}`,
                                                    borderTop: `3px solid ${AMBER}`,
                                                    borderRadius: '12px',
                                                    padding: '32px 36px',
                                                }}
                                            >
                                                {children}
                                            </td>
                                        </tr>
                                        <tr>
                                            <td
                                                className="nt-pad"
                                                style={{ padding: '22px 8px 0' }}
                                            >
                                                <Small>{reason}</Small>
                                                <Small style={{ margin: '0 0 10px' }}>
                                                    {links.map((link, i) => (
                                                        <React.Fragment key={i}>
                                                            {i > 0 && sep}
                                                            {link}
                                                        </React.Fragment>
                                                    ))}
                                                </Small>
                                                <Small
                                                    style={{
                                                        margin: 0,
                                                        fontSize: '12px',
                                                        lineHeight: '18px',
                                                    }}
                                                >
                                                    NetTrailers is a{' '}
                                                    <Link
                                                        className="nt-subtle"
                                                        href={PORTFOLIO_PROJECT_URL}
                                                        style={FOOT_LINK}
                                                    >
                                                        portfolio project
                                                    </Link>{' '}
                                                    by{' '}
                                                    <Link
                                                        className="nt-subtle"
                                                        href={N8BUILDS_URL}
                                                        style={FOOT_LINK}
                                                    >
                                                        n8builds.dev
                                                    </Link>
                                                </Small>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </Body>
        </Html>
    )
}

/** The plain-text twin of the footer, appended to every text version. */
export function emailText({
    lines,
    reason,
    unsubscribeUrl,
}: {
    lines: string[]
    reason: string
    unsubscribeUrl: string | null
}): string {
    const foot = ['--', reason]
    if (unsubscribeUrl) {
        foot.push(`Email preferences: ${preferencesUrl()}`, `Unsubscribe: ${unsubscribeUrl}`)
    }
    foot.push(
        `NetTrailers: ${siteUrl()}`,
        `NetTrailers is a portfolio project by n8builds.dev: ${PORTFOLIO_PROJECT_URL}`
    )
    return [...lines, '', ...foot].join('\n') + '\n'
}

/** Renders a layout element to HTML; the caller writes the text version. */
export async function renderEmail(
    element: React.ReactElement,
    text: string
): Promise<{ html: string; text: string }> {
    return { html: await render(element), text }
}

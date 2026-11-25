import '../styles/globals.css'
import type { Metadata, Viewport } from 'next'
import { headers } from 'next/headers'
import { Providers } from './providers'
import ClientLayout from '../components/layout/ClientLayout'
import Analytics, { AnalyticsBootstrap } from '../components/utility/Analytics'
import WebAnalytics from '../components/utility/WebAnalytics'
import { NONCE_HEADER } from '../lib/csp'

export const viewport: Viewport = {
    themeColor: '#e50914',
}

export const metadata: Metadata = {
    metadataBase: new URL('https://net-trailers.n8builds.dev'),
    title: 'NetTrailers - Movie & TV Show Trailers',
    description: 'Browse and watch trailers for the latest movies and TV shows',
    keywords: ['movies', 'tv shows', 'trailers', 'entertainment'],
    manifest: '/manifest.json',
    appleWebApp: {
        capable: true,
        statusBarStyle: 'black-translucent',
        title: 'NetTrailers',
    },
    openGraph: {
        title: 'NetTrailers - Movie & TV Show Trailers',
        description: 'Browse and watch trailers for the latest movies and TV shows',
        url: 'https://net-trailers.n8builds.dev',
        siteName: 'NetTrailers',
        locale: 'en_US',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'NetTrailers - Movie & TV Show Trailers',
        description: 'Browse and watch trailers for the latest movies and TV shows',
    },
    icons: {
        icon: [
            { url: '/favicon.ico', sizes: '16x16 32x32' },
            { url: '/icon.svg', type: 'image/svg+xml' },
        ],
        apple: '/apple-touch-icon.png',
    },
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
    // The proxy's per-request script nonce (lib/csp.ts). Reading it renders
    // every page per request, which a nonce needs.
    const nonce = (await headers()).get(NONCE_HEADER) ?? undefined
    return (
        <html lang="en">
            <head>
                {/* Consent defaults before anything can load GA (lib/consent.ts). */}
                <AnalyticsBootstrap nonce={nonce} />
            </head>
            <body>
                <Providers>
                    <ClientLayout>{children}</ClientLayout>
                </Providers>
                <Analytics />
                <WebAnalytics nonce={nonce} />
            </body>
        </html>
    )
}

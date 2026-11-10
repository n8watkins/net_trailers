import '../styles/globals.css'
import type { Metadata, Viewport } from 'next'
import { headers } from 'next/headers'
import { Providers } from './providers'
import ClientLayout from '../components/layout/ClientLayout'
import Analytics from '../components/utility/Analytics'
import WebAnalytics from '../components/utility/WebAnalytics'
import { NONCE_HEADER } from '../lib/csp'

export const viewport: Viewport = {
    themeColor: '#f59e0b',
}

export const metadata: Metadata = {
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
        url: 'https://net-trailers.vercel.app',
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
            { url: '/favicon.ico', sizes: '48x48' },
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
            <body>
                <Providers>
                    <ClientLayout>{children}</ClientLayout>
                </Providers>
                <Analytics nonce={nonce} />
                <WebAnalytics nonce={nonce} />
            </body>
        </html>
    )
}

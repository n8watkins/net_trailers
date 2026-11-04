import '../styles/globals.css'
import type { Metadata, Viewport } from 'next'
import { Providers } from './providers'
import ClientLayout from '../components/layout/ClientLayout'
import Analytics from '../components/utility/Analytics'
import WebAnalytics from '../components/utility/WebAnalytics'

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
        url: 'https://nettrailers.n8builds.dev',
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body>
                <Providers>
                    <ClientLayout>{children}</ClientLayout>
                </Providers>
                <Analytics />
                <WebAnalytics />
            </body>
        </html>
    )
}

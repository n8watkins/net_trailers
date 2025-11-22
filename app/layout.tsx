import '../styles/globals.css'
import type { Metadata, Viewport } from 'next'
import { Providers } from './providers'
import ClientLayout from '../components/layout/ClientLayout'
import Analytics from '../components/utility/Analytics'

export const viewport: Viewport = {
    themeColor: '#e50914',
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
        icon: '/favicon.ico',
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
            </body>
        </html>
    )
}

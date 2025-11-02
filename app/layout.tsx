import '../styles/globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'NetTrailers - Movie & TV Show Trailers',
    description: 'Browse and watch trailers for the latest movies and TV shows',
    keywords: ['movies', 'tv shows', 'trailers', 'entertainment'],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    )
}

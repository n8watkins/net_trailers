import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'My Rows - NetTrailer | Manage Your Custom Content Rows',
    description:
        'Create and manage custom content rows with personalized genre filters for movies and TV shows. Build your perfect streaming experience.',
    keywords:
        'custom rows, content rows, genre filters, personalized content, custom collections, movie rows, tv show rows',
    openGraph: {
        title: 'My Rows - NetTrailer',
        description: 'Create and manage your personalized content rows.',
        type: 'website',
    },
}

export default function RowsLayout({ children }: { children: React.ReactNode }) {
    return children
}

import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'My Watchlists - NetTrailer | Manage Your Movie & TV Collections',
    description:
        'Manage your personal watchlists, organize movies and TV shows into custom collections. Create, edit, and track your favorite content.',
    keywords:
        'watchlist, my watchlist, movie collection, tv show collection, manage watchlist, organize movies, organize tv shows, netflix watchlist',
    openGraph: {
        title: 'My Watchlists - NetTrailer',
        description: 'Manage your personal watchlists and organize your favorite content.',
        type: 'website',
    },
}

export default function WatchlistsLayout({ children }: { children: React.ReactNode }) {
    return children
}

import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Search - NetTrailer | Find Movies & TV Shows',
    description:
        'Search thousands of movies and TV shows. Find your next favorite film or series by title, genre, or keyword. Filter by content type and explore trailers.',
    keywords:
        'search movies, search tv shows, find movies, find tv shows, movie search, tv show search, netflix search, movie trailers',
    openGraph: {
        title: 'Search - NetTrailer',
        description: 'Search thousands of movies and TV shows. Find your next favorite content.',
        type: 'website',
    },
}

export default function SearchLayout({ children }: { children: React.ReactNode }) {
    return children
}

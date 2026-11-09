import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'My Collections - NetTrailers | Manage Your Movie & TV Collections',
    description:
        'Manage your personal collections, organize movies and TV shows into custom lists. Create, edit, and track your favorite content.',
    keywords:
        'collections, movie collection, tv show collection, manage collections, organize movies, organize tv shows',
    openGraph: {
        title: 'My Collections - NetTrailers',
        description: 'Manage your personal collections and organize your favorite content.',
        type: 'website',
    },
}

export default function CollectionsLayout({ children }: { children: React.ReactNode }) {
    return children
}

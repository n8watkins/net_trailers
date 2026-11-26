import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'My Ratings - NetTrailers',
}

export default function RatingsLayout({ children }: { children: React.ReactNode }) {
    return children
}

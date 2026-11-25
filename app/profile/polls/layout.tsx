import type { Metadata } from 'next'

// The browser tab title; the page itself is a client component
export const metadata: Metadata = { title: 'My Polls - NetTrailers' }

export default function Layout({ children }: { children: React.ReactNode }) {
    return children
}

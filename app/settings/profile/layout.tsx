import type { Metadata } from 'next'
import { sectionTitle } from '../_components/sections'

// The browser tab title; the page itself is a client component
export const metadata: Metadata = { title: sectionTitle('profile') }

export default function Layout({ children }: { children: React.ReactNode }) {
    return children
}

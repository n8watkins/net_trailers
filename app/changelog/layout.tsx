import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Changelog - NetTrailer',
    description:
        'NetTrailer version history and release notes - Track all updates, features, and improvements to the platform',
    keywords: ['changelog', 'updates', 'version', 'history', 'releases'],
}

export default function ChangelogLayout({ children }: { children: React.ReactNode }) {
    return children
}

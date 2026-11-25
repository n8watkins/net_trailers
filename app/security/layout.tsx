import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Security - NetTrailers',
    description:
        'What NetTrailers does today to protect accounts and data: sign-in, ownership checks, limits, browser protections and the child safety PIN.',
}

export default function SecurityLayout({ children }: { children: React.ReactNode }) {
    return children
}

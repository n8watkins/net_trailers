import type { Metadata } from 'next'
import { auth } from '@/auth'
import { SeedSession } from '@/hooks/useAuth'

export const metadata: Metadata = {
    title: 'Profile - NetTrailers',
}

/**
 * Hands the session the server already read to the page, so a hard load of
 * the profile does not wait for GET /api/auth/session before it can start
 * loading the visitor's data (see app/settings/layout.tsx).
 */
export default async function ProfileLayout({ children }: { children: React.ReactNode }) {
    const session = await auth()
    return (
        <>
            <SeedSession session={session ?? null} />
            {children}
        </>
    )
}

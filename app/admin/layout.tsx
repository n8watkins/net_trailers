import type { Metadata } from 'next'
import { forbidden, redirect } from 'next/navigation'

import { auth } from '@/auth'

export const metadata: Metadata = {
    title: 'Admin - NetTrailers',
    robots: { index: false, follow: false },
}

/**
 * The server-side gate for every /admin page: signed-out visitors go to the
 * home page, signed-in non-admins get a 403. The admin APIs check again on
 * their own (lib/admin/guard.ts).
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    const session = await auth()
    if (!session?.user?.id) redirect('/')
    if (!session.user.isAdmin) forbidden()
    return children
}

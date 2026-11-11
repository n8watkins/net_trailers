import type { Metadata } from 'next'
import { forbidden, redirect } from 'next/navigation'

import { auth } from '@/auth'
import { AdminSessionProvider } from '@/components/admin/AdminDialogs'
import { AdminSidebar } from '@/components/admin/shell/AdminSidebar'

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
    return (
        <div className="flex min-h-dvh flex-col bg-[#0a0a0a] text-white lg:flex-row">
            <a
                href="#admin-main"
                className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[60] focus:rounded-lg focus:bg-amber-500 focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-black"
            >
                Skip to content
            </a>
            <AdminSidebar email={session.user.email ?? null} />
            <main id="admin-main" className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
                <div className="mx-auto max-w-[1240px]">
                    <AdminSessionProvider signedInAt={session.user.signedInAt ?? null}>
                        {children}
                    </AdminSessionProvider>
                </div>
            </main>
        </div>
    )
}

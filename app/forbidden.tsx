import type { Metadata } from 'next'
import Link from '@/components/common/Link'

export const metadata: Metadata = {
    title: 'Not allowed - NetTrailers',
    robots: { index: false, follow: false },
}

/** The 403 page, shown by forbidden() (app/admin/layout.tsx). */
export default function Forbidden() {
    return (
        <div className="min-h-screen bg-black flex items-center justify-center px-4">
            <div className="text-center max-w-md">
                <h1 className="text-7xl font-bold text-white mb-4 tracking-wider">403</h1>
                <div className="w-24 h-1 bg-amber-500 mx-auto mb-6" />
                <p className="text-gray-300 text-lg mb-8">This page is only for administrators.</p>
                <Link
                    href="/"
                    className="inline-block rounded-lg bg-amber-500 px-6 py-3 font-semibold text-black hover:bg-amber-400 transition-colors"
                >
                    Back to NetTrailers
                </Link>
            </div>
        </div>
    )
}

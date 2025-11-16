'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'
import NetflixLoader from '../../components/common/NetflixLoader'

function UnsubscribedContent() {
    const searchParams = useSearchParams()
    const success = searchParams?.get('success') === 'true'

    return (
        <div className="min-h-screen bg-black flex items-center justify-center px-4">
            <div className="max-w-md w-full">
                <div className="bg-[#141414] border border-[#313131] rounded-lg p-8 text-center">
                    {success ? (
                        <>
                            <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
                            <h1 className="text-2xl font-bold text-white mb-4">
                                Successfully Unsubscribed
                            </h1>
                            <p className="text-[#b3b3b3] mb-6">
                                You've been unsubscribed from all email notifications. You will no
                                longer receive emails from Net Trailers.
                            </p>
                            <p className="text-sm text-[#808080] mb-6">
                                You can re-enable email notifications anytime in your account
                                settings.
                            </p>
                            <div className="space-y-3">
                                <Link
                                    href="/settings"
                                    className="block w-full px-4 py-3 bg-red-600 text-white rounded-lg font-medium transition-all duration-200 hover:bg-red-700"
                                >
                                    Go to Settings
                                </Link>
                                <Link
                                    href="/"
                                    className="block w-full px-4 py-3 bg-[#1a1a1a] border border-[#313131] text-white rounded-lg font-medium transition-all duration-200 hover:bg-[#2a2a2a]"
                                >
                                    Back to Home
                                </Link>
                            </div>
                        </>
                    ) : (
                        <>
                            <XCircleIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
                            <h1 className="text-2xl font-bold text-white mb-4">
                                Unsubscribe Failed
                            </h1>
                            <p className="text-[#b3b3b3] mb-6">
                                We couldn't process your unsubscribe request. The link may be
                                invalid or expired.
                            </p>
                            <p className="text-sm text-[#808080] mb-6">
                                If you're still receiving unwanted emails, please contact support or
                                update your settings directly.
                            </p>
                            <div className="space-y-3">
                                <Link
                                    href="/settings"
                                    className="block w-full px-4 py-3 bg-red-600 text-white rounded-lg font-medium transition-all duration-200 hover:bg-red-700"
                                >
                                    Manage Email Settings
                                </Link>
                                <Link
                                    href="/"
                                    className="block w-full px-4 py-3 bg-[#1a1a1a] border border-[#313131] text-white rounded-lg font-medium transition-all duration-200 hover:bg-[#2a2a2a]"
                                >
                                    Back to Home
                                </Link>
                            </div>
                        </>
                    )}
                </div>

                <div className="mt-6 text-center">
                    <p className="text-xs text-[#808080]">
                        © {new Date().getFullYear()} Net Trailers. All rights reserved.
                    </p>
                </div>
            </div>
        </div>
    )
}

export default function UnsubscribedPage() {
    return (
        <Suspense fallback={<NetflixLoader message="Loading preference update..." />}>
            <UnsubscribedContent />
        </Suspense>
    )
}

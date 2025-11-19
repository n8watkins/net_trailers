'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline'
import NetflixLoader from '@/components/common/NetflixLoader'

type VerificationStatus = 'verifying' | 'success' | 'error'

function VerifyEmailContent() {
    const searchParams = useSearchParams()
    const token = searchParams?.get('token') || ''

    const [status, setStatus] = useState<VerificationStatus>('verifying')
    const [message, setMessage] = useState('Hold tight while we verify your email...')

    useEffect(() => {
        if (!token) {
            setStatus('error')
            setMessage('Verification token is missing. Try opening the link from your email again.')
            return
        }

        let isMounted = true
        const controller = new AbortController()

        const verify = async () => {
            try {
                const response = await fetch('/api/auth/verify-email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token }),
                    signal: controller.signal,
                })
                const data = await response.json()

                if (!isMounted) return

                if (!response.ok) {
                    setStatus('error')
                    setMessage(data.error || 'Verification link is invalid or expired.')
                    return
                }

                setStatus('success')
                setMessage('Your email has been verified successfully. You can close this page.')
            } catch (err) {
                if (err instanceof DOMException && err.name === 'AbortError') {
                    return
                }
                if (!isMounted) return

                setStatus('error')
                setMessage('Unable to verify email right now. Please try again later.')
            }
        }

        verify()

        return () => {
            isMounted = false
            controller.abort()
        }
    }, [token])

    return (
        <div className="min-h-screen bg-black flex items-center justify-center px-4">
            <div className="max-w-md w-full">
                <div className="bg-[#141414] border border-[#313131] rounded-2xl p-8 text-center">
                    {status === 'success' ? (
                        <>
                            <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
                            <h1 className="text-2xl font-bold text-white mb-4">
                                Email Verified 🎉
                            </h1>
                            <p className="text-[#b3b3b3] mb-6">{message}</p>
                            <Link
                                href="/"
                                className="block w-full px-4 py-3 bg-red-600 text-white rounded-lg font-medium transition-all duration-200 hover:bg-red-700"
                            >
                                Continue to Net Trailers
                            </Link>
                        </>
                    ) : status === 'error' ? (
                        <>
                            <XCircleIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
                            <h1 className="text-2xl font-bold text-white mb-4">
                                Verification Failed
                            </h1>
                            <p className="text-[#b3b3b3] mb-6">{message}</p>
                            <div className="space-y-3">
                                <Link
                                    href="/settings/email"
                                    className="block w-full px-4 py-3 bg-red-600 text-white rounded-lg font-medium transition-all duration-200 hover:bg-red-700"
                                >
                                    Request New Link
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
                            <NetflixLoader message="Verifying your email..." />
                            <p className="text-[#b3b3b3] mt-4">{message}</p>
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

export default function VerifyEmailPage() {
    return (
        <Suspense fallback={<NetflixLoader message="Preparing verification..." />}>
            <VerifyEmailContent />
        </Suspense>
    )
}

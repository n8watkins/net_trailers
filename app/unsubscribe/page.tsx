'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'

type Status = 'idle' | 'loading' | 'success' | 'error'

function UnsubscribeContent() {
    const searchParams = useSearchParams()
    const token = searchParams.get('token')
    const errorParam = searchParams.get('error')

    const [status, setStatus] = useState<Status>('idle')
    const [errorMessage, setErrorMessage] = useState<string>('')

    const handleUnsubscribe = async () => {
        if (!token) return

        setStatus('loading')
        setErrorMessage('')

        try {
            const response = await fetch('/api/email/unsubscribe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ token }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to unsubscribe')
            }

            setStatus('success')
        } catch (error) {
            setStatus('error')
            setErrorMessage(error instanceof Error ? error.message : 'An error occurred')
        }
    }

    // Show error if missing token
    if (!token || errorParam === 'missing-token') {
        return (
            <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
                <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-8 max-w-md w-full text-center">
                    <div className="text-red-500 text-4xl mb-4">!</div>
                    <h1 className="text-xl font-semibold text-white mb-2">Invalid Link</h1>
                    <p className="text-neutral-400">
                        This unsubscribe link is invalid or has expired. Please use the link from
                        your email.
                    </p>
                </div>
            </div>
        )
    }

    // Success state
    if (status === 'success') {
        return (
            <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
                <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-8 max-w-md w-full text-center">
                    <div className="text-green-500 text-4xl mb-4">&#10003;</div>
                    <h1 className="text-xl font-semibold text-white mb-2">Unsubscribed</h1>
                    <p className="text-neutral-400">
                        You have been successfully unsubscribed from email notifications.
                    </p>
                    <a
                        href="/"
                        className="inline-block mt-6 text-blue-500 hover:text-blue-400 transition-colors"
                    >
                        Return to NetTrailers
                    </a>
                </div>
            </div>
        )
    }

    // Confirmation state
    return (
        <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
            <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-8 max-w-md w-full text-center">
                <h1 className="text-xl font-semibold text-white mb-2">Unsubscribe</h1>
                <p className="text-neutral-400 mb-6">
                    Are you sure you want to unsubscribe from email notifications?
                </p>

                {status === 'error' && (
                    <div className="bg-red-900/20 border border-red-800 rounded-md p-3 mb-4">
                        <p className="text-red-400 text-sm">{errorMessage}</p>
                    </div>
                )}

                <button
                    onClick={handleUnsubscribe}
                    disabled={status === 'loading'}
                    className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-800 disabled:cursor-not-allowed text-white font-medium py-3 px-6 rounded-lg transition-colors"
                >
                    {status === 'loading' ? 'Unsubscribing...' : 'Unsubscribe'}
                </button>

                <a
                    href="/"
                    className="inline-block mt-4 text-neutral-500 hover:text-neutral-400 text-sm transition-colors"
                >
                    Cancel
                </a>
            </div>
        </div>
    )
}

export default function UnsubscribePage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
                    <div className="text-white">Loading...</div>
                </div>
            }
        >
            <UnsubscribeContent />
        </Suspense>
    )
}

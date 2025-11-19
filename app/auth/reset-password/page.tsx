'use client'

import { Suspense, useEffect, useState, FormEvent } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
    CheckCircleIcon,
    ExclamationTriangleIcon,
    LockClosedIcon,
} from '@heroicons/react/24/outline'
import NetflixLoader from '@/components/common/NetflixLoader'

type ResetStatus = 'validating' | 'invalid' | 'ready' | 'success'

function ResetPasswordContent() {
    const searchParams = useSearchParams()
    const token = searchParams?.get('token') || ''

    const [status, setStatus] = useState<ResetStatus>('validating')
    const [email, setEmail] = useState<string | null>(null)
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)

    useEffect(() => {
        if (!token) {
            setStatus('invalid')
            setError('Missing password reset token.')
            return
        }

        let isMounted = true
        const controller = new AbortController()

        const validateToken = async () => {
            try {
                const response = await fetch(`/api/auth/reset-password?token=${token}`, {
                    signal: controller.signal,
                })
                const data = await response.json()

                if (!isMounted) return

                if (!response.ok || !data.valid) {
                    setStatus('invalid')
                    setError(data.message || 'Reset link is invalid or expired.')
                    return
                }

                setEmail(data.email ?? null)
                setStatus('ready')
            } catch (err) {
                if (err instanceof DOMException && err.name === 'AbortError') {
                    return
                }
                if (!isMounted) return

                setStatus('invalid')
                setError('Unable to validate reset link. Please try again later.')
            }
        }

        validateToken()

        return () => {
            isMounted = false
            controller.abort()
        }
    }, [token])

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        if (status !== 'ready' || isSubmitting || !token) return

        if (password.length < 8) {
            setError('Password must be at least 8 characters long.')
            return
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match.')
            return
        }

        setIsSubmitting(true)
        setError(null)

        try {
            const response = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, password }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to reset password')
            }

            setStatus('success')
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to reset password.')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="min-h-screen bg-black flex items-center justify-center px-4 py-12">
            <div className="w-full max-w-lg">
                <div className="bg-[#141414] border border-[#313131] rounded-2xl p-8 shadow-2xl">
                    {status === 'success' ? (
                        <div className="text-center space-y-4">
                            <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto" />
                            <h1 className="text-2xl font-bold text-white">Password Updated</h1>
                            <p className="text-[#b3b3b3]">
                                Your password has been reset successfully. You can now sign in with
                                your new password.
                            </p>
                            <div className="space-y-3">
                                <Link
                                    href="/"
                                    className="block w-full px-4 py-3 bg-red-600 text-white rounded-lg font-medium transition-all duration-200 hover:bg-red-700"
                                >
                                    Go to Homepage
                                </Link>
                                <Link
                                    href="/settings"
                                    className="block w-full px-4 py-3 bg-[#1a1a1a] border border-[#313131] text-white rounded-lg font-medium transition-all duration-200 hover:bg-[#2a2a2a]"
                                >
                                    Manage Account
                                </Link>
                            </div>
                        </div>
                    ) : status === 'invalid' ? (
                        <div className="text-center space-y-4">
                            <ExclamationTriangleIcon className="w-16 h-16 text-yellow-500 mx-auto" />
                            <h1 className="text-2xl font-bold text-white">Link Invalid</h1>
                            <p className="text-[#b3b3b3]">
                                {error ||
                                    'This password reset link is invalid or has expired. Please request a new one.'}
                            </p>
                            <Link
                                href="/settings/password"
                                className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium transition-all duration-200"
                            >
                                Request New Reset Link
                            </Link>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="flex items-center gap-3">
                                <div className="p-3 rounded-full bg-red-600/20 border border-red-600/30">
                                    <LockClosedIcon className="w-6 h-6 text-red-400" />
                                </div>
                                <div>
                                    <p className="text-sm uppercase tracking-wide text-[#b3b3b3]">
                                        Secure Reset
                                    </p>
                                    <h1 className="text-2xl font-bold text-white">
                                        Choose a New Password
                                    </h1>
                                </div>
                            </div>

                            {email && (
                                <div className="bg-[#0a0a0a] border border-[#2c2c2c] rounded-lg p-4 text-sm text-[#b3b3b3]">
                                    Resetting password for{' '}
                                    <span className="text-white font-medium">{email}</span>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-[#e5e5e5] mb-2">
                                    New Password
                                </label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="inputClass w-full"
                                    placeholder="Enter a strong password"
                                    minLength={8}
                                    required
                                />
                                <p className="text-xs text-[#808080] mt-1">
                                    Must be at least 8 characters long.
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-[#e5e5e5] mb-2">
                                    Confirm Password
                                </label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="inputClass w-full"
                                    placeholder="Re-enter your password"
                                    minLength={8}
                                    required
                                />
                            </div>

                            {error && (
                                <div className="rounded-md bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-200">
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isSubmitting || status !== 'ready'}
                                className={`w-full px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                                    isSubmitting
                                        ? 'bg-gray-600 cursor-not-allowed'
                                        : 'bg-red-600 hover:bg-red-700 text-white'
                                }`}
                            >
                                {isSubmitting ? 'Updating Password...' : 'Reset Password'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    )
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={<NetflixLoader message="Preparing secure reset..." />}>
            <ResetPasswordContent />
        </Suspense>
    )
}

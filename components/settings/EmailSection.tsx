'use client'

import React from 'react'
import { CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import type { User } from 'firebase/auth'

interface EmailSectionProps {
    user: User | null
    isGoogleAuth: boolean
    newEmail: string
    setNewEmail: (email: string) => void
    emailPassword: string
    setEmailPassword: (password: string) => void
    isUpdatingEmail: boolean
    onUpdateEmail: () => Promise<void>
    isEmailVerified: boolean
    isSendingVerification: boolean
    onSendVerification: () => Promise<void>
}

const EmailSection: React.FC<EmailSectionProps> = ({
    user,
    isGoogleAuth,
    newEmail,
    setNewEmail,
    emailPassword,
    setEmailPassword,
    isUpdatingEmail,
    onUpdateEmail,
    isEmailVerified,
    isSendingVerification,
    onSendVerification,
}) => {
    const hasRequiredFields = newEmail.trim() && emailPassword.trim()
    const showVerificationCard = !isGoogleAuth || !isEmailVerified

    return (
        <div className="p-8">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-white mb-2">Email Settings</h2>
                <p className="text-[#b3b3b3]">Update your email address for your account.</p>
            </div>

            <div className="max-w-2xl space-y-4 mb-8">
                <div className="bg-[#0a0a0a] border border-[#2c2c2c] rounded-lg p-6 flex items-start gap-4">
                    <div
                        className={`p-3 rounded-full ${
                            isEmailVerified
                                ? 'bg-green-600/10 border-green-600/20'
                                : 'bg-yellow-600/10 border-yellow-600/20'
                        } border`}
                    >
                        {isEmailVerified ? (
                            <CheckCircleIcon className="w-6 h-6 text-green-400" />
                        ) : (
                            <ExclamationTriangleIcon className="w-6 h-6 text-yellow-400" />
                        )}
                    </div>
                    <div className="flex-1">
                        <h3 className="text-white font-semibold mb-1">
                            {isEmailVerified ? 'Email Verified' : 'Email Verification Pending'}
                        </h3>
                        <p className="text-sm text-[#b3b3b3]">
                            {isEmailVerified
                                ? 'Your email is verified. You can update it anytime below.'
                                : 'Verify your email to unlock notification emails, account recovery, and security alerts.'}
                        </p>
                    </div>
                    {showVerificationCard && (
                        <button
                            onClick={onSendVerification}
                            disabled={isSendingVerification || isGoogleAuth}
                            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                                isSendingVerification || isGoogleAuth
                                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                                    : 'bg-red-600 text-white hover:bg-red-700'
                            }`}
                        >
                            {isSendingVerification
                                ? 'Sending...'
                                : isEmailVerified
                                  ? 'Resend Email'
                                  : 'Send Verification Email'}
                        </button>
                    )}
                </div>
            </div>

            {isGoogleAuth ? (
                <div className="max-w-2xl">
                    <div className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-6">
                        <div className="flex items-start gap-4">
                            <div className="flex-shrink-0">
                                <svg
                                    className="w-6 h-6 text-blue-400"
                                    fill="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                            </div>
                            <div className="flex-1">
                                <h3 className="text-white font-semibold mb-2">
                                    Signed in with Google
                                </h3>
                                <p className="text-[#b3b3b3] text-sm mb-3">
                                    Your email address is managed by Google. Changing your email
                                    requires updating your Google account.
                                </p>
                                <p className="text-[#b3b3b3] text-sm">
                                    To change your email, visit{' '}
                                    <a
                                        href="https://myaccount.google.com/"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-400 hover:text-blue-300 underline"
                                    >
                                        Google Account Settings
                                    </a>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-6 max-w-md">
                    <div>
                        <label className="block text-sm font-medium text-[#e5e5e5] mb-2">
                            Current Email
                        </label>
                        <input
                            type="email"
                            value={user?.email || ''}
                            disabled
                            className="inputClass w-full opacity-50 cursor-not-allowed"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[#e5e5e5] mb-2">
                            New Email Address
                        </label>
                        <input
                            type="email"
                            value={newEmail}
                            onChange={(e) => setNewEmail(e.target.value)}
                            placeholder="Enter new email address"
                            className="inputClass w-full"
                            disabled={isUpdatingEmail}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[#e5e5e5] mb-2">
                            Confirm Password
                        </label>
                        <input
                            type="password"
                            value={emailPassword}
                            onChange={(e) => setEmailPassword(e.target.value)}
                            placeholder="Enter your current password"
                            className="inputClass w-full"
                            disabled={isUpdatingEmail}
                        />
                    </div>

                    <div className="pt-4">
                        <button
                            onClick={onUpdateEmail}
                            disabled={isUpdatingEmail || !hasRequiredFields}
                            className={`bannerButton ${
                                isUpdatingEmail || !hasRequiredFields
                                    ? 'bg-gray-600 cursor-not-allowed opacity-50'
                                    : 'bg-red-600 hover:bg-red-700'
                            } text-white flex items-center justify-center gap-2`}
                        >
                            {isUpdatingEmail ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Updating...
                                </>
                            ) : (
                                'Update Email'
                            )}
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

export default EmailSection

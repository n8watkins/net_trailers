'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import useAuth from '../../../hooks/useAuth'
import { useAuthStatus } from '../../../hooks/useAuthStatus'

/**
 * Account page. With GitHub-only auth there is no email/password to change and
 * no email verification — accounts are managed entirely through GitHub. This
 * page shows the connected account and a sign-out action. Guests are redirected.
 */
const AccountManagementPage: React.FC = () => {
    const router = useRouter()
    const { user, logOut } = useAuth()
    const { isGuest } = useAuthStatus()

    React.useEffect(() => {
        if (isGuest) {
            router.push('/settings/preferences')
        }
    }, [isGuest, router])

    if (isGuest || !user) {
        return null // Will redirect / loading
    }

    return (
        <div className="max-w-2xl">
            <h1 className="text-2xl font-bold text-white mb-6">Account</h1>

            <div className="bg-[#181818] border border-gray-700 rounded-lg p-6">
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 rounded-full overflow-hidden bg-red-600 flex items-center justify-center flex-shrink-0">
                        {user.photoURL ? (
                            <img
                                src={user.photoURL}
                                alt={user.displayName ?? 'avatar'}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <span className="text-white text-2xl font-bold">
                                {(user.displayName ?? user.email ?? '?').charAt(0).toUpperCase()}
                            </span>
                        )}
                    </div>
                    <div>
                        <p className="text-white text-lg font-semibold">
                            {user.displayName ?? user.githubLogin ?? 'GitHub user'}
                        </p>
                        {user.email && <p className="text-gray-400 text-sm">{user.email}</p>}
                        <p className="text-gray-500 text-sm mt-1">Connected with GitHub</p>
                    </div>
                </div>

                <button
                    onClick={() => logOut()}
                    className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-md font-medium transition-colors"
                >
                    Sign Out
                </button>
            </div>
        </div>
    )
}

export default AccountManagementPage

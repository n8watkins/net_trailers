'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import useAuth from '../../../hooks/useAuth'
import { useSettingsVisitor } from '../_components/settingsVisitor'

/**
 * Account page. Sign-in is by emailed link only, so there is no password to
 * change. This page shows the signed-in account and a sign-out action. Guests
 * are sent to Preferences. The account comes from the session the server
 * already read, so the panel is complete on the first paint.
 */
const AccountManagementPage: React.FC = () => {
    const router = useRouter()
    const { logOut } = useAuth()
    const { signedIn, account } = useSettingsVisitor()

    React.useEffect(() => {
        if (!signedIn) {
            router.replace('/settings/preferences')
        }
    }, [signedIn, router])

    if (!signedIn || !account) {
        return null // Being sent to Preferences
    }

    return (
        <div className="p-8">
            <div className="mb-6">
                <h2 className="mb-2 text-2xl font-bold text-white">Account Management</h2>
                <p className="text-[#b3b3b3]">The account you are signed in with</p>
            </div>

            <div className="max-w-2xl rounded-lg border border-[#313131] bg-[#0a0a0a] p-6">
                <div className="mb-6 flex items-center gap-4">
                    <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-500">
                        {account.image ? (
                            <img
                                src={account.image}
                                alt=""
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            <span className="text-2xl font-bold text-white" aria-hidden="true">
                                {(account.name ?? account.email ?? '?').charAt(0).toUpperCase()}
                            </span>
                        )}
                    </div>
                    <div className="min-w-0">
                        <p className="truncate text-lg font-semibold text-white">
                            {account.name ?? account.email ?? 'Your account'}
                        </p>
                        {account.email && account.name && (
                            <p className="truncate text-sm text-gray-400">{account.email}</p>
                        )}
                        <p className="mt-1 text-sm text-gray-500">Signs in with an emailed link</p>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={() => logOut()}
                    className="h-10 rounded-lg bg-brand-500 px-5 font-medium text-white transition-colors hover:bg-brand-400"
                >
                    Sign out
                </button>
            </div>
        </div>
    )
}

export default AccountManagementPage

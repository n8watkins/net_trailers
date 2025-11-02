'use client'

import React from 'react'
import Image from 'next/image'
import { EnvelopeIcon } from '@heroicons/react/24/outline'
import type { User } from 'firebase/auth'

interface ProfileSectionProps {
    user: User | null
    isGoogleAuth: boolean
    isEmailAuth: boolean
    displayName: string
    setDisplayName: (name: string) => void
    isSavingProfile: boolean
    onSaveProfile: () => Promise<void>
}

const ProfileSection: React.FC<ProfileSectionProps> = ({
    user,
    isGoogleAuth,
    isEmailAuth,
    displayName,
    setDisplayName,
    isSavingProfile,
    onSaveProfile,
}) => {
    const getUserName = () => {
        if (user?.displayName) {
            return user.displayName.split(' ')[0]
        }
        if (user?.email) {
            return user.email.split('@')[0]
        }
        return 'User'
    }

    const hasChanges = displayName.trim() !== (user?.displayName || '')

    return (
        <div className="p-8">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-white mb-2">Profile Information</h2>
                <p className="text-[#b3b3b3]">Manage your profile and account information.</p>
            </div>

            <div className="space-y-6">
                {/* Profile Picture */}
                <div className="flex items-center space-x-6">
                    {user?.photoURL ? (
                        <Image
                            src={user.photoURL}
                            alt="Profile"
                            width={96}
                            height={96}
                            className="rounded-full object-cover border-4 border-[#313131]"
                        />
                    ) : (
                        <div className="w-24 h-24 bg-red-600 rounded-full flex items-center justify-center border-4 border-[#313131]">
                            <span className="text-white font-bold text-2xl">
                                {getUserName().charAt(0).toUpperCase()}
                            </span>
                        </div>
                    )}
                    <div>
                        <h3 className="text-xl font-semibold text-white">{getUserName()}</h3>
                        <p className="text-[#b3b3b3]">{user?.email || 'No email'}</p>
                        <p className="text-[#777] text-sm mt-1">
                            Member since{' '}
                            {new Date(
                                user?.metadata?.creationTime || Date.now()
                            ).toLocaleDateString()}
                        </p>
                    </div>
                </div>

                {/* Display Name */}
                <div>
                    <label className="block text-sm font-medium text-[#e5e5e5] mb-2">
                        Display Name
                    </label>
                    <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Enter your display name"
                        className="inputClass w-full max-w-md"
                        disabled={isSavingProfile}
                    />
                </div>

                {/* Email (read-only) */}
                <div>
                    <label className="block text-sm font-medium text-[#e5e5e5] mb-2">
                        Email Address
                    </label>
                    <input
                        type="email"
                        value={user?.email || ''}
                        disabled
                        className="inputClass w-full max-w-md opacity-50 cursor-not-allowed"
                    />
                    <div className="flex items-center gap-2 mt-2">
                        {isGoogleAuth && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-900/30 border border-blue-600/40 rounded-full text-xs text-blue-300">
                                <svg
                                    className="w-3.5 h-3.5"
                                    fill="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                                Google Account
                            </span>
                        )}
                        {isEmailAuth && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-800/60 border border-gray-600/40 rounded-full text-xs text-gray-300">
                                <EnvelopeIcon className="w-3.5 h-3.5" />
                                Email/Password
                            </span>
                        )}
                    </div>
                    <p className="text-[#777] text-sm mt-1">
                        {isGoogleAuth
                            ? 'Managed by Google'
                            : 'To change your email, use the Email Settings section'}
                    </p>
                </div>

                <div className="pt-4">
                    <button
                        onClick={onSaveProfile}
                        disabled={isSavingProfile || !hasChanges}
                        className={`bannerButton ${
                            isSavingProfile || !hasChanges
                                ? 'bg-gray-600 cursor-not-allowed opacity-50'
                                : 'bg-red-600 hover:bg-red-700'
                        } text-white flex items-center justify-center gap-2`}
                    >
                        {isSavingProfile ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Saving...
                            </>
                        ) : (
                            'Save Changes'
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default ProfileSection

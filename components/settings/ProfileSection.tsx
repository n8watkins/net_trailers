'use client'

import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
    EnvelopeIcon,
    EyeIcon,
    HeartIcon,
    ClockIcon,
    StarIcon,
    RectangleStackIcon,
    ChatBubbleLeftRightIcon,
    ChartBarIcon,
    HandThumbUpIcon,
    ArrowTopRightOnSquareIcon,
    UserCircleIcon,
    GlobeAltIcon,
} from '@heroicons/react/24/outline'
import type { User } from 'firebase/auth'
import type { ProfileVisibility } from '../../types/profile'

interface VisibilityToggleProps {
    id: keyof ProfileVisibility
    label: string
    icon: React.ElementType
    checked: boolean
    onChange: (id: keyof ProfileVisibility, checked: boolean) => void
    disabled?: boolean
}

const VisibilityToggle: React.FC<VisibilityToggleProps> = ({
    id,
    label,
    icon: Icon,
    checked,
    onChange,
    disabled = false,
}) => {
    return (
        <div className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
            <div className="flex items-center gap-2.5 flex-1">
                <Icon className="h-4 w-4 text-[#888]" />
                <label
                    htmlFor={id}
                    className="text-sm text-[#e5e5e5] cursor-pointer"
                >
                    {label}
                </label>
            </div>
            <label className="relative inline-flex items-center cursor-pointer ml-3">
                <input
                    id={id}
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => onChange(id, e.target.checked)}
                    disabled={disabled}
                    className="sr-only peer"
                />
                <div
                    className={`w-10 h-5 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-red-600 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                ></div>
            </label>
        </div>
    )
}

interface ProfileSectionProps {
    user: User | null
    isGoogleAuth: boolean
    isEmailAuth: boolean
    displayName: string
    setDisplayName: (name: string) => void
    isSavingProfile: boolean
    onSaveProfile: () => Promise<void>
    // Privacy settings
    visibility?: ProfileVisibility
    isLoadingVisibility?: boolean
    isSavingVisibility?: boolean
    onVisibilityChange?: (id: keyof ProfileVisibility, checked: boolean) => void
    profileUsername?: string
    profileUserId?: string
}

const ProfileSection: React.FC<ProfileSectionProps> = ({
    user,
    isGoogleAuth,
    isEmailAuth,
    displayName,
    setDisplayName,
    isSavingProfile,
    onSaveProfile,
    visibility,
    isLoadingVisibility,
    isSavingVisibility,
    onVisibilityChange,
    profileUsername,
    profileUserId,
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
        <div className="p-6 lg:p-8">
            {/* Page Header */}
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-white mb-1">Profile Settings</h2>
                <p className="text-[#b3b3b3] text-sm">Manage your profile information and privacy preferences</p>
                {(profileUsername || profileUserId) && (
                    <Link
                        href={`/users/${profileUsername || profileUserId}`}
                        target="_blank"
                        className="inline-flex items-center gap-2 px-3 py-1.5 mt-3 rounded-md bg-[#141414] border border-[#454545] text-white text-sm font-medium hover:bg-[#1a1a1a] transition"
                    >
                        <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                        View Public Profile
                    </Link>
                )}
            </div>

            {/* Two Column Layout: stacked on mobile, side-by-side on lg+ */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                {/* Left Column: Profile Information */}
                <div className="space-y-5">
                    <div className="flex items-center gap-2 mb-4">
                        <UserCircleIcon className="h-5 w-5 text-[#b3b3b3]" />
                        <h3 className="text-lg font-semibold text-white">Profile Information</h3>
                    </div>

                    <div className="bg-[#0a0a0a] rounded-lg border border-[#313131] p-5 space-y-5">
                        {/* Profile Picture & Basic Info */}
                        <div className="flex items-center gap-4">
                            {user?.photoURL ? (
                                <Image
                                    src={user.photoURL}
                                    alt="Profile"
                                    width={64}
                                    height={64}
                                    className="rounded-full object-cover border-2 border-[#313131] flex-shrink-0"
                                />
                            ) : (
                                <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center border-2 border-[#313131] flex-shrink-0">
                                    <span className="text-white font-bold text-xl">
                                        {getUserName().charAt(0).toUpperCase()}
                                    </span>
                                </div>
                            )}
                            <div className="min-w-0">
                                <h4 className="text-base font-semibold text-white truncate">{getUserName()}</h4>
                                <p className="text-sm text-[#b3b3b3] truncate">{user?.email || 'No email'}</p>
                                <p className="text-xs text-[#666] mt-0.5">
                                    Member since{' '}
                                    {new Date(
                                        user?.metadata?.creationTime || Date.now()
                                    ).toLocaleDateString()}
                                </p>
                            </div>
                        </div>

                        {/* Display Name */}
                        <div>
                            <label className="block text-sm font-medium text-[#e5e5e5] mb-1.5">
                                Display Name
                            </label>
                            <input
                                type="text"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                placeholder="Enter your display name"
                                className="inputClass w-full"
                                disabled={isSavingProfile}
                            />
                        </div>

                        {/* Email (read-only) */}
                        <div>
                            <label className="block text-sm font-medium text-[#e5e5e5] mb-1.5">
                                Email Address
                            </label>
                            <input
                                type="email"
                                value={user?.email || ''}
                                disabled
                                className="inputClass w-full opacity-50 cursor-not-allowed"
                            />
                            <div className="flex items-center gap-2 mt-2">
                                {isGoogleAuth && (
                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-blue-900/30 border border-blue-600/40 rounded-full text-xs text-blue-300">
                                        <svg
                                            className="w-3 h-3"
                                            fill="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                        </svg>
                                        Google
                                    </span>
                                )}
                                {isEmailAuth && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-800/60 border border-gray-600/40 rounded-full text-xs text-gray-300">
                                        <EnvelopeIcon className="w-3 h-3" />
                                        Email
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Save Button */}
                        <button
                            onClick={onSaveProfile}
                            disabled={isSavingProfile || !hasChanges}
                            className={`w-full py-2.5 px-4 rounded-md font-medium text-sm transition ${
                                isSavingProfile || !hasChanges
                                    ? 'bg-gray-700 cursor-not-allowed opacity-50 text-gray-400'
                                    : 'bg-red-600 hover:bg-red-700 text-white'
                            } flex items-center justify-center gap-2`}
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

                {/* Right Column: Privacy Settings */}
                {visibility && onVisibilityChange && (
                    <div className="space-y-5">
                        <div className="flex items-center gap-2 mb-4">
                            <EyeIcon className="h-5 w-5 text-[#b3b3b3]" />
                            <h3 className="text-lg font-semibold text-white">Privacy</h3>
                        </div>

                        <div className="bg-[#0a0a0a] rounded-lg border border-[#313131] p-5">
                            <p className="text-xs text-[#888] mb-4">
                                Control what others see on your public profile
                            </p>

                            {isLoadingVisibility ? (
                                <div className="space-y-3 animate-pulse">
                                    {[...Array(8)].map((_, i) => (
                                        <div key={i} className="flex items-center justify-between py-2">
                                            <div className="flex items-center gap-2.5 flex-1">
                                                <div className="w-4 h-4 bg-[#313131] rounded"></div>
                                                <div className="h-4 bg-[#313131] rounded w-24"></div>
                                            </div>
                                            <div className="w-10 h-5 bg-[#313131] rounded-full ml-3"></div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="space-y-0">
                                    {/* Master Toggle */}
                                    <div className="flex items-center justify-between py-2.5 pb-3 mb-2 border-b border-[#313131]">
                                        <div className="flex items-center gap-2.5 flex-1">
                                            <GlobeAltIcon className="h-4 w-4 text-[#888]" />
                                            <label
                                                htmlFor="enablePublicProfile"
                                                className="text-sm font-medium text-white cursor-pointer"
                                            >
                                                Enable Public Profile
                                            </label>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer ml-3">
                                            <input
                                                id="enablePublicProfile"
                                                type="checkbox"
                                                checked={visibility.enablePublicProfile}
                                                onChange={(e) => onVisibilityChange('enablePublicProfile', e.target.checked)}
                                                disabled={isSavingVisibility}
                                                className="sr-only peer"
                                            />
                                            <div
                                                className={`w-10 h-5 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-red-600 ${isSavingVisibility ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            ></div>
                                        </label>
                                    </div>

                                    {/* Sub-toggles */}
                                    <div className={`divide-y divide-[#252525] ${!visibility.enablePublicProfile ? 'opacity-40 pointer-events-none' : ''}`}>
                                        <VisibilityToggle
                                            id="showLikedContent"
                                            label="Liked Content"
                                            icon={HeartIcon}
                                            checked={visibility.enablePublicProfile && visibility.showLikedContent}
                                            onChange={onVisibilityChange}
                                            disabled={isSavingVisibility || !visibility.enablePublicProfile}
                                        />
                                        <VisibilityToggle
                                            id="showWatchLater"
                                            label="Watch Later"
                                            icon={ClockIcon}
                                            checked={visibility.enablePublicProfile && visibility.showWatchLater}
                                            onChange={onVisibilityChange}
                                            disabled={isSavingVisibility || !visibility.enablePublicProfile}
                                        />
                                        <VisibilityToggle
                                            id="showRankings"
                                            label="Rankings"
                                            icon={StarIcon}
                                            checked={visibility.enablePublicProfile && visibility.showRankings}
                                            onChange={onVisibilityChange}
                                            disabled={isSavingVisibility || !visibility.enablePublicProfile}
                                        />
                                        <VisibilityToggle
                                            id="showCollections"
                                            label="Collections"
                                            icon={RectangleStackIcon}
                                            checked={visibility.enablePublicProfile && visibility.showCollections}
                                            onChange={onVisibilityChange}
                                            disabled={isSavingVisibility || !visibility.enablePublicProfile}
                                        />
                                        <VisibilityToggle
                                            id="showThreads"
                                            label="Forum Threads"
                                            icon={ChatBubbleLeftRightIcon}
                                            checked={visibility.enablePublicProfile && visibility.showThreads}
                                            onChange={onVisibilityChange}
                                            disabled={isSavingVisibility || !visibility.enablePublicProfile}
                                        />
                                        <VisibilityToggle
                                            id="showPollsCreated"
                                            label="Polls Created"
                                            icon={ChartBarIcon}
                                            checked={visibility.enablePublicProfile && visibility.showPollsCreated}
                                            onChange={onVisibilityChange}
                                            disabled={isSavingVisibility || !visibility.enablePublicProfile}
                                        />
                                        <VisibilityToggle
                                            id="showPollsVoted"
                                            label="Polls Voted"
                                            icon={HandThumbUpIcon}
                                            checked={visibility.enablePublicProfile && visibility.showPollsVoted}
                                            onChange={onVisibilityChange}
                                            disabled={isSavingVisibility || !visibility.enablePublicProfile}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default ProfileSection

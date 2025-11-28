'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
    EnvelopeIcon,
    KeyIcon,
    ShareIcon,
    UserCircleIcon,
    TrashIcon,
    ChevronRightIcon,
    Cog6ToothIcon,
    BellIcon,
    RectangleStackIcon,
    SparklesIcon,
    MagnifyingGlassIcon,
} from '@heroicons/react/24/outline'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { useAuthStatus } from '../../hooks/useAuthStatus'
import SubPageLayout from '../../components/layout/SubPageLayout'
import NetflixLoader from '../../components/common/NetflixLoader'
import { useSessionStore } from '../../stores/sessionStore'

type SettingsSection =
    | 'profile'
    | 'email'
    | 'password'
    | 'preferences'
    | 'notifications'
    | 'recommendations'
    | 'collections'
    | 'share'
    | 'account'

interface SidebarItem {
    id: SettingsSection
    path: string
    title: string
    description: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    icon: React.ComponentType<any>
    priority: 'low' | 'medium' | 'high' | 'danger'
    guestOnly?: boolean
    authenticatedOnly?: boolean
    searchKeywords?: string[] // Additional keywords for searching section content
}

const SettingsLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const pathname = usePathname()
    const { isGuest, isLoading: isAuthLoading } = useAuthStatus()
    const isInitialized = useSessionStore((state) => state.isInitialized)

    // Show loading state while initializing
    const isLoading = !isInitialized || isAuthLoading

    // Search state
    const [searchQuery, setSearchQuery] = useState('')

    // Define all possible sidebar items
    const allSidebarItems: SidebarItem[] = [
        {
            id: 'profile',
            path: '/settings/profile',
            title: 'Profile',
            description: 'Manage your profile and privacy settings',
            icon: UserCircleIcon,
            priority: 'medium',
            authenticatedOnly: true,
            searchKeywords: [
                'display name',
                'name',
                'photo',
                'avatar',
                'picture',
                'privacy',
                'visibility',
                'public profile',
                'hide',
                'show',
                'liked',
                'rankings',
                'collections',
                'forum',
                'threads',
                'polls',
                'watch later',
            ],
        },
        {
            id: 'email',
            path: '/settings/email',
            title: 'Email Settings',
            description: 'Change your email address',
            icon: EnvelopeIcon,
            priority: 'medium',
            authenticatedOnly: true,
            searchKeywords: ['email', 'address', 'contact', 'update email', 'change email'],
        },
        {
            id: 'password',
            path: '/settings/password',
            title: 'Password',
            description: 'Update your password',
            icon: KeyIcon,
            priority: 'medium',
            authenticatedOnly: true,
            searchKeywords: ['password', 'security', 'change password', 'reset', 'authentication'],
        },
        {
            id: 'preferences',
            path: '/settings/preferences',
            title: 'Preferences',
            description: 'Content filters and playback settings',
            icon: Cog6ToothIcon,
            priority: 'low',
            searchKeywords: [
                'child safety',
                'parental controls',
                'family friendly',
                'mute',
                'volume',
                'autoplay',
                'recommendations',
                'personalized',
                'tracking',
                'pin',
                'lock',
            ],
        },
        {
            id: 'notifications',
            path: '/settings/notifications',
            title: 'Notifications',
            description: 'Manage notification preferences',
            icon: BellIcon,
            priority: 'low',
            searchKeywords: [
                'alerts',
                'email notifications',
                'push notifications',
                'updates',
                'newsletter',
                'marketing',
            ],
        },
        {
            id: 'recommendations',
            path: '/settings/recommendations',
            title: 'Recommendations',
            description: 'Manage Trending, Top Rated, and For You rows',
            icon: SparklesIcon,
            priority: 'low',
            searchKeywords: [
                'trending',
                'top rated',
                'recommended',
                'for you',
                'personalized',
                'system rows',
                'homepage rows',
                'enable',
                'disable',
                'reorder',
            ],
        },
        {
            id: 'collections',
            path: '/settings/collections',
            title: 'Collections',
            description: 'Manage and organize your collections',
            icon: RectangleStackIcon,
            priority: 'low',
            searchKeywords: [
                'rows',
                'lists',
                'watchlists',
                'custom collections',
                'hide',
                'show',
                'enable',
                'disable',
                'system collections',
                'genres',
            ],
        },
        {
            id: 'share',
            path: '/settings/share',
            title: 'Share & Export',
            description: 'Share your lists or export data',
            icon: ShareIcon,
            priority: 'low',
            authenticatedOnly: true,
            searchKeywords: [
                'share',
                'export',
                'download',
                'csv',
                'backup',
                'collections',
                'shareable links',
            ],
        },
        {
            id: 'account',
            path: '/settings/account',
            title: 'Data Management',
            description: 'Export, clear, or manage your data',
            icon: TrashIcon,
            priority: 'danger',
            searchKeywords: [
                'delete',
                'clear',
                'remove',
                'erase',
                'delete account',
                'clear data',
                'export',
                'download',
                'backup',
            ],
        },
    ]

    // Filter sidebar items based on authentication status and search query
    const sidebarItems = allSidebarItems.filter((item) => {
        if (isGuest && item.authenticatedOnly) return false
        if (!isGuest && item.guestOnly) return false

        // Apply search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase()
            const matchesTitle = item.title.toLowerCase().includes(query)
            const matchesDescription = item.description.toLowerCase().includes(query)
            const matchesKeywords = item.searchKeywords?.some((keyword) =>
                keyword.toLowerCase().includes(query)
            )
            return matchesTitle || matchesDescription || matchesKeywords
        }

        return true
    })

    const getPriorityColor = (priority: string, isActive: boolean) => {
        if (isActive) return 'border-l-gray-400'

        switch (priority) {
            case 'danger':
                return 'border-l-red-600'
            case 'high':
                return 'border-l-orange-500'
            case 'medium':
                return 'border-l-gray-500'
            default:
                return 'border-l-zinc-700'
        }
    }

    const getIconColor = (priority: string, isActive: boolean) => {
        if (isActive) return 'text-gray-400'

        switch (priority) {
            case 'danger':
                return 'text-red-500'
            case 'high':
                return 'text-orange-500'
            case 'medium':
                return 'text-gray-500'
            default:
                return 'text-gray-600'
        }
    }

    return (
        <SubPageLayout hideHeader>
            <div className="relative -mt-20 -mx-6 sm:-mx-8 lg:-mx-12">
                {/* Atmospheric Background */}
                <div className="fixed inset-0 pointer-events-none">
                    <div className="absolute inset-0 bg-black" />
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[800px] bg-gradient-radial from-gray-900/20 via-transparent to-transparent opacity-50" />
                    <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-black opacity-60" />
                </div>

                {/* Content Container */}
                <div className="relative z-10">
                    {/* Cinematic Hero Header */}
                    <div className="relative overflow-hidden pt-4">
                        {/* Animated Background Gradients */}
                        <div className="absolute inset-0 bg-gradient-to-br from-black via-zinc-900/80 to-black" />
                        <div
                            className="absolute inset-0 bg-gradient-to-t from-gray-900/20 via-slate-900/10 to-black/50 animate-pulse"
                            style={{ animationDuration: '4s' }}
                        />
                        <div className="absolute inset-0 bg-gradient-radial from-gray-500/10 via-gray-900/5 to-transparent" />

                        {/* Soft edge vignetting for subtle blending */}
                        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/80" />
                        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-black/60" />

                        {/* Hero Content */}
                        <div className="relative z-10 flex flex-col items-center justify-start px-6 pt-8 pb-6">
                            {/* Icon with glow */}
                            <div className="relative mb-4">
                                <div className="absolute inset-0 bg-gray-500/30 blur-2xl scale-150" />
                                <Cog6ToothIcon className="relative w-16 h-16 text-gray-400 drop-shadow-[0_0_20px_rgba(156,163,175,0.5)]" />
                            </div>

                            {/* Title */}
                            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-2 text-center tracking-tight">
                                <span className="bg-gradient-to-r from-gray-200 via-slate-100 to-gray-200 bg-clip-text text-transparent drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]">
                                    Settings
                                </span>
                            </h1>

                            {/* Subtitle */}
                            <p className="text-base sm:text-lg text-gray-300 mb-6 text-center max-w-2xl">
                                Manage your account preferences and data
                            </p>

                            {/* Enhanced Search Bar */}
                            <div className="w-full max-w-2xl relative mb-4">
                                <div className="relative group">
                                    <MagnifyingGlassIcon className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400 z-10 transition-colors group-focus-within:text-gray-300" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search settings..."
                                        className="w-full pl-14 pr-14 py-4 bg-zinc-900/40 backdrop-blur-lg border border-zinc-800/50 rounded-2xl text-white text-lg placeholder-gray-500 focus:outline-none focus:border-gray-500 focus:shadow-[0_0_25px_rgba(156,163,175,0.3)] transition-all duration-300 hover:bg-zinc-900/60 hover:border-zinc-700"
                                    />
                                    {searchQuery && (
                                        <button
                                            onClick={() => setSearchQuery('')}
                                            className="absolute right-5 top-1/2 -translate-y-1/2 z-10 text-gray-400 hover:text-white transition-colors"
                                        >
                                            <XMarkIcon className="w-6 h-6" />
                                        </button>
                                    )}

                                    {/* Glowing border effect on focus */}
                                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-gray-500 to-slate-500 opacity-0 group-focus-within:opacity-20 blur-xl transition-opacity duration-300 -z-10" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Main Content Area */}
                    <div className="px-6 sm:px-8 lg:px-12 py-8">
                        {/* Loading state */}
                        {isLoading ? (
                            <div className="py-16">
                                <NetflixLoader inline={true} message="Loading settings..." />
                            </div>
                        ) : (
                            /* Unified Settings Container */
                            <div className="bg-zinc-900/60 backdrop-blur-lg rounded-xl border border-zinc-800/50 overflow-hidden">
                                <div className="flex flex-col lg:flex-row">
                                    {/* Sidebar */}
                                    <div className="lg:w-96 flex-shrink-0 border-b lg:border-b-0 lg:border-r border-zinc-800/50">
                                        <nav className="p-6">
                                            <ul className="space-y-2">
                                                {sidebarItems.map((item) => {
                                                    const isActive = pathname === item.path
                                                    const Icon = item.icon

                                                    return (
                                                        <li key={item.id}>
                                                            <Link
                                                                href={item.path}
                                                                className={`w-full flex items-center p-4 rounded-lg border-l-4 transition-all duration-200 ${
                                                                    isActive
                                                                        ? 'bg-zinc-800/80 border-l-gray-400 shadow-lg'
                                                                        : `hover:bg-zinc-800/40 ${getPriorityColor(item.priority, false)} bg-zinc-900/40`
                                                                }`}
                                                            >
                                                                <Icon
                                                                    className={`w-6 h-6 mr-4 ${getIconColor(item.priority, isActive)}`}
                                                                />
                                                                <div className="flex-1">
                                                                    <h3
                                                                        className={`font-medium ${isActive ? 'text-white' : 'text-gray-300'}`}
                                                                    >
                                                                        {item.title}
                                                                    </h3>
                                                                    <p className="text-gray-500 text-sm mt-1">
                                                                        {item.description}
                                                                    </p>
                                                                </div>
                                                                <ChevronRightIcon
                                                                    className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-500'}`}
                                                                />
                                                            </Link>
                                                        </li>
                                                    )
                                                })}
                                            </ul>
                                        </nav>
                                    </div>

                                    {/* Main Content */}
                                    <div className="flex-1">{children}</div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </SubPageLayout>
    )
}

export default SettingsLayout

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
} from '@heroicons/react/24/outline'
import { useAuthStatus } from '../../hooks/useAuthStatus'
import SubPageLayout from '../../components/layout/SubPageLayout'
import SearchBar from '../../components/common/SearchBar'
import NetflixLoader from '../../components/common/NetflixLoader'
import { useSessionStore } from '../../stores/sessionStore'

type SettingsSection =
    | 'profile'
    | 'email'
    | 'password'
    | 'preferences'
    | 'notifications'
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
            description: 'Manage your profile information',
            icon: UserCircleIcon,
            priority: 'medium',
            authenticatedOnly: true,
            searchKeywords: ['display name', 'name', 'photo', 'avatar', 'picture'],
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

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'danger':
                return 'border-l-red-600'
            case 'high':
                return 'border-l-orange-500'
            case 'medium':
                return 'border-l-blue-500'
            default:
                return 'border-l-[#454545]'
        }
    }

    const getIconColor = (priority: string, isActive: boolean) => {
        if (isActive) return 'text-white'

        switch (priority) {
            case 'danger':
                return 'text-red-500'
            case 'high':
                return 'text-orange-500'
            case 'medium':
                return 'text-blue-500'
            default:
                return 'text-[#b3b3b3]'
        }
    }

    return (
        <SubPageLayout
            title="Settings"
            icon={<Cog6ToothIcon />}
            iconColor="text-gray-400"
            description="Manage your account preferences and data"
        >
            {/* Unified Settings Container */}
            {isLoading ? (
                <NetflixLoader message="Loading settings..." inline />
            ) : (
                <div className="bg-[#141414] rounded-lg border border-[#313131] overflow-hidden">
                    <div className="flex flex-col lg:flex-row">
                        {/* Sidebar */}
                        <div className="lg:w-96 flex-shrink-0 border-b lg:border-b-0 lg:border-r border-[#313131]">
                            <nav className="p-6">
                                {/* Search Bar */}
                                <div className="mb-4">
                                    <SearchBar
                                        value={searchQuery}
                                        onChange={setSearchQuery}
                                        placeholder="Search settings..."
                                        focusColor="gray"
                                        voiceInput
                                    />
                                </div>

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
                                                            ? 'bg-[#313131] border-l-red-600 shadow-lg'
                                                            : `hover:bg-[#1a1a1a] ${getPriorityColor(item.priority)} bg-[#0a0a0a]`
                                                    }`}
                                                >
                                                    <Icon
                                                        className={`w-6 h-6 mr-4 ${getIconColor(item.priority, isActive)}`}
                                                    />
                                                    <div className="flex-1">
                                                        <h3
                                                            className={`font-medium ${isActive ? 'text-white' : 'text-[#e5e5e5]'}`}
                                                        >
                                                            {item.title}
                                                        </h3>
                                                        <p className="text-[#b3b3b3] text-sm mt-1">
                                                            {item.description}
                                                        </p>
                                                    </div>
                                                    <ChevronRightIcon
                                                        className={`w-5 h-5 ${isActive ? 'text-white' : 'text-[#b3b3b3]'}`}
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
        </SubPageLayout>
    )
}

export default SettingsLayout

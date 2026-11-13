'use client'

import React from 'react'
import Link from '@/components/common/Link'
import { usePathname } from 'next/navigation'
import {
    ShareIcon,
    UserCircleIcon,
    TrashIcon,
    ChevronRightIcon,
    Cog6ToothIcon,
    BellIcon,
    RectangleStackIcon,
    SparklesIcon,
    ShieldCheckIcon,
} from '@heroicons/react/24/outline'
import { useAuthStatus } from '../../hooks/useAuthStatus'
import SubPageLayout from '../../components/layout/SubPageLayout'
import PageHeader from '../../components/layout/PageHeader'
import PageLoader from '../../components/common/PageLoader'
import { useSessionStore } from '../../stores/sessionStore'

type SettingsSection =
    | 'profile'
    | 'account-management'
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
}

const SettingsLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const pathname = usePathname()
    const { isGuest, isLoading: isAuthLoading } = useAuthStatus()
    const isInitialized = useSessionStore((state) => state.isInitialized)

    // Show loading state while initializing
    const isLoading = !isInitialized || isAuthLoading

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
        },
        {
            id: 'account-management',
            path: '/settings/account-management',
            title: 'Account Management',
            description: 'Manage your email and password',
            icon: ShieldCheckIcon,
            priority: 'high',
            authenticatedOnly: true,
        },
        {
            id: 'preferences',
            path: '/settings/preferences',
            title: 'Preferences',
            description: 'Content filters and playback settings',
            icon: Cog6ToothIcon,
            priority: 'low',
        },
        {
            id: 'notifications',
            path: '/settings/notifications',
            title: 'Notifications',
            description: 'Manage notification preferences',
            icon: BellIcon,
            priority: 'low',
        },
        {
            id: 'recommendations',
            path: '/settings/recommendations',
            title: 'Recommendations',
            description: 'Manage Trending, Top Rated, and For You rows',
            icon: SparklesIcon,
            priority: 'low',
        },
        {
            id: 'collections',
            path: '/settings/collections',
            title: 'Collections',
            description: 'Manage and organize your collections',
            icon: RectangleStackIcon,
            priority: 'low',
        },
        {
            id: 'share',
            path: '/settings/share',
            title: 'Share & Export',
            description: 'Share your lists or export data',
            icon: ShareIcon,
            priority: 'low',
            authenticatedOnly: true,
        },
        {
            id: 'account',
            path: '/settings/account',
            title: 'Data Management',
            description: 'Export, clear, or manage your data',
            icon: TrashIcon,
            priority: 'danger',
        },
    ]

    // Filter sidebar items based on authentication status
    const sidebarItems = allSidebarItems.filter((item) => {
        if (isGuest && item.authenticatedOnly) return false
        if (!isGuest && item.guestOnly) return false
        return true
    })

    const getPriorityColor = (priority: string, isActive: boolean) => {
        if (isActive) return 'border-l-gray-400'

        switch (priority) {
            case 'danger':
                return 'border-l-red-500'
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
                return 'text-red-400'
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
            <div className="space-y-6">
                <PageHeader title="Settings" icon={<Cog6ToothIcon />} iconColor="text-gray-400" />
                {/* Main Content Area */}
                <div>
                    {/* Loading state */}
                    {isLoading ? (
                        <div className="py-16">
                            <PageLoader inline={true} message="Loading settings..." />
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
        </SubPageLayout>
    )
}

export default SettingsLayout

/**
 * SubHeader Component
 *
 * Navigation sub-header for user-specific pages (Collections, Liked, Hidden, Settings, Notifications)
 */

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
    UserIcon,
    PlayIcon,
    HeartIcon,
    BellIcon,
    Cog6ToothIcon,
    RectangleStackIcon,
    EyeSlashIcon,
} from '@heroicons/react/24/outline'
import {
    UserIcon as UserIconSolid,
    PlayIcon as PlayIconSolid,
    HeartIcon as HeartIconSolid,
    BellIcon as BellIconSolid,
    Cog6ToothIcon as Cog6ToothIconSolid,
    RectangleStackIcon as RectangleStackIconSolid,
    EyeSlashIcon as EyeSlashIconSolid,
} from '@heroicons/react/24/solid'
import { useSessionStore } from '../../stores/sessionStore'

interface NavItem {
    label: string
    href: string
    icon: React.ComponentType<{ className?: string }>
    iconSolid: React.ComponentType<{ className?: string }>
}

const navItems: NavItem[] = [
    {
        label: 'Profile',
        href: '/profile',
        icon: UserIcon,
        iconSolid: UserIconSolid,
    },
    {
        label: 'Continue Watching',
        href: '/continue-watching',
        icon: PlayIcon,
        iconSolid: PlayIconSolid,
    },
    {
        label: 'Watch List',
        href: '/watchlist',
        icon: HeartIcon,
        iconSolid: HeartIconSolid,
    },
    {
        label: 'Notification',
        href: '/notifications',
        icon: BellIcon,
        iconSolid: BellIconSolid,
    },
    {
        label: 'Settings',
        href: '/settings',
        icon: Cog6ToothIcon,
        iconSolid: Cog6ToothIconSolid,
    },
    {
        label: 'Collections',
        href: '/collections',
        icon: RectangleStackIcon,
        iconSolid: RectangleStackIconSolid,
    },
    {
        label: 'Hidden Content',
        href: '/hidden',
        icon: EyeSlashIcon,
        iconSolid: EyeSlashIconSolid,
    },
]

export default function SubHeader() {
    const pathname = usePathname()
    const sessionType = useSessionStore((state) => state.sessionType)

    // Get user's name from session store
    const userName = useSessionStore((state) => {
        if (state.sessionType === 'authenticated') {
            // Safely access nested properties
            const displayName = state.authStore?.userPreferences?.displayName
            return displayName || 'User'
        }
        return 'Guest'
    })

    return (
        <div className="w-full border-b border-gray-800 bg-gradient-to-b from-gray-900 to-black">
            {/* User greeting */}
            <div className="mx-auto max-w-7xl px-4 py-6">
                <h1 className="text-2xl font-semibold text-white">Hi, {userName}</h1>
            </div>

            {/* Navigation tabs */}
            <nav className="mx-auto max-w-7xl px-4" aria-label="User navigation">
                <div className="flex gap-8 overflow-x-auto scrollbar-hide">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href
                        const Icon = isActive ? item.iconSolid : item.icon

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`group relative flex items-center gap-2 whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
                                    isActive
                                        ? 'border-pink-500 text-pink-500'
                                        : 'border-transparent text-gray-400 hover:text-gray-200'
                                }`}
                            >
                                <Icon className="h-5 w-5" aria-hidden="true" />
                                <span>{item.label}</span>
                            </Link>
                        )
                    })}
                </div>
            </nav>
        </div>
    )
}

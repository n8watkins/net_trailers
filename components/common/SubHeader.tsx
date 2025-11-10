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
    ClockIcon,
    HeartIcon,
    BellIcon,
    Cog6ToothIcon,
    RectangleStackIcon,
    EyeSlashIcon,
} from '@heroicons/react/24/outline'
import {
    UserIcon as UserIconSolid,
    ClockIcon as ClockIconSolid,
    HeartIcon as HeartIconSolid,
    BellIcon as BellIconSolid,
    Cog6ToothIcon as Cog6ToothIconSolid,
    RectangleStackIcon as RectangleStackIconSolid,
    EyeSlashIcon as EyeSlashIconSolid,
} from '@heroicons/react/24/solid'
import { useSessionStore } from '../../stores/sessionStore'
import useAuth from '../../hooks/useAuth'

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
        label: 'Watch History',
        href: '/watch-history',
        icon: ClockIcon,
        iconSolid: ClockIconSolid,
    },
    {
        label: 'Collections',
        href: '/collections',
        icon: RectangleStackIcon,
        iconSolid: RectangleStackIconSolid,
    },
    {
        label: 'Liked Content',
        href: '/liked',
        icon: HeartIcon,
        iconSolid: HeartIconSolid,
    },
    {
        label: 'Hidden Content',
        href: '/hidden',
        icon: EyeSlashIcon,
        iconSolid: EyeSlashIconSolid,
    },
    {
        label: 'Notifications',
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
]

export default function SubHeader() {
    const pathname = usePathname()
    const { user } = useAuth()
    const sessionType = useSessionStore((state) => state.sessionType)

    // Get user's name - prioritize Firebase user displayName
    const userName = (() => {
        if (user?.displayName) {
            // Get first name from full name
            return user.displayName.split(' ')[0]
        }
        if (user?.email) {
            // Use email username as fallback
            return user.email.split('@')[0]
        }
        if (sessionType === 'guest') {
            return 'Guest'
        }
        return 'User'
    })()

    return (
        <div className="w-full border-b border-gray-800 bg-gradient-to-b from-gray-900 to-black pt-32">
            {/* Navigation tabs */}
            <nav className="mx-auto max-w-7xl px-4 py-4" aria-label="User navigation">
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
                                        ? 'border-red-600 text-red-600'
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

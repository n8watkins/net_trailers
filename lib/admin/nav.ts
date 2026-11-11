/**
 * The admin's sections and their tabs, in sidebar order. Each tab is its own
 * route, so the sidebar, the tab bar and a pasted link all land on the same page.
 */

import {
    Activity,
    Clapperboard,
    LayoutDashboard,
    type LucideIcon,
    Mail,
    Server,
    Timer,
    Users,
} from 'lucide-react'

export type AdminTab = { href: string; label: string }

export type AdminSection = {
    id: string
    href: string
    label: string
    icon: LucideIcon
    tabs?: AdminTab[]
}

export const ADMIN_SECTIONS: AdminSection[] = [
    { id: 'overview', href: '/admin', label: 'Overview', icon: LayoutDashboard },
    { id: 'users', href: '/admin/users', label: 'Users', icon: Users },
    {
        id: 'activity',
        href: '/admin/activity',
        label: 'Activity',
        icon: Activity,
        tabs: [
            { href: '/admin/activity', label: 'Logins' },
            { href: '/admin/activity/views', label: 'Page views' },
            { href: '/admin/activity/signups', label: 'Signups' },
        ],
    },
    {
        id: 'content',
        href: '/admin/content',
        label: 'Content and Rankings',
        icon: Clapperboard,
    },
    {
        id: 'email',
        href: '/admin/email',
        label: 'Email',
        icon: Mail,
        tabs: [
            { href: '/admin/email', label: 'Compose' },
            { href: '/admin/email/history', label: 'History' },
            { href: '/admin/email/usage', label: 'Usage' },
        ],
    },
    { id: 'jobs', href: '/admin/jobs', label: 'Jobs', icon: Timer },
    {
        id: 'system',
        href: '/admin/system',
        label: 'System',
        icon: Server,
        tabs: [
            { href: '/admin/system', label: 'Audit log' },
            { href: '/admin/system/config', label: 'Config' },
        ],
    },
]

/** The section a path belongs to (the longest matching href wins). */
export function sectionFor(pathname: string): AdminSection {
    return (
        [...ADMIN_SECTIONS]
            .sort((a, b) => b.href.length - a.href.length)
            .find((s) => pathname === s.href || pathname.startsWith(`${s.href}/`)) ??
        ADMIN_SECTIONS[0]
    )
}

/** Whether a tab is the current page (exact match: the first tab is the section's own path). */
export function isTabActive(pathname: string, tab: AdminTab): boolean {
    return pathname === tab.href
}

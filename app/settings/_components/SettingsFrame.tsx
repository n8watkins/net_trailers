'use client'

import React from 'react'
import type { Session } from 'next-auth'
import { usePathname } from 'next/navigation'
import {
    ShareIcon,
    UserCircleIcon,
    TrashIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    Cog6ToothIcon,
    BellIcon,
    RectangleStackIcon,
    SparklesIcon,
    ShieldCheckIcon,
} from '@heroicons/react/24/outline'
import Link from '@/components/common/Link'
import SubPageLayout from '@/components/layout/SubPageLayout'
import PageHeader from '@/components/layout/PageHeader'
import useAuth, { SeedSession } from '@/hooks/useAuth'
import {
    DEFAULT_SECTION,
    SETTINGS_SECTIONS,
    type SettingsSection,
    type SettingsSectionId,
} from './sections'
import { SettingsVisitorContext, type SettingsVisitor } from './settingsVisitor'

const ICONS: Record<SettingsSectionId, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
    profile: UserCircleIcon,
    'account-management': ShieldCheckIcon,
    preferences: Cog6ToothIcon,
    notifications: BellIcon,
    recommendations: SparklesIcon,
    collections: RectangleStackIcon,
    share: ShareIcon,
    account: TrashIcon,
}

/** The left border of an item that is not selected. */
const PRIORITY_BORDER: Record<SettingsSection['priority'], string> = {
    // A quiet gray, not red: red here reads as the active (brand) item
    danger: 'border-l-zinc-600',
    high: 'border-l-orange-500',
    medium: 'border-l-gray-500',
    low: 'border-l-zinc-700',
}

const PRIORITY_ICON: Record<SettingsSection['priority'], string> = {
    danger: 'text-gray-500',
    high: 'text-orange-500',
    medium: 'text-gray-500',
    low: 'text-gray-600',
}

interface SettingsFrameProps {
    /** The visitor's session as the server read it for this request (null when signed out). */
    initialSession: Session | null
    children: React.ReactNode
}

/**
 * The settings page around every section: title, section menu and the panel.
 * It renders on the server with the visitor's session already known, so a hard
 * load shows the whole frame at once; only a panel that needs the visitor's
 * data shows a skeleton while it loads.
 *
 * Phones show one thing at a time: `/settings` is the menu, and a section page
 * is its panel with a way back to the menu. Wide screens show the menu beside
 * the panel, with `/settings` showing the default section.
 */
export default function SettingsFrame({ initialSession, children }: SettingsFrameProps) {
    const pathname = usePathname()
    const { user, loading } = useAuth()
    // The server's answer until the client knows (it is the same answer: the
    // session is seeded below); after that, sign-in and sign-out show at once
    const serverUser = initialSession?.user ?? null
    const signedIn = loading ? Boolean(serverUser) : Boolean(user)
    const isIndex = pathname === '/settings'
    const name = loading ? (serverUser?.name ?? null) : (user?.displayName ?? null)
    const email = loading ? (serverUser?.email ?? null) : (user?.email ?? null)
    const image = loading ? (serverUser?.image ?? null) : (user?.photoURL ?? null)
    const visitor = React.useMemo<SettingsVisitor>(
        () => ({ signedIn, account: signedIn ? { name, email, image } : null }),
        [signedIn, name, email, image]
    )

    const sections = SETTINGS_SECTIONS.filter((s) => signedIn || !s.authenticatedOnly)

    return (
        <SubPageLayout hideHeader>
            <SeedSession session={initialSession} />
            <div className="space-y-6">
                <PageHeader title="Settings" icon={<Cog6ToothIcon />} iconColor="text-gray-400" />
                <div className="overflow-hidden rounded-xl border border-zinc-800/50 bg-zinc-900/60 backdrop-blur-lg">
                    <div className="flex flex-col lg:flex-row">
                        <div
                            className={`flex-shrink-0 border-zinc-800/50 lg:block lg:w-96 lg:border-r ${
                                isIndex ? 'block' : 'hidden'
                            }`}
                        >
                            <nav className="p-4 sm:p-6" aria-label="Settings sections">
                                <ul className="space-y-2">
                                    {sections.map((section) => (
                                        <SectionLink
                                            key={section.id}
                                            section={section}
                                            current={pathname === section.path}
                                            // `/settings` shows the default section beside the menu on wide screens only
                                            currentOnWide={
                                                isIndex && section.id === DEFAULT_SECTION
                                            }
                                        />
                                    ))}
                                </ul>
                            </nav>
                        </div>

                        <div className={`min-w-0 flex-1 lg:block ${isIndex ? 'hidden' : ''}`}>
                            {!isIndex && (
                                <Link
                                    href="/settings"
                                    className="mx-4 mt-4 inline-flex h-10 items-center gap-1 rounded-lg px-2 text-sm font-medium text-gray-300 transition-colors hover:bg-zinc-800/60 hover:text-white sm:mx-6 lg:hidden"
                                >
                                    <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
                                    All settings
                                </Link>
                            )}
                            <SettingsVisitorContext.Provider value={visitor}>
                                {children}
                            </SettingsVisitorContext.Provider>
                        </div>
                    </div>
                </div>
            </div>
        </SubPageLayout>
    )
}

function SectionLink({
    section,
    current,
    currentOnWide,
}: {
    section: SettingsSection
    current: boolean
    currentOnWide: boolean
}) {
    const Icon = ICONS[section.id]
    const box = current
        ? 'bg-zinc-800/80 border-l-gray-400 shadow-lg'
        : currentOnWide
          ? `bg-zinc-900/40 hover:bg-zinc-800/40 ${PRIORITY_BORDER[section.priority]} lg:bg-zinc-800/80 lg:border-l-gray-400 lg:shadow-lg`
          : `bg-zinc-900/40 hover:bg-zinc-800/40 ${PRIORITY_BORDER[section.priority]}`
    const icon = current
        ? 'text-gray-400'
        : currentOnWide
          ? `${PRIORITY_ICON[section.priority]} lg:text-gray-400`
          : PRIORITY_ICON[section.priority]
    const title = current
        ? 'text-white'
        : currentOnWide
          ? 'text-gray-300 lg:text-white'
          : 'text-gray-300'
    const chevron = current
        ? 'text-white'
        : currentOnWide
          ? 'text-gray-500 lg:text-white'
          : 'text-gray-500'

    return (
        <li>
            <Link
                href={section.path}
                aria-current={current ? 'page' : undefined}
                className={`flex w-full items-center rounded-lg border-l-4 p-4 transition-all duration-200 ${box}`}
            >
                <Icon className={`mr-4 h-6 w-6 flex-shrink-0 ${icon}`} aria-hidden="true" />
                <div className="min-w-0 flex-1">
                    <h3 className={`font-medium ${title}`}>{section.title}</h3>
                    <p className="mt-1 text-sm text-gray-500">{section.description}</p>
                </div>
                <ChevronRightIcon
                    className={`h-5 w-5 flex-shrink-0 ${chevron}`}
                    aria-hidden="true"
                />
            </Link>
        </li>
    )
}

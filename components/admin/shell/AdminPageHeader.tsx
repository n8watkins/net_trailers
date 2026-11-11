'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { isTabActive, sectionFor } from '@/lib/admin/nav'

import { cx } from './ui'

/** The page's title, one line of context, its actions, and the section's tabs. */
export function AdminPageHeader({
    title,
    lead,
    actions,
}: {
    title: string
    lead?: React.ReactNode
    actions?: React.ReactNode
}) {
    const pathname = usePathname() ?? '/admin'
    const section = sectionFor(pathname)
    return (
        <div className="mb-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div className="min-w-0">
                    <h1 className="text-2xl font-semibold tracking-tight text-white">{title}</h1>
                    {lead && <p className="mt-1 text-sm text-gray-400">{lead}</p>}
                </div>
                {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
            </div>
            {section.tabs && (
                <nav
                    aria-label={`${section.label} tabs`}
                    className="-mx-4 mt-4 overflow-x-auto px-4 sm:mx-0 sm:px-0"
                >
                    <ul className="flex min-w-max gap-1 border-b border-white/10">
                        {section.tabs.map((tab) => {
                            const active = isTabActive(pathname, tab)
                            return (
                                <li key={tab.href}>
                                    <Link
                                        href={tab.href}
                                        aria-current={active ? 'page' : undefined}
                                        className={cx(
                                            '-mb-px flex min-h-10 items-center border-b-2 px-3 text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-amber-400',
                                            active
                                                ? 'border-amber-400 text-amber-300'
                                                : 'border-transparent text-gray-400 hover:text-white'
                                        )}
                                    >
                                        {tab.label}
                                    </Link>
                                </li>
                            )
                        })}
                    </ul>
                </nav>
            )}
        </div>
    )
}

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { ArrowUpRight, ChevronsLeft, ChevronsRight, Home, Menu, X } from 'lucide-react'

import { ADMIN_SECTIONS, isTabActive, sectionFor } from '@/lib/admin/nav'

const COLLAPSED_KEY = 'nettrailers-admin-sidebar-collapsed'

function NavList({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
    const pathname = usePathname() ?? '/admin'
    const current = sectionFor(pathname)
    return (
        <ul className="space-y-1">
            {ADMIN_SECTIONS.map((section) => {
                const active = section.id === current.id
                const Icon = section.icon
                return (
                    <li key={section.id}>
                        <Link
                            href={section.href}
                            onClick={onNavigate}
                            aria-current={active && pathname === section.href ? 'page' : undefined}
                            title={collapsed ? section.label : undefined}
                            data-active={active || undefined}
                            className={`group flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 ${
                                active
                                    ? 'bg-amber-500/15 text-amber-300'
                                    : 'text-gray-300 hover:bg-white/5 hover:text-white'
                            } ${collapsed ? 'justify-center px-0' : ''}`}
                        >
                            <Icon
                                aria-hidden
                                className={`size-[18px] shrink-0 ${active ? 'text-amber-400' : 'text-gray-400 group-hover:text-gray-200'}`}
                            />
                            <span className={collapsed ? 'sr-only' : 'truncate'}>
                                {section.label}
                            </span>
                        </Link>
                        {section.tabs && !collapsed && (
                            <ul className="mt-0.5 mb-1 ml-[1.375rem] space-y-0.5 border-l border-white/10 pl-3">
                                {section.tabs.map((tab) => {
                                    const tabActive = isTabActive(pathname, tab)
                                    return (
                                        <li key={tab.href}>
                                            <Link
                                                href={tab.href}
                                                onClick={onNavigate}
                                                aria-current={tabActive ? 'page' : undefined}
                                                className={`flex min-h-8 items-center rounded-md px-2 text-[13px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-amber-400 ${
                                                    tabActive
                                                        ? 'font-medium text-amber-300'
                                                        : 'text-gray-400 hover:text-white'
                                                }`}
                                            >
                                                {tab.label}
                                            </Link>
                                        </li>
                                    )
                                })}
                            </ul>
                        )}
                    </li>
                )
            })}
        </ul>
    )
}

function Footer({ email, collapsed }: { email: string | null; collapsed: boolean }) {
    const link =
        'flex min-h-9 items-center gap-2 rounded-lg px-3 text-[13px] text-gray-400 hover:bg-white/5 hover:text-white focus-visible:outline-2 focus-visible:outline-amber-400'
    return (
        <div className="space-y-1 border-t border-white/10 pt-3">
            <Link
                href="/"
                className={`${link} ${collapsed ? 'justify-center px-0' : ''}`}
                title="Back to NetTrailers"
            >
                <Home aria-hidden className="size-4 shrink-0" />
                <span className={collapsed ? 'sr-only' : ''}>Back to the site</span>
            </Link>
            <a
                href="https://admin.n8builds.dev"
                target="_blank"
                rel="noreferrer"
                className={`${link} ${collapsed ? 'justify-center px-0' : ''}`}
                title="All apps on admin.n8builds.dev (new tab)"
            >
                <ArrowUpRight aria-hidden className="size-4 shrink-0" />
                <span className={collapsed ? 'sr-only' : ''}>All apps</span>
            </a>
            {email && !collapsed && (
                <p className="truncate px-3 pt-1 text-xs text-gray-500" title={email}>
                    {email}
                </p>
            )}
        </div>
    )
}

/**
 * The admin's navigation: a left sidebar from `lg` up (collapsible to icons,
 * remembered per browser) and a top bar with a drawer on smaller screens.
 */
export function AdminSidebar({ email }: { email: string | null }) {
    const pathname = usePathname() ?? '/admin'
    const [collapsed, setCollapsed] = useState(false)
    const [open, setOpen] = useState(false)
    const menuButton = useRef<HTMLButtonElement>(null)
    const drawer = useRef<HTMLDivElement>(null)

    useEffect(() => {
        try {
            setCollapsed(localStorage.getItem(COLLAPSED_KEY) === '1')
        } catch {
            // Storage blocked: start expanded.
        }
    }, [])

    const toggleCollapsed = () => {
        setCollapsed((was) => {
            try {
                localStorage.setItem(COLLAPSED_KEY, was ? '0' : '1')
            } catch {
                // Not remembered; still toggles.
            }
            return !was
        })
    }

    // The drawer: Escape closes it, focus moves in and back, the page behind does not scroll.
    useEffect(() => {
        if (!open) return
        const previous = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        drawer.current?.querySelector<HTMLElement>('a,button')?.focus()
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setOpen(false)
            if (event.key === 'Tab' && drawer.current) {
                const items = drawer.current.querySelectorAll<HTMLElement>('a,button')
                const first = items[0]
                const last = items[items.length - 1]
                if (event.shiftKey && document.activeElement === first) {
                    event.preventDefault()
                    last.focus()
                } else if (!event.shiftKey && document.activeElement === last) {
                    event.preventDefault()
                    first.focus()
                }
            }
        }
        document.addEventListener('keydown', onKey)
        const button = menuButton.current
        return () => {
            document.body.style.overflow = previous
            document.removeEventListener('keydown', onKey)
            button?.focus()
        }
    }, [open])

    const current = sectionFor(pathname)

    return (
        <>
            {/* Phone and tablet: a top bar with the current section and a menu button */}
            <div className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-white/10 bg-[#0a0a0a]/95 px-4 backdrop-blur lg:hidden">
                <button
                    ref={menuButton}
                    type="button"
                    onClick={() => setOpen(true)}
                    aria-label="Open the admin menu"
                    aria-expanded={open}
                    aria-controls="admin-drawer"
                    className="-ml-2 grid size-10 place-items-center rounded-lg text-gray-200 hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-amber-400"
                >
                    <Menu aria-hidden className="size-5" />
                </button>
                <span className="truncate text-sm font-semibold text-white">
                    <span className="text-amber-400">Admin</span> · {current.label}
                </span>
            </div>
            {open && (
                <div className="fixed inset-0 z-50 lg:hidden">
                    <div
                        className="absolute inset-0 bg-black/70"
                        onClick={() => setOpen(false)}
                        aria-hidden
                    />
                    <div
                        id="admin-drawer"
                        ref={drawer}
                        role="dialog"
                        aria-modal="true"
                        aria-label="Admin menu"
                        className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col gap-4 overflow-y-auto border-r border-white/10 bg-[#111] p-4"
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-base font-semibold text-white">
                                NetTrailers <span className="text-amber-400">admin</span>
                            </span>
                            <button
                                type="button"
                                onClick={() => setOpen(false)}
                                aria-label="Close the admin menu"
                                className="grid size-10 place-items-center rounded-lg text-gray-300 hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-amber-400"
                            >
                                <X aria-hidden className="size-5" />
                            </button>
                        </div>
                        <nav aria-label="Admin" className="flex-1">
                            <NavList collapsed={false} onNavigate={() => setOpen(false)} />
                        </nav>
                        <Footer email={email} collapsed={false} />
                    </div>
                </div>
            )}

            {/* Desktop: the sidebar */}
            <aside
                className={`sticky top-0 hidden h-dvh shrink-0 flex-col gap-4 border-r border-white/10 bg-[#0d0d0d] p-3 transition-[width] lg:flex ${
                    collapsed ? 'w-16' : 'w-60'
                }`}
            >
                <div
                    className={`flex min-h-10 items-center ${collapsed ? 'justify-center' : 'justify-between pl-3'}`}
                >
                    {!collapsed && (
                        <Link href="/admin" className="truncate text-base font-semibold text-white">
                            NetTrailers <span className="text-amber-400">admin</span>
                        </Link>
                    )}
                    <button
                        type="button"
                        onClick={toggleCollapsed}
                        aria-label={collapsed ? 'Expand the sidebar' : 'Collapse the sidebar'}
                        aria-pressed={collapsed}
                        className="grid size-9 place-items-center rounded-lg text-gray-400 hover:bg-white/5 hover:text-white focus-visible:outline-2 focus-visible:outline-amber-400"
                    >
                        {collapsed ? (
                            <ChevronsRight aria-hidden className="size-4" />
                        ) : (
                            <ChevronsLeft aria-hidden className="size-4" />
                        )}
                    </button>
                </div>
                <nav aria-label="Admin" className="flex-1 overflow-y-auto">
                    <NavList collapsed={collapsed} />
                </nav>
                <Footer email={email} collapsed={collapsed} />
            </aside>
        </>
    )
}

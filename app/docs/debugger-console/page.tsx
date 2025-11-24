'use client'

import { useState } from 'react'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline'

export default function DebugDocumentation() {
    // Only render in development mode
    if (process.env.NODE_ENV !== 'development') {
        redirect('/')
    }

    const [expandedCategories, setExpandedCategories] = useState({
        firebase: true,
        ui: true,
        features: true,
    })

    const toggleCategory = (category: 'firebase' | 'ui' | 'features') => {
        setExpandedCategories((prev) => ({ ...prev, [category]: !prev[category] }))
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-black text-gray-100">
            <div className="max-w-5xl mx-auto px-4 py-12">
                {/* Header */}
                <div className="mb-12">
                    <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
                        Debug Console Documentation
                    </h1>
                    <p className="text-gray-400 text-lg">
                        Complete reference for NetTrailer&apos;s development debug console
                    </p>
                </div>

                {/* Quick Start */}
                <section className="mb-12 bg-gray-800/50 rounded-lg p-6 border border-gray-700">
                    <h2 className="text-2xl font-semibold mb-4 text-blue-400">Quick Start</h2>
                    <div className="space-y-3 text-gray-300">
                        <p>
                            The debug console is a draggable control panel that provides real-time
                            visibility into various system behaviors during development.
                        </p>
                        <div className="bg-gray-900/50 rounded p-4 border border-gray-700">
                            <div className="flex items-center gap-2 mb-2">
                                <kbd className="px-2 py-1 bg-gray-700 rounded text-sm border border-gray-600">
                                    Alt
                                </kbd>
                                <span className="text-gray-500">+</span>
                                <kbd className="px-2 py-1 bg-gray-700 rounded text-sm border border-gray-600">
                                    Shift
                                </kbd>
                                <span className="text-gray-500">+</span>
                                <kbd className="px-2 py-1 bg-gray-700 rounded text-sm border border-gray-600">
                                    D
                                </kbd>
                                <span className="text-gray-400 ml-4">
                                    Toggle debug console visibility
                                </span>
                            </div>
                        </div>
                        <ul className="list-disc list-inside space-y-1 text-sm text-gray-400 ml-4">
                            <li>Drag the bug icon to reposition the console</li>
                            <li>Hover over the console to expand all options</li>
                            <li>Click category headers to expand/collapse sections</li>
                            <li>Enabled toggles remain visible when not hovering</li>
                            <li>Settings persist across browser sessions</li>
                            <li className="text-blue-400 font-medium">
                                Click any debug option below for detailed documentation →
                            </li>
                        </ul>
                    </div>
                </section>

                {/* Firebase & Data Category */}
                <section className="mb-6">
                    <button
                        onClick={() => toggleCategory('firebase')}
                        className="flex items-center gap-3 mb-4 w-full text-left group"
                    >
                        <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center border border-orange-500/30">
                            <span className="text-orange-500 text-xl">🔥</span>
                        </div>
                        <h2 className="text-2xl font-semibold text-orange-400 group-hover:text-orange-300 transition-colors flex-1">
                            Firebase &amp; Data
                        </h2>
                        {expandedCategories.firebase ? (
                            <ChevronDownIcon className="w-6 h-6 text-gray-500" />
                        ) : (
                            <ChevronRightIcon className="w-6 h-6 text-gray-500" />
                        )}
                    </button>

                    {expandedCategories.firebase && (
                        <div className="grid gap-4">
                            <DebugOption
                                slug="tracker"
                                name="Tracker"
                                description="Shows a floating overlay tracking all Firebase operations (reads, writes, deletes) with detailed call stacks, timing, and data size."
                                color="orange"
                            />
                            <DebugOption
                                slug="auth"
                                name="Auth"
                                description="Logs Firebase authentication flow events including sign-in, sign-out, token refresh, and user state changes."
                                color="blue"
                            />
                            <DebugOption
                                slug="session"
                                name="Session"
                                description="Logs session management events including initialization, user switching, and session persistence to localStorage."
                                color="purple"
                            />
                            <DebugOption
                                slug="guest"
                                name="Guest"
                                description="Logs guest mode operations including localStorage reads/writes and guest ID generation."
                                color="teal"
                            />
                            <DebugOption
                                slug="cache"
                                name="Cache"
                                description="Logs content caching operations including cache hits, misses, invalidation, and cache size management."
                                color="cyan"
                            />
                            <DebugOption
                                slug="watch-history"
                                name="Watch History"
                                description="Logs watch history tracking operations and Firestore synchronization events for user viewing data."
                                color="sky"
                            />
                        </div>
                    )}
                </section>

                {/* UI & Interaction Category */}
                <section className="mb-6">
                    <button
                        onClick={() => toggleCategory('ui')}
                        className="flex items-center gap-3 mb-4 w-full text-left group"
                    >
                        <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                            <span className="text-blue-500 text-xl">💬</span>
                        </div>
                        <h2 className="text-2xl font-semibold text-blue-400 group-hover:text-blue-300 transition-colors flex-1">
                            UI &amp; Interaction
                        </h2>
                        {expandedCategories.ui ? (
                            <ChevronDownIcon className="w-6 h-6 text-gray-500" />
                        ) : (
                            <ChevronRightIcon className="w-6 h-6 text-gray-500" />
                        )}
                    </button>

                    {expandedCategories.ui && (
                        <div className="grid gap-4">
                            <DebugOption
                                slug="toast-tester"
                                name="Toast Test"
                                description="Shows 'Test Toasts' button in the header to trigger all toast notification types for testing."
                                color="green"
                            />
                            <DebugOption
                                slug="api-results"
                                name="API Results"
                                description="Adds a button to view raw API response data for debugging TMDB API calls and data structure."
                                color="purple"
                            />
                            <DebugOption
                                slug="vitals"
                                name="Vitals"
                                description="Displays a real-time Web Vitals HUD showing performance metrics (LCP, FID, CLS, TTFB, FCP, INP)."
                                color="emerald"
                                keyboardShortcut="Alt+Shift+V"
                            />
                            <DebugOption
                                slug="ui-logs"
                                name="UI Logs"
                                description="Logs UI interaction events including modal open/close, infinite scroll triggers, carousel navigation, and component mount/unmount."
                                color="indigo"
                            />
                            <DebugOption
                                slug="api-server"
                                name="API/Server"
                                description="Logs API route execution, server-side operations, and internal API call timing and responses."
                                color="amber"
                            />
                            <DebugOption
                                slug="next-server"
                                name="Next.js Server"
                                description="Controls Next.js development server request logging. Shows all incoming requests, route handlers, and static file serving."
                                color="slate"
                                note="Requires dev server restart to take effect"
                            />
                            <DebugOption
                                slug="banner"
                                name="Banner"
                                description="Logs banner carousel behavior including image loading, slide transitions, and auto-play timing."
                                color="rose"
                            />
                        </div>
                    )}
                </section>

                {/* Features & Tools Category */}
                <section className="mb-6">
                    <button
                        onClick={() => toggleCategory('features')}
                        className="flex items-center gap-3 mb-4 w-full text-left group"
                    >
                        <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center border border-purple-500/30">
                            <span className="text-purple-500 text-xl">✨</span>
                        </div>
                        <h2 className="text-2xl font-semibold text-purple-400 group-hover:text-purple-300 transition-colors flex-1">
                            Features &amp; Tools
                        </h2>
                        {expandedCategories.features ? (
                            <ChevronDownIcon className="w-6 h-6 text-gray-500" />
                        ) : (
                            <ChevronRightIcon className="w-6 h-6 text-gray-500" />
                        )}
                    </button>

                    {expandedCategories.features && (
                        <div className="grid gap-4">
                            <DebugOption
                                slug="tracking"
                                name="Tracking"
                                description="Logs user interaction tracking events (views, likes, watchlist operations) and the 90-day retention system."
                                color="yellow"
                            />
                            <DebugOption
                                slug="notifications"
                                name="Notif"
                                description="Logs notification system operations including Firestore listeners, real-time updates, and notification creation/dismissal."
                                color="pink"
                            />
                            <DebugOption
                                slug="notif-tester"
                                name="Notif Test"
                                description="Shows 'Generate Test Notifications' button in settings to create fake trending notifications for testing."
                                color="red"
                            />
                            <DebugOption
                                slug="child-safety"
                                name="Child Safety"
                                description="Logs child safety mode filtering operations including TMDB rating checks and content filtering decisions."
                                color="violet"
                            />
                        </div>
                    )}
                </section>

                {/* Data Actions Section */}
                <section className="mb-12 bg-gray-800/50 rounded-lg p-6 border border-gray-700">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                            <span className="text-emerald-500 text-xl">💾</span>
                        </div>
                        <h2 className="text-2xl font-semibold text-emerald-400">Data Actions</h2>
                    </div>
                    <p className="text-gray-400 mb-6">
                        Utility actions for managing test data and storage during development.
                        Always visible when hovering over the debug console.
                    </p>
                    <div className="grid gap-4">
                        <DataAction
                            name="Seed Data"
                            description="Populates test data including 15 liked items, 8 hidden, 12 watch later, 20 watch history entries, and 8 collections. Useful for quickly setting up a realistic user state for testing."
                            color="purple"
                            icon="✨"
                        />
                        <DataAction
                            name="Clear Storage"
                            description="Clears all NetTrailer localStorage data (keys starting with 'nettrailer') and reloads the page. Useful for testing fresh user states and resetting local data."
                            color="amber"
                            icon="🗑️"
                            note="Requires confirmation before executing"
                        />
                        <DataAction
                            name="Delete Data"
                            description="Permanently deletes all user data including collections, ratings, and watch history from Firestore. This is a destructive action used for testing data deletion flows."
                            color="red"
                            icon="⚠️"
                            note="Requires confirmation and is irreversible"
                        />
                    </div>
                </section>

                {/* Technical Details */}
                <section className="mb-12 bg-gray-800/50 rounded-lg p-6 border border-gray-700">
                    <h2 className="text-2xl font-semibold mb-4 text-gray-100">Technical Details</h2>
                    <div className="space-y-4 text-gray-300 text-sm">
                        <div>
                            <h3 className="font-semibold text-gray-200 mb-2">Persistence</h3>
                            <p className="text-gray-400">
                                All debug settings, console position, visibility state, and category
                                expand/collapse states are saved to localStorage and persist across
                                browser sessions.
                            </p>
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-200 mb-2">
                                Integration with Components
                            </h3>
                            <p className="text-gray-400">
                                Use the{' '}
                                <code className="bg-gray-900 px-1 py-0.5 rounded">
                                    useDebugSettings()
                                </code>{' '}
                                hook to access debug settings in any component and conditionally
                                render debug UI or logs.
                            </p>
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-200 mb-2">Event System</h3>
                            <p className="text-gray-400">
                                Debug settings changes are broadcast via custom{' '}
                                <code className="bg-gray-900 px-1 py-0.5 rounded">
                                    debugSettingsChanged
                                </code>{' '}
                                events, allowing multiple components to react to setting changes in
                                real-time.
                            </p>
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-200 mb-2">Production Safety</h3>
                            <p className="text-gray-400">
                                The debug console and all debugging features are automatically
                                disabled in production builds via NODE_ENV checks. This
                                documentation page also redirects to home in production.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Best Practices */}
                <section className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
                    <h2 className="text-2xl font-semibold mb-4 text-gray-100">Best Practices</h2>
                    <ul className="space-y-3 text-gray-300">
                        <li className="flex gap-3">
                            <span className="text-green-500 flex-shrink-0">✓</span>
                            <span>
                                Enable only the debug options you need to reduce console noise
                            </span>
                        </li>
                        <li className="flex gap-3">
                            <span className="text-green-500 flex-shrink-0">✓</span>
                            <span>
                                Use the Firebase Tracker to identify performance bottlenecks and
                                excessive database reads
                            </span>
                        </li>
                        <li className="flex gap-3">
                            <span className="text-green-500 flex-shrink-0">✓</span>
                            <span>
                                Enable Web Vitals during UI development to ensure optimal
                                performance
                            </span>
                        </li>
                        <li className="flex gap-3">
                            <span className="text-green-500 flex-shrink-0">✓</span>
                            <span>
                                Use the Seed Button to quickly populate test data for development
                            </span>
                        </li>
                        <li className="flex gap-3">
                            <span className="text-yellow-500 flex-shrink-0">!</span>
                            <span>
                                Remember to restart the dev server after changing the Next.js Server
                                Logs setting
                            </span>
                        </li>
                    </ul>
                </section>
            </div>
        </div>
    )
}

// Reusable component for debug option documentation
function DebugOption({
    slug,
    name,
    description,
    color,
    keyboardShortcut,
    note,
}: {
    slug: string
    name: string
    description: string
    color: string
    keyboardShortcut?: string
    note?: string
}) {
    const colorClasses = {
        orange: 'border-l-orange-500',
        blue: 'border-l-blue-500',
        purple: 'border-l-purple-500',
        teal: 'border-l-teal-500',
        cyan: 'border-l-cyan-500',
        sky: 'border-l-sky-500',
        green: 'border-l-green-500',
        emerald: 'border-l-emerald-500',
        indigo: 'border-l-indigo-500',
        amber: 'border-l-amber-500',
        slate: 'border-l-slate-500',
        rose: 'border-l-rose-500',
        yellow: 'border-l-yellow-500',
        pink: 'border-l-pink-500',
        red: 'border-l-red-500',
        violet: 'border-l-violet-500',
    }[color]

    return (
        <Link
            href={`/docs/debugger-console/details/${slug}`}
            className={`bg-gray-800/30 rounded-lg p-4 border border-gray-700 border-l-4 ${colorClasses} hover:border-gray-600 hover:bg-gray-800/50 transition-all cursor-pointer group block`}
        >
            <h3 className="text-lg font-semibold text-gray-100 group-hover:text-white transition-colors mb-2">
                {name} <span className="text-gray-500 group-hover:text-gray-400">→</span>
            </h3>
            <p className="text-gray-400 text-sm group-hover:text-gray-300 transition-colors">
                {description}
            </p>
            {keyboardShortcut && (
                <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-gray-500">Shortcut:</span>
                    <kbd className="px-2 py-0.5 bg-gray-700 rounded text-xs border border-gray-600 text-gray-300">
                        {keyboardShortcut}
                    </kbd>
                </div>
            )}
            {note && (
                <div className="mt-2 text-xs text-yellow-500/80 flex items-start gap-1">
                    <span>⚠</span>
                    <span>{note}</span>
                </div>
            )}
        </Link>
    )
}

// Component for data action documentation (non-clickable)
function DataAction({
    name,
    description,
    color,
    icon,
    note,
}: {
    name: string
    description: string
    color: string
    icon: string
    note?: string
}) {
    const colorClasses = {
        purple: 'bg-purple-500/10 border-purple-500/30',
        amber: 'bg-amber-500/10 border-amber-500/30',
        red: 'bg-red-500/10 border-red-500/30',
    }[color]

    const iconColorClasses = {
        purple: 'text-purple-400',
        amber: 'text-amber-400',
        red: 'text-red-400',
    }[color]

    return (
        <div className={`rounded-lg p-4 border ${colorClasses}`}>
            <div className="flex items-start gap-3 mb-2">
                <span className={`text-2xl ${iconColorClasses}`}>{icon}</span>
                <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-100">{name}</h3>
                </div>
            </div>
            <p className="text-gray-400 text-sm">{description}</p>
            {note && (
                <div className="mt-2 text-xs text-yellow-500/80 flex items-start gap-1">
                    <span>⚠</span>
                    <span>{note}</span>
                </div>
            )}
        </div>
    )
}

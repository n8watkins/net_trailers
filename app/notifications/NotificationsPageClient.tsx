'use client'

import { useEffect, useMemo, useState, useRef } from 'react'
import { BellIcon, CheckIcon } from '@heroicons/react/24/outline'
import {
    Cog6ToothIcon,
    ChevronDownIcon,
    TrashIcon,
    MagnifyingGlassIcon,
} from '@heroicons/react/24/solid'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { useNotificationStore } from '../../stores/notificationStore'
import { useSessionStore } from '../../stores/sessionStore'
import NotificationItem from '../../components/notifications/NotificationItem'
import SubPageLayout from '../../components/layout/SubPageLayout'
import NetflixLoader from '../../components/common/NetflixLoader'
import { useRouter } from 'next/navigation'

export default function NotificationsPageClient() {
    const router = useRouter()
    const getUserId = useSessionStore((state) => state.getUserId)
    const sessionType = useSessionStore((state) => state.sessionType)
    const isInitialized = useSessionStore((state) => state.isInitialized)
    const userId = getUserId()
    const isGuest = sessionType === 'guest'
    const [showManageDropdown, setShowManageDropdown] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const manageDropdownRef = useRef<HTMLDivElement>(null)
    const {
        notifications: rawNotifications,
        unreadCount,
        isLoading: isLoadingNotifications,
        subscribe,
        unsubscribeFromNotifications,
        markAllNotificationsAsRead,
    } = useNotificationStore()

    // Deduplicate notifications by ID (in case of duplicates in Firestore)
    const notifications = useMemo(() => {
        const seen = new Set<string>()
        return rawNotifications.filter((n) => {
            if (seen.has(n.id)) return false
            seen.add(n.id)
            return true
        })
    }, [rawNotifications])

    // Filter notifications by search query
    const filteredNotifications = useMemo(() => {
        if (!searchQuery.trim()) return notifications
        const query = searchQuery.toLowerCase()
        return notifications.filter(
            (n) =>
                n.title?.toLowerCase().includes(query) || n.message?.toLowerCase().includes(query)
        )
    }, [notifications, searchQuery])

    // Show loading state while initializing or loading notifications
    const isLoading = !isInitialized || isLoadingNotifications

    // Subscribe to real-time notifications
    useEffect(() => {
        if (userId && !isGuest) {
            subscribe(userId)
        } else {
            unsubscribeFromNotifications()
        }

        return () => {
            unsubscribeFromNotifications()
        }
    }, [userId, isGuest, subscribe, unsubscribeFromNotifications])

    // Handle click outside to close dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                manageDropdownRef.current &&
                !manageDropdownRef.current.contains(event.target as Node)
            ) {
                setShowManageDropdown(false)
            }
        }

        if (showManageDropdown) {
            document.addEventListener('mousedown', handleClickOutside)
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [showManageDropdown])

    const handleMarkAllAsRead = async () => {
        if (!userId || isGuest) return
        await markAllNotificationsAsRead(userId)
    }

    return (
        <SubPageLayout hideHeader>
            <div className="relative -mt-20 -mx-6 sm:-mx-8 lg:-mx-12">
                {/* Atmospheric Background */}
                <div className="fixed inset-0 pointer-events-none">
                    <div className="absolute inset-0 bg-black" />
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[800px] bg-gradient-radial from-red-900/20 via-transparent to-transparent opacity-50" />
                    <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-black opacity-60" />
                </div>

                {/* Content Container */}
                <div className="relative z-10">
                    {/* Cinematic Hero Header */}
                    <div className="relative overflow-hidden pt-4">
                        {/* Animated Background Gradients */}
                        <div className="absolute inset-0 bg-gradient-to-br from-black via-zinc-900/80 to-black" />
                        <div
                            className="absolute inset-0 bg-gradient-to-t from-red-900/20 via-rose-900/10 to-black/50 animate-pulse"
                            style={{ animationDuration: '4s' }}
                        />
                        <div className="absolute inset-0 bg-gradient-radial from-red-500/10 via-red-900/5 to-transparent" />

                        {/* Soft edge vignetting for subtle blending */}
                        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/80" />
                        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-black/60" />

                        {/* Hero Content */}
                        <div className="relative z-10 flex flex-col items-center justify-start px-6 pt-8 pb-6">
                            {/* Bell Icon with glow */}
                            <div className="relative mb-4">
                                <div className="absolute inset-0 bg-red-500/30 blur-2xl scale-150" />
                                <BellIcon className="relative w-16 h-16 text-red-400 drop-shadow-[0_0_20px_rgba(239,68,68,0.5)]" />
                            </div>

                            {/* Title */}
                            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-2 text-center tracking-tight">
                                <span className="bg-gradient-to-r from-red-200 via-rose-100 to-red-200 bg-clip-text text-transparent drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]">
                                    Notifications
                                </span>
                            </h1>

                            {/* Subtitle with unread count */}
                            <p className="text-base sm:text-lg text-gray-300 mb-6 text-center max-w-2xl">
                                Stay updated with your personalized notifications
                                {!isLoading && !isGuest && unreadCount > 0 && (
                                    <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-red-500/20 text-red-400 border border-red-500/30">
                                        {unreadCount} unread
                                    </span>
                                )}
                            </p>

                            {/* Action Buttons Row */}
                            {!isLoading && !isGuest && (
                                <div className="flex flex-col sm:flex-row gap-4 items-center justify-center w-full max-w-3xl mb-5 px-4">
                                    {/* Left spacer for centering on desktop */}
                                    <div className="hidden sm:block flex-1" />

                                    {/* Action Buttons */}
                                    <div className="flex gap-2 items-center">
                                        {/* Mark all read button */}
                                        <button
                                            onClick={handleMarkAllAsRead}
                                            disabled={unreadCount === 0}
                                            className={`group relative rounded-full px-5 py-2.5 text-sm font-bold transition-all duration-300 backdrop-blur-md border flex items-center gap-2 ${
                                                unreadCount > 0
                                                    ? 'bg-zinc-900/40 text-gray-300 border-zinc-700/50 hover:bg-green-600/30 hover:border-green-500 hover:scale-105 hover:shadow-[0_0_10px_rgba(34,197,94,0.2)]'
                                                    : 'bg-zinc-900/20 text-gray-500 border-zinc-800/50 cursor-not-allowed'
                                            }`}
                                        >
                                            <CheckIcon className="w-4 h-4 text-green-400" />
                                            <span>Mark all read</span>
                                        </button>

                                        {/* Manage dropdown */}
                                        <div className="relative" ref={manageDropdownRef}>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setShowManageDropdown(!showManageDropdown)
                                                }
                                                className="group relative rounded-full px-5 py-2.5 text-sm font-bold transition-all duration-300 backdrop-blur-md border flex items-center gap-2 bg-zinc-900/40 text-gray-300 border-zinc-700/50 hover:bg-zinc-800/60 hover:border-zinc-600 hover:scale-105 hover:shadow-[0_0_8px_rgba(255,255,255,0.08)]"
                                            >
                                                <Cog6ToothIcon className="w-4 h-4 text-gray-400" />
                                                <span>Manage</span>
                                                <ChevronDownIcon
                                                    className={`w-4 h-4 transition-transform ${
                                                        showManageDropdown ? 'rotate-180' : ''
                                                    }`}
                                                />
                                            </button>

                                            {/* Dropdown Menu */}
                                            {showManageDropdown && (
                                                <div className="absolute top-full mt-2 right-0 bg-zinc-900/95 backdrop-blur-lg border border-zinc-700/50 rounded-xl shadow-2xl z-50 min-w-[200px] overflow-hidden">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            router.push('/settings/notifications')
                                                            setShowManageDropdown(false)
                                                        }}
                                                        className="w-full flex items-center gap-3 px-4 py-3 text-white hover:bg-zinc-800/80 transition-colors"
                                                    >
                                                        <Cog6ToothIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                                                        <span>Settings</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            router.push('/settings/account')
                                                            setShowManageDropdown(false)
                                                        }}
                                                        className="w-full flex items-center gap-3 px-4 py-3 text-white hover:bg-zinc-800/80 transition-colors"
                                                    >
                                                        <TrashIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                                                        <span>Clear Data</span>
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Right spacer for centering on desktop */}
                                    <div className="hidden sm:block flex-1" />
                                </div>
                            )}

                            {/* Enhanced Search Bar */}
                            {!isLoading && !isGuest && notifications.length > 0 && (
                                <div className="w-full max-w-2xl relative">
                                    <div className="relative group">
                                        <MagnifyingGlassIcon className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400 z-10 transition-colors group-focus-within:text-red-400" />
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="Search notifications..."
                                            className="w-full pl-14 pr-14 py-4 bg-zinc-900/40 backdrop-blur-lg border border-zinc-800/50 rounded-2xl text-white text-lg placeholder-gray-500 focus:outline-none focus:border-red-500 focus:shadow-[0_0_25px_rgba(239,68,68,0.3)] transition-all duration-300 hover:bg-zinc-900/60 hover:border-zinc-700"
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
                                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-red-500 to-rose-500 opacity-0 group-focus-within:opacity-20 blur-xl transition-opacity duration-300 -z-10" />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Main Content Area */}
                    <div className="px-6 sm:px-8 lg:px-12 py-8">
                        <div className="max-w-2xl mx-auto space-y-6">
                            {/* Loading state */}
                            {isLoading && (
                                <div className="py-16">
                                    <NetflixLoader
                                        inline={true}
                                        message="Loading notifications..."
                                    />
                                </div>
                            )}

                            {/* Guest state */}
                            {!isLoading && isGuest && (
                                <div className="flex flex-col items-center justify-center py-20 text-center">
                                    <div className="relative mb-6">
                                        <div className="absolute inset-0 bg-red-500/20 blur-2xl scale-150" />
                                        <div className="relative w-24 h-24 rounded-full bg-zinc-900/60 backdrop-blur-lg flex items-center justify-center border-2 border-zinc-800/50">
                                            <span className="text-5xl">🔒</span>
                                        </div>
                                    </div>
                                    <h3 className="text-2xl font-bold text-white mb-3">
                                        Sign in to view notifications
                                    </h3>
                                    <p className="text-gray-400 mb-8 max-w-md text-lg">
                                        Guest sessions keep notifications on this device only.
                                        Create a free account to sync alerts everywhere.
                                    </p>
                                    <button
                                        onClick={() => router.push('/auth')}
                                        className="group relative px-8 py-4 font-bold rounded-xl transition-all duration-300 bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white shadow-[0_0_30px_rgba(239,68,68,0.4)] hover:shadow-[0_0_40px_rgba(239,68,68,0.6)] scale-100 hover:scale-105"
                                    >
                                        Create Account
                                    </button>
                                </div>
                            )}

                            {/* Empty state */}
                            {!isLoading && !isGuest && filteredNotifications.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-20 text-center">
                                    <div className="relative mb-6">
                                        <div className="absolute inset-0 bg-red-500/20 blur-2xl scale-150" />
                                        <div className="relative w-24 h-24 rounded-full bg-zinc-900/60 backdrop-blur-lg flex items-center justify-center border-2 border-zinc-800/50">
                                            <BellIcon className="w-12 h-12 text-red-500" />
                                        </div>
                                    </div>
                                    <h3 className="text-2xl font-bold text-white mb-3">
                                        {searchQuery
                                            ? 'No notifications match your search'
                                            : 'No notifications yet'}
                                    </h3>
                                    <p className="text-gray-400 mb-8 max-w-md text-lg">
                                        {searchQuery
                                            ? 'Try a different search term'
                                            : "You're all caught up!"}
                                    </p>
                                </div>
                            )}

                            {/* Notifications list */}
                            {!isLoading && !isGuest && filteredNotifications.length > 0 && (
                                <div className="space-y-0 overflow-hidden rounded-xl border border-zinc-800/50 bg-zinc-900/40 backdrop-blur-lg">
                                    {filteredNotifications.map((notification, index) => (
                                        <div
                                            key={notification.id}
                                            className="animate-fadeInUp"
                                            style={{
                                                animationDelay: `${Math.min(index * 50, 500)}ms`,
                                                animationFillMode: 'both',
                                            }}
                                        >
                                            <NotificationItem notification={notification} />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Add keyframe animation for fade-in */}
                <style jsx>{`
                    @keyframes fadeInUp {
                        from {
                            opacity: 0;
                            transform: translateY(20px);
                        }
                        to {
                            opacity: 1;
                            transform: translateY(0);
                        }
                    }

                    :global(.animate-fadeInUp) {
                        animation: fadeInUp 0.5s ease-out;
                    }
                `}</style>
            </div>
        </SubPageLayout>
    )
}

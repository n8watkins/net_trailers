'use client'

import { useEffect, useMemo, useState, useRef } from 'react'
import { BellIcon, CheckIcon } from '@heroicons/react/24/outline'
import { Cog6ToothIcon, ChevronDownIcon, TrashIcon } from '@heroicons/react/24/solid'
import { useNotificationStore } from '../../stores/notificationStore'
import { useSessionStore } from '../../stores/sessionStore'
import NotificationItem from '../../components/notifications/NotificationItem'
import SubPageLayout from '../../components/layout/SubPageLayout'
import EmptyState from '../../components/common/EmptyState'
import NetflixLoader from '../../components/common/NetflixLoader'
import { GuestModeNotification } from '../../components/auth/GuestModeNotification'
import { useRouter } from 'next/navigation'

export default function NotificationsPageClient() {
    const router = useRouter()
    const getUserId = useSessionStore((state) => state.getUserId)
    const sessionType = useSessionStore((state) => state.sessionType)
    const isInitialized = useSessionStore((state) => state.isInitialized)
    const userId = getUserId()
    const isGuest = sessionType === 'guest'
    const [showManageDropdown, setShowManageDropdown] = useState(false)
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

    const titleActions = (
        <div className="flex items-center gap-3">
            {/* Mark all read button */}
            {!isLoading && !isGuest && (
                <button
                    onClick={handleMarkAllAsRead}
                    disabled={unreadCount === 0}
                    className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200 border ${
                        unreadCount > 0
                            ? 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50 hover:text-white border-gray-600 hover:border-gray-400 cursor-pointer'
                            : 'bg-gray-800/30 text-gray-500 border-gray-700 cursor-not-allowed'
                    }`}
                >
                    <CheckIcon className="h-4 w-4" />
                    <span>Mark all read</span>
                </button>
            )}

            {/* Manage dropdown */}
            <div className="relative" ref={manageDropdownRef}>
                <button
                    type="button"
                    onClick={() => setShowManageDropdown(!showManageDropdown)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-white transition-colors cursor-pointer"
                >
                    <Cog6ToothIcon className="w-5 h-5 flex-shrink-0" />
                    <span className="font-medium">Manage</span>
                    <ChevronDownIcon
                        className={`w-4 h-4 flex-shrink-0 transition-transform ${
                            showManageDropdown ? 'rotate-180' : ''
                        }`}
                    />
                </button>

                {/* Dropdown Menu */}
                {showManageDropdown && (
                    <div className="absolute top-full mt-2 right-0 bg-[#1a1a1a] border border-gray-700 rounded-lg shadow-xl z-50 min-w-[200px] overflow-hidden">
                        <button
                            type="button"
                            onClick={() => {
                                router.push('/settings/notifications')
                                setShowManageDropdown(false)
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3 text-white hover:bg-gray-800 transition-colors"
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
                            className="w-full flex items-center gap-3 px-4 py-3 text-white hover:bg-gray-800 transition-colors"
                        >
                            <TrashIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                            <span>Clear Data</span>
                        </button>
                    </div>
                )}
            </div>
        </div>
    )

    const headerActions = !isLoading && isGuest ? <GuestModeNotification align="left" /> : undefined

    return (
        <SubPageLayout
            title="Notifications"
            icon={<BellIcon />}
            iconColor="text-red-400"
            description="Stay updated with your personalized notifications"
            titleActions={titleActions}
            headerActions={headerActions}
            headerBorder
            headerClassName="w-full max-w-2xl mx-auto"
            contentClassName="w-full max-w-2xl mx-auto"
        >
            {/* Content */}
            {isLoading ? (
                <NetflixLoader message="Loading your notifications..." inline />
            ) : isGuest ? (
                <div className="text-center py-20">
                    <div className="text-6xl mb-4">🔒</div>
                    <h2 className="text-2xl font-semibold text-white mb-2">
                        Sign in to view notifications
                    </h2>
                    <p className="text-gray-400 mb-6">
                        Guest sessions keep notifications on this device only. Create a free account
                        to sync alerts everywhere.
                    </p>
                    <button
                        onClick={() => router.push('/auth')}
                        className="inline-flex items-center px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105"
                    >
                        Create Account
                    </button>
                </div>
            ) : notifications.length === 0 ? (
                <EmptyState
                    emoji="🔔"
                    title="No notifications yet"
                    description="You're all caught up!"
                />
            ) : (
                <div className="space-y-0 overflow-hidden rounded-lg border border-gray-800 bg-gray-900">
                    {notifications.map((notification) => (
                        <NotificationItem key={notification.id} notification={notification} />
                    ))}
                </div>
            )}
        </SubPageLayout>
    )
}

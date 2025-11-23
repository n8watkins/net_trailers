'use client'

import { useEffect, useMemo } from 'react'
import { BellIcon, CheckIcon } from '@heroicons/react/24/outline'
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

    const handleMarkAllAsRead = async () => {
        if (!userId || isGuest) return
        await markAllNotificationsAsRead(userId)
    }

    const headerActions = !isLoading ? (
        isGuest ? (
            <GuestModeNotification align="left" />
        ) : (
            <div className="flex items-center justify-between">
                <p className="text-sm text-gray-400">
                    {unreadCount > 0 ? (
                        <span>
                            {unreadCount} unread · {notifications.length} total
                        </span>
                    ) : (
                        <span>{notifications.length} notifications</span>
                    )}
                </p>

                {/* Actions */}
                {unreadCount > 0 && (
                    <button
                        onClick={handleMarkAllAsRead}
                        className="flex items-center gap-2 rounded-lg bg-gray-800/50 px-4 py-2.5 text-sm font-medium text-gray-300 transition-all duration-200 hover:bg-gray-700/50 hover:text-white border border-gray-600 hover:border-gray-400"
                    >
                        <CheckIcon className="h-4 w-4" />
                        <span>Mark all read</span>
                    </button>
                )}
            </div>
        )
    ) : undefined

    return (
        <SubPageLayout
            title="Notifications"
            icon={<BellIcon />}
            iconColor="text-red-400"
            description="Stay updated with your personalized notifications"
            headerActions={headerActions}
            contentClassName="w-1/2 mx-auto"
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

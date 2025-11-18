'use client'

import { useState, useEffect } from 'react'
import { BellIcon, CheckIcon } from '@heroicons/react/24/outline'
import { useNotificationStore } from '../../stores/notificationStore'
import { useSessionStore } from '../../stores/sessionStore'
import { NotificationType } from '../../types/notifications'
import NotificationItem from '../../components/notifications/NotificationItem'
import SubPageLayout from '../../components/layout/SubPageLayout'
import EmptyState from '../../components/common/EmptyState'
import NetflixLoader from '../../components/common/NetflixLoader'
import { GuestModeNotification } from '../../components/auth/GuestModeNotification'
import { useRouter } from 'next/navigation'

type FilterType = 'all' | NotificationType

export default function NotificationsPageClient() {
    const router = useRouter()
    const getUserId = useSessionStore((state) => state.getUserId)
    const sessionType = useSessionStore((state) => state.sessionType)
    const isInitialized = useSessionStore((state) => state.isInitialized)
    const userId = getUserId()
    const isGuest = sessionType === 'guest'
    const {
        notifications,
        unreadCount,
        isLoading: isLoadingNotifications,
        subscribe,
        unsubscribeFromNotifications,
        markAllNotificationsAsRead,
    } = useNotificationStore()

    // Show loading state while initializing or loading notifications
    const isLoading = !isInitialized || isLoadingNotifications

    const [filter, setFilter] = useState<FilterType>('all')

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

    // Filter notifications based on selected filter
    const filteredNotifications = isGuest
        ? []
        : notifications.filter((notification) => {
              if (filter === 'all') return true
              return notification.type === filter
          })

    // Get count by type
    const getTypeCount = (type: NotificationType) => {
        if (isGuest) return 0
        return notifications.filter((n) => n.type === type).length
    }

    const handleMarkAllAsRead = async () => {
        if (!userId || isGuest) return
        await markAllNotificationsAsRead(userId)
    }

    const headerActions = !isLoading ? (
        isGuest ? (
            <GuestModeNotification align="left" />
        ) : (
            <div className="space-y-6">
                {/* Stats and Actions */}
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

                {/* Filters - Always visible */}
                <div className="flex flex-wrap gap-2 bg-[#1a1a1a] border border-gray-800 rounded-2xl p-6">
                    <button
                        onClick={() => setFilter('all')}
                        className={`rounded-full px-5 py-2.5 text-sm font-medium transition-all duration-200 ${
                            filter === 'all'
                                ? 'bg-white text-black shadow-lg scale-105 border-2 border-white'
                                : 'bg-gray-800/80 text-white hover:bg-gray-700/80 border border-gray-600 hover:border-gray-400 hover:scale-105'
                        }`}
                    >
                        All ({notifications.length})
                    </button>
                    <button
                        onClick={() => setFilter('trending_update')}
                        className={`rounded-full px-4 py-2 text-sm transition-colors ${
                            filter === 'trending_update'
                                ? 'bg-red-600 text-white'
                                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                        }`}
                    >
                        Trending ({getTypeCount('trending_update')})
                    </button>
                    <button
                        onClick={() => setFilter('new_release')}
                        className={`rounded-full px-4 py-2 text-sm transition-colors ${
                            filter === 'new_release'
                                ? 'bg-red-600 text-white'
                                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                        }`}
                    >
                        New Releases ({getTypeCount('new_release')})
                    </button>
                    <button
                        onClick={() => setFilter('collection_update')}
                        className={`rounded-full px-4 py-2 text-sm transition-colors ${
                            filter === 'collection_update'
                                ? 'bg-red-600 text-white'
                                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                        }`}
                    >
                        Collections ({getTypeCount('collection_update')})
                    </button>
                    <button
                        onClick={() => setFilter('system')}
                        className={`rounded-full px-4 py-2 text-sm transition-colors ${
                            filter === 'system'
                                ? 'bg-red-600 text-white'
                                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                        }`}
                    >
                        System ({getTypeCount('system')})
                    </button>
                </div>
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
            contentClassName="max-w-6xl mx-auto"
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
            ) : filteredNotifications.length === 0 ? (
                <EmptyState
                    emoji="🔔"
                    title={
                        filter === 'all'
                            ? 'No notifications yet'
                            : `No ${filter.replace('_', ' ')} notifications`
                    }
                    description={
                        filter === 'all'
                            ? "You're all caught up!"
                            : 'Try selecting a different filter'
                    }
                />
            ) : (
                <div className="space-y-0 overflow-hidden rounded-lg border border-gray-800 bg-gray-900">
                    {filteredNotifications.map((notification) => (
                        <NotificationItem key={notification.id} notification={notification} />
                    ))}
                </div>
            )}
        </SubPageLayout>
    )
}

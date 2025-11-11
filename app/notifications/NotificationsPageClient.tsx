'use client'

import { useState, useEffect } from 'react'
import { BellIcon, CheckIcon, TrashIcon } from '@heroicons/react/24/outline'
import { useNotificationStore } from '../../stores/notificationStore'
import { useSessionStore } from '../../stores/sessionStore'
import { NotificationType } from '../../types/notifications'
import NotificationItem from '../../components/notifications/NotificationItem'
import SubPageLayout from '../../components/layout/SubPageLayout'
import EmptyState from '../../components/common/EmptyState'
import NetflixLoader from '../../components/common/NetflixLoader'

type FilterType = 'all' | NotificationType

export default function NotificationsPageClient() {
    const getUserId = useSessionStore((state) => state.getUserId)
    const sessionType = useSessionStore((state) => state.sessionType)
    const userId = getUserId()
    const isGuest = sessionType === 'guest'
    const {
        notifications,
        unreadCount,
        isLoading,
        subscribe,
        unsubscribeFromNotifications,
        markAllNotificationsAsRead,
        deleteAllNotifications,
    } = useNotificationStore()

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

    const handleClearAll = async () => {
        if (!userId || isGuest) return
        if (confirm('Are you sure you want to delete all notifications? This cannot be undone.')) {
            await deleteAllNotifications(userId)
        }
    }

    const headerActions = isGuest ? (
        <div className="rounded-2xl border border-gray-800 bg-[#1a1a1a] p-6 text-sm text-gray-300">
            Guest sessions keep notifications locally only. Sign in or create an account to sync
            alerts across devices.
        </div>
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
                <div className="flex items-center gap-2">
                    {/* Mark all as read */}
                    {unreadCount > 0 && (
                        <button
                            onClick={handleMarkAllAsRead}
                            className="flex items-center gap-2 rounded-lg bg-gray-800/50 px-4 py-2.5 text-sm font-medium text-gray-300 transition-all duration-200 hover:bg-gray-700/50 hover:text-white border border-gray-600 hover:border-gray-400"
                        >
                            <CheckIcon className="h-4 w-4" />
                            <span>Mark all read</span>
                        </button>
                    )}

                    {/* Clear all */}
                    {notifications.length > 0 && (
                        <button
                            onClick={handleClearAll}
                            className="flex items-center gap-2 rounded-lg bg-gray-800/50 px-4 py-2.5 text-sm font-medium text-gray-400 transition-all duration-200 hover:bg-gray-700/50 hover:text-red-400 border border-gray-600"
                        >
                            <TrashIcon className="h-4 w-4" />
                            <span>Clear all</span>
                        </button>
                    )}
                </div>
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
                    onClick={() => setFilter('share_activity')}
                    className={`rounded-full px-4 py-2 text-sm transition-colors ${
                        filter === 'share_activity'
                            ? 'bg-red-600 text-white'
                            : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                >
                    Shares ({getTypeCount('share_activity')})
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

    return (
        <SubPageLayout
            title="Notifications"
            icon={<BellIcon />}
            iconColor="text-red-400"
            description="Stay updated with your personalized notifications"
            headerActions={headerActions}
        >
            {/* Content */}
            {isGuest ? (
                <EmptyState
                    emoji="🔒"
                    title="Sign in to view notifications"
                    description="Guest sessions keep notifications on this device only. Create a free account to sync alerts everywhere."
                />
            ) : isLoading ? (
                <NetflixLoader message="Loading your notifications..." inline />
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

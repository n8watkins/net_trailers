'use client'

import { useState, useEffect } from 'react'
import { BellIcon, FunnelIcon, CheckIcon, TrashIcon } from '@heroicons/react/24/outline'
import { useNotificationStore } from '../../stores/notificationStore'
import { useSessionStore } from '../../stores/sessionStore'
import { Notification, NotificationType } from '../../types/notifications'
import NotificationItem from '../../components/notifications/NotificationItem'
import SubPageLayout from '../../components/layout/SubPageLayout'
import EmptyState from '../../components/common/EmptyState'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import { useAppStore } from '../../stores/appStore'

type FilterType = 'all' | NotificationType

export default function NotificationsPageClient() {
    const getUserId = useSessionStore((state) => state.getUserId)
    const userId = getUserId()
    const {
        notifications,
        unreadCount,
        isLoading,
        subscribe,
        markAllNotificationsAsRead,
        deleteAllNotifications,
    } = useNotificationStore()

    const { modal } = useAppStore()
    const showModal = modal.isOpen

    const [filter, setFilter] = useState<FilterType>('all')
    const [showFilters, setShowFilters] = useState(false)

    // Subscribe to real-time notifications
    useEffect(() => {
        if (userId) {
            subscribe(userId)
        }
    }, [userId, subscribe])

    // Filter notifications based on selected filter
    const filteredNotifications = notifications.filter((notification) => {
        if (filter === 'all') return true
        return notification.type === filter
    })

    // Get count by type
    const getTypeCount = (type: NotificationType) => {
        return notifications.filter((n) => n.type === type).length
    }

    const handleMarkAllAsRead = async () => {
        if (!userId) return
        await markAllNotificationsAsRead(userId)
    }

    const handleClearAll = async () => {
        if (!userId) return
        if (confirm('Are you sure you want to delete all notifications? This cannot be undone.')) {
            await deleteAllNotifications(userId)
        }
    }

    const headerActions = (
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
                    {/* Filter toggle */}
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
                            showFilters
                                ? 'bg-red-600/20 text-red-400 border border-red-500/30'
                                : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50 border border-gray-600'
                        }`}
                    >
                        <FunnelIcon className="h-4 w-4" />
                        <span>Filter</span>
                    </button>

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

            {/* Filters */}
            {showFilters && (
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
            )}
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
            {isLoading ? (
                <LoadingSpinner color="red" />
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

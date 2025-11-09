/**
 * NotificationBell Component
 *
 * Bell icon with unread badge in header
 * Opens NotificationPanel when clicked
 */

'use client'

import { useEffect } from 'react'
import { BellIcon } from '@heroicons/react/24/outline'
import { BellIcon as BellIconSolid } from '@heroicons/react/24/solid'
import { useNotificationStore } from '../../stores/notificationStore'
import { useSessionStore } from '../../stores/sessionStore'

export default function NotificationBell() {
    const getUserId = useSessionStore((state) => state.getUserId)
    const userId = getUserId()
    const { unreadCount, isPanelOpen, togglePanel, subscribe, unsubscribeFromNotifications } =
        useNotificationStore()

    // Subscribe to real-time notifications
    useEffect(() => {
        if (userId) {
            subscribe(userId)
        }

        // Cleanup on unmount or user change
        return () => {
            unsubscribeFromNotifications()
        }
    }, [userId, subscribe, unsubscribeFromNotifications])

    // Don't render for guest users (no notifications)
    if (!userId) {
        return null
    }

    const hasUnread = unreadCount > 0

    return (
        <button
            onClick={togglePanel}
            className="group relative flex items-center justify-center rounded-full p-2 transition-all hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900"
            aria-label={`Notifications${hasUnread ? ` (${unreadCount} unread)` : ''}`}
            aria-expanded={isPanelOpen}
            aria-haspopup="true"
        >
            {/* Bell Icon */}
            {hasUnread ? (
                <BellIconSolid
                    className="h-6 w-6 text-blue-400 transition-transform group-hover:scale-110"
                    aria-hidden="true"
                />
            ) : (
                <BellIcon
                    className="h-6 w-6 text-gray-300 transition-transform group-hover:scale-110 group-hover:text-white"
                    aria-hidden="true"
                />
            )}

            {/* Unread Badge */}
            {hasUnread && (
                <span
                    className="absolute right-0 top-0 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white ring-2 ring-gray-900"
                    aria-hidden="true"
                >
                    {unreadCount > 99 ? '99+' : unreadCount}
                </span>
            )}

            {/* Pulse animation for new notifications */}
            {hasUnread && (
                <span className="absolute right-0 top-0 flex h-5 w-5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
                </span>
            )}
        </button>
    )
}

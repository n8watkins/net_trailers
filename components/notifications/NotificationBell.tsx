/**
 * NotificationBell Component
 *
 * Bell icon with unread badge in header
 * Opens NotificationPanel when clicked
 */

'use client'

import { useEffect, useState } from 'react'
import { BellIcon } from '@heroicons/react/24/outline'
import { BellIcon as BellIconSolid } from '@heroicons/react/24/solid'
import { useNotificationStore } from '../../stores/notificationStore'
import { useSessionStore } from '../../stores/sessionStore'

export default function NotificationBell() {
    const getUserId = useSessionStore((state) => state.getUserId)
    const sessionType = useSessionStore((state) => state.sessionType)
    const userId = getUserId()
    const isGuest = sessionType === 'guest'
    const { unreadCount, isPanelOpen, togglePanel, subscribe, unsubscribeFromNotifications } =
        useNotificationStore()

    // Fix hydration mismatch: only show dynamic content after mount
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    // Subscribe to real-time notifications
    // Skip for guest users (no Firebase notifications for guests)
    useEffect(() => {
        if (userId && !isGuest) {
            subscribe(userId)
        }

        // Cleanup on unmount or user change
        return () => {
            unsubscribeFromNotifications()
        }
    }, [userId, isGuest, subscribe, unsubscribeFromNotifications])

    // Don't render anything until mounted (prevents hydration issues)
    if (!mounted) {
        return (
            <button
                className="group relative flex items-center justify-center rounded-full p-2 transition-all hover:bg-white/10"
                aria-label="Notifications"
                aria-expanded={false}
                aria-haspopup="true"
                disabled
            >
                <BellIcon
                    className="h-8 w-8 text-gray-300 transition-transform group-hover:scale-110 group-hover:text-white"
                    aria-hidden="true"
                />
            </button>
        )
    }

    // Don't render for guest users (no notifications)
    if (!userId || isGuest) {
        return null
    }

    // Use safe values after mount
    const hasUnread = unreadCount > 0
    const safeUnreadCount = unreadCount
    const safeIsPanelOpen = isPanelOpen

    return (
        <button
            onClick={togglePanel}
            className="group relative flex items-center justify-center rounded-full p-2 transition-all hover:bg-white/10"
            aria-label={`Notifications${hasUnread ? ` (${safeUnreadCount} unread)` : ''}`}
            aria-expanded={safeIsPanelOpen}
            aria-haspopup="true"
        >
            {/* Bell Icon */}
            {hasUnread ? (
                <BellIconSolid
                    className="h-8 w-8 text-red-500 transition-all drop-shadow-[0_0_8px_rgba(239,68,68,0.6)] group-hover:scale-110 group-hover:drop-shadow-[0_0_12px_rgba(239,68,68,0.8)] group-focus:drop-shadow-[0_0_12px_rgba(239,68,68,0.8)]"
                    aria-hidden="true"
                />
            ) : (
                <BellIcon
                    className="h-8 w-8 text-gray-300 transition-all group-hover:scale-110 group-hover:text-white group-hover:drop-shadow-[0_0_12px_rgba(239,68,68,0.6)] group-focus:drop-shadow-[0_0_12px_rgba(239,68,68,0.6)]"
                    aria-hidden="true"
                />
            )}

            {/* Unread Badge */}
            {hasUnread && (
                <span
                    className="absolute right-0 top-0 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white ring-2 ring-gray-900"
                    aria-hidden="true"
                >
                    {safeUnreadCount > 99 ? '99+' : safeUnreadCount}
                </span>
            )}
        </button>
    )
}

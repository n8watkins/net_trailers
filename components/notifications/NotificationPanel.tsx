/**
 * NotificationPanel Component
 *
 * Dropdown panel showing all notifications
 * Opened from NotificationBell
 */

'use client'

import { useEffect, useRef } from 'react'
import { CheckIcon, TrashIcon } from '@heroicons/react/24/outline'
import { useNotificationStore } from '../../stores/notificationStore'
import { useSessionStore } from '../../stores/sessionStore'
import NotificationItem from './NotificationItem'

export default function NotificationPanel() {
    const getUserId = useSessionStore((state) => state.getUserId)
    const userId = getUserId()
    const {
        notifications,
        unreadCount,
        isLoading,
        isPanelOpen,
        closePanel,
        markAllNotificationsAsRead,
        deleteAllNotifications,
    } = useNotificationStore()

    const panelRef = useRef<HTMLDivElement>(null)

    // Close panel when clicking outside
    useEffect(() => {
        if (!isPanelOpen) return

        const handleClickOutside = (event: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
                // Also check if click was on the bell button
                const bellButton = document.querySelector('[aria-label^="Notifications"]')
                if (bellButton && !bellButton.contains(event.target as Node)) {
                    closePanel()
                }
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [isPanelOpen, closePanel])

    // Close on escape key
    useEffect(() => {
        if (!isPanelOpen) return

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                closePanel()
            }
        }

        document.addEventListener('keydown', handleEscape)
        return () => document.removeEventListener('keydown', handleEscape)
    }, [isPanelOpen, closePanel])

    // Handle mark all as read
    const handleMarkAllAsRead = async () => {
        if (!userId) return
        await markAllNotificationsAsRead(userId)
    }

    // Handle clear all
    const handleClearAll = async () => {
        if (!userId) return

        if (
            confirm(
                `Are you sure you want to delete all ${notifications.length} notifications? This cannot be undone.`
            )
        ) {
            await deleteAllNotifications(userId)
        }
    }

    if (!isPanelOpen) return null

    return (
        <div
            ref={panelRef}
            className="absolute right-0 top-full z-50 mt-2 w-96 rounded-lg border border-gray-700 bg-gray-900 shadow-2xl"
            role="dialog"
            aria-label="Notifications"
        >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-700 px-4 py-3">
                <h2 className="text-lg font-semibold text-white">
                    Notifications
                    {unreadCount > 0 && (
                        <span className="ml-2 inline-flex items-center rounded-full bg-red-600 px-2 py-0.5 text-xs font-medium text-white">
                            {unreadCount} new
                        </span>
                    )}
                </h2>

                {/* Actions */}
                <div className="flex items-center gap-2">
                    {/* Mark all as read */}
                    {unreadCount > 0 && (
                        <button
                            onClick={handleMarkAllAsRead}
                            className="flex items-center gap-1 rounded px-2 py-1 text-xs text-gray-300 transition-colors hover:bg-gray-800 hover:text-white"
                            aria-label="Mark all as read"
                        >
                            <CheckIcon className="h-4 w-4" aria-hidden="true" />
                            Mark all read
                        </button>
                    )}

                    {/* Clear all */}
                    {notifications.length > 0 && (
                        <button
                            onClick={handleClearAll}
                            className="flex items-center gap-1 rounded px-2 py-1 text-xs text-gray-400 transition-colors hover:bg-gray-800 hover:text-red-400"
                            aria-label="Clear all notifications"
                        >
                            <TrashIcon className="h-4 w-4" aria-hidden="true" />
                            Clear all
                        </button>
                    )}
                </div>
            </div>

            {/* Notifications List */}
            <div className="max-h-96 overflow-y-auto">
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent"></div>
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                        <BellIcon className="mb-2 h-12 w-12 text-gray-600" aria-hidden="true" />
                        <p className="text-sm">No notifications</p>
                        <p className="mt-1 text-xs text-gray-500">You're all caught up!</p>
                    </div>
                ) : (
                    <div>
                        {notifications.map((notification) => (
                            <NotificationItem key={notification.id} notification={notification} />
                        ))}
                    </div>
                )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
                <div className="border-t border-gray-700 px-4 py-2 text-center">
                    <p className="text-xs text-gray-500">
                        Showing {notifications.length} notification
                        {notifications.length !== 1 ? 's' : ''}
                    </p>
                </div>
            )}
        </div>
    )
}

function BellIcon({ className, ...props }: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className={className}
            {...props}
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
            />
        </svg>
    )
}

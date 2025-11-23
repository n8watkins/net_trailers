/**
 * NotificationPanel Component
 *
 * Dropdown panel showing all notifications
 * Opened from NotificationBell
 */

'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { CheckIcon, Cog6ToothIcon } from '@heroicons/react/24/outline'
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
    } = useNotificationStore()

    const panelRef = useRef<HTMLDivElement>(null)

    // Animation state: track if panel should be visible in DOM
    const [isVisible, setIsVisible] = useState(false)
    const [isAnimating, setIsAnimating] = useState(false)

    // Handle open/close with animation
    useEffect(() => {
        if (isPanelOpen) {
            // Opening: show in DOM first, then animate in
            setIsVisible(true)
            // Small delay to ensure DOM is ready before animation starts
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    setIsAnimating(true)
                })
            })
        } else {
            // Closing: animate out first, then remove from DOM
            setIsAnimating(false)
            const timer = setTimeout(() => {
                setIsVisible(false)
            }, 200) // Match animation duration
            return () => clearTimeout(timer)
        }
    }, [isPanelOpen])

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

    if (!isVisible) return null

    // Shared panel content (used by both mobile and desktop)
    const panelContent = (
        <>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-700 px-4 py-3">
                <div className="flex items-center gap-2">
                    <h2 className="text-base font-semibold text-white">Notifications</h2>
                    {unreadCount > 0 && (
                        <span className="inline-flex items-center rounded-full bg-red-600 px-2 py-0.5 text-xs font-medium text-white">
                            {unreadCount} new
                        </span>
                    )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleMarkAllAsRead}
                        disabled={unreadCount === 0}
                        className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                            unreadCount > 0
                                ? 'bg-gray-800 text-gray-200 hover:bg-gray-700 hover:text-white border border-gray-600 hover:border-gray-500'
                                : 'bg-gray-900/50 text-gray-600 cursor-not-allowed border border-gray-800'
                        }`}
                        aria-label="Mark all as read"
                    >
                        <CheckIcon className="h-4 w-4" aria-hidden="true" />
                        Mark all read
                    </button>
                    <Link
                        href="/settings/notifications"
                        onClick={closePanel}
                        className="flex items-center justify-center rounded-lg p-2 text-gray-400 hover:text-white hover:bg-gray-700 transition-all border border-transparent hover:border-gray-600"
                        aria-label="Notification settings"
                    >
                        <Cog6ToothIcon className="h-5 w-5" aria-hidden="true" />
                    </Link>
                </div>
            </div>

            {/* Notifications List */}
            <div className="max-h-96 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-red-600 hover:scrollbar-thumb-red-500 scrollbar-thumb-rounded-full scrollbar-track-rounded-full">
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
                <div className="border-t border-gray-700 px-4 py-3">
                    <div className="flex items-center justify-center gap-3 text-sm">
                        <span className="text-gray-300 font-medium">
                            Showing {notifications.length} notification
                            {notifications.length !== 1 ? 's' : ''}
                        </span>
                        <a
                            href="/notifications"
                            className="text-red-500 hover:text-red-400 transition-colors font-semibold"
                            onClick={closePanel}
                        >
                            View All →
                        </a>
                    </div>
                </div>
            )}
        </>
    )

    return (
        <>
            {/* Mobile: Centered modal with backdrop (like Header mobile menu) */}
            <div
                className={`sm:hidden fixed inset-0 z-[105] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 transition-opacity duration-200 ${
                    isAnimating ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
                onClick={(e) => {
                    if (e.target === e.currentTarget) {
                        closePanel()
                    }
                }}
            >
                <div
                    className={`w-full max-w-sm rounded-xl bg-[#0f0f0f]/95 backdrop-blur-sm border border-red-500/40 shadow-2xl shadow-red-500/20 transition-all duration-200 ease-out ${
                        isAnimating ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
                    }`}
                    role="dialog"
                    aria-label="Notifications"
                    onClick={(e) => e.stopPropagation()}
                >
                    {panelContent}
                </div>
            </div>

            {/* Desktop: Traditional dropdown below bell icon */}
            <div
                ref={panelRef}
                className={`hidden sm:block absolute right-0 top-full z-50 mt-2 w-[400px] md:w-[520px] max-w-[520px] rounded-lg bg-[#0f0f0f]/95 backdrop-blur-sm border border-red-500/40 shadow-2xl shadow-red-500/20 transition-all duration-200 ease-out origin-top ${
                    isAnimating
                        ? 'opacity-100 translate-y-0 scale-100'
                        : 'opacity-0 -translate-y-2 scale-95'
                }`}
                role="dialog"
                aria-label="Notifications"
            >
                {panelContent}
            </div>
        </>
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

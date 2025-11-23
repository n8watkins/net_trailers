/**
 * NotificationItem Component
 *
 * Displays a single notification with icon, content, and actions
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Notification } from '../../types/notifications'
import { useNotificationStore } from '../../stores/notificationStore'
import { useSessionStore } from '../../stores/sessionStore'
import { useModalStore } from '../../stores/modalStore'
import { Content } from '../../typings'

interface NotificationItemProps {
    notification: Notification
}

export default function NotificationItem({ notification }: NotificationItemProps) {
    const router = useRouter()
    const getUserId = useSessionStore((state) => state.getUserId)
    const userId = getUserId()
    const { markNotificationAsRead, closePanel } = useNotificationStore()
    const { openModal } = useModalStore()
    const [isLoading, setIsLoading] = useState(false)

    // Format timestamp
    const getTimeAgo = (timestamp: number): string => {
        const now = Date.now()
        const diff = now - timestamp
        const seconds = Math.floor(diff / 1000)
        const minutes = Math.floor(seconds / 60)
        const hours = Math.floor(minutes / 60)
        const days = Math.floor(hours / 24)

        if (days > 0) return `${days}d ago`
        if (hours > 0) return `${hours}h ago`
        if (minutes > 0) return `${minutes}m ago`
        return 'Just now'
    }

    // Check if notification is clickable (has content or action URL)
    const isClickable =
        !!(notification.contentId && notification.mediaType) || !!notification.actionUrl

    // Handle notification click
    const handleClick = async () => {
        if (!userId || isLoading) return

        // Mark as read if unread (don't await - let it happen in background)
        if (!notification.isRead) {
            markNotificationAsRead(userId, notification.id).catch(console.error)
        }

        // If notification has contentId and mediaType, open the content modal
        if (notification.contentId && notification.mediaType) {
            setIsLoading(true)

            // Create abort controller with 10 second timeout
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), 10000)

            try {
                const url = `/api/movies/details/${notification.contentId}?media_type=${notification.mediaType}`
                const response = await fetch(url, { signal: controller.signal })

                clearTimeout(timeoutId)

                if (response.ok) {
                    const content: Content = await response.json()
                    closePanel()
                    openModal(content, true, false) // autoPlay=true, autoPlayWithSound=false
                    setIsLoading(false)
                    return
                }
            } catch (error) {
                clearTimeout(timeoutId)
                // Silently handle errors - user will see loading state end
            }

            setIsLoading(false)
        }

        // Fallback: Navigate to action URL if provided
        if (notification.actionUrl) {
            closePanel()
            router.push(notification.actionUrl)
        }
    }

    // Get category label based on notification type
    const getCategoryLabel = () => {
        switch (notification.type) {
            case 'trending_update':
                return 'Now Trending 🔥'
            case 'new_release':
                return 'New Release'
            case 'collection_update':
                return 'Collection Update'
            case 'system':
                return 'System'
            default:
                return 'Notification'
        }
    }

    // Extract content title from notification title (remove prefix if present)
    const getContentTitle = () => {
        // Remove any category prefix from the title
        const prefixes = [
            'Now Trending:',
            'Now Trending 🔥:',
            'New Release:',
            'Collection Update:',
            'System:',
        ]

        let title = notification.title
        for (const prefix of prefixes) {
            if (title.startsWith(prefix)) {
                title = title.replace(prefix, '').trim()
                break
            }
        }

        return title
    }

    const categoryLabel = getCategoryLabel()
    const contentTitle = getContentTitle()

    return (
        <div
            className={`group relative flex gap-3 sm:gap-4 md:gap-6 border-b border-gray-800/50 p-3 sm:p-4 md:p-6 transition-all duration-200 ${
                isClickable
                    ? isLoading
                        ? 'cursor-wait opacity-70'
                        : 'cursor-pointer hover:bg-red-950/40'
                    : 'cursor-default'
            } ${
                !notification.isRead
                    ? 'bg-gradient-to-r from-red-900/50 via-red-950/30 to-red-950/10'
                    : 'bg-transparent opacity-70'
            }`}
            onClick={handleClick}
        >
            {/* Poster image (left side) */}
            {notification.imageUrl && (
                <div className="flex-shrink-0">
                    <img
                        src={notification.imageUrl}
                        alt=""
                        className="h-24 w-16 sm:h-32 sm:w-20 md:h-40 md:w-28 rounded object-cover ring-1 ring-red-900/30"
                    />
                </div>
            )}

            {/* Text content (right side) */}
            <div className="flex min-w-0 flex-1 flex-col justify-start gap-3">
                {/* Header: Category + Timestamp */}
                <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-red-400">{categoryLabel}</span>
                    <time
                        className="flex-shrink-0 text-sm text-gray-300 font-medium"
                        dateTime={new Date(notification.createdAt).toISOString()}
                    >
                        {getTimeAgo(notification.createdAt)}
                    </time>
                </div>

                {/* Content Title */}
                <h4
                    className={`line-clamp-3 text-lg font-semibold leading-snug ${
                        notification.isRead ? 'text-gray-300' : 'text-white'
                    }`}
                >
                    {contentTitle}
                </h4>

                {/* Message/Description if available */}
                {notification.message && (
                    <p className="text-base text-gray-300 line-clamp-2">{notification.message}</p>
                )}
            </div>
        </div>
    )
}

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

    // Handle notification click
    const handleClick = async () => {
        if (!userId || isLoading) return

        // Mark as read if unread
        if (!notification.isRead) {
            await markNotificationAsRead(userId, notification.id)
        }

        // Check if actionUrl contains contentId and media_type
        if (notification.actionUrl && notification.contentId) {
            try {
                const url = new URL(notification.actionUrl, window.location.origin)
                const contentId = url.searchParams.get('contentId')
                const mediaType = url.searchParams.get('media_type')

                if (contentId && mediaType && (mediaType === 'movie' || mediaType === 'tv')) {
                    setIsLoading(true)

                    // Fetch content details
                    const response = await fetch(
                        `/api/movies/details/${contentId}?media_type=${mediaType}`
                    )

                    if (response.ok) {
                        const content: Content = await response.json()

                        // Close notification panel and open modal
                        closePanel()
                        openModal(content, true, false) // autoPlay=true, autoPlayWithSound=false
                        return
                    }
                }
            } catch (error) {
                // Silent fail - notification click falls back to navigation if content fetch fails
            } finally {
                setIsLoading(false)
            }
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
            className={`group relative flex gap-4 border-b border-gray-800/50 p-4 transition-all duration-200 ${
                notification.actionUrl
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
                        className="h-32 w-24 rounded object-cover ring-1 ring-red-900/30"
                    />
                </div>
            )}

            {/* Text content (right side) */}
            <div className="flex min-w-0 flex-1 flex-col justify-start gap-2">
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
                    className={`line-clamp-3 text-base font-semibold leading-snug ${
                        notification.isRead ? 'text-gray-300' : 'text-white'
                    }`}
                >
                    {contentTitle}
                </h4>

                {/* Message/Description if available */}
                {notification.message && (
                    <p className="text-sm text-gray-300 line-clamp-2">{notification.message}</p>
                )}
            </div>
        </div>
    )
}

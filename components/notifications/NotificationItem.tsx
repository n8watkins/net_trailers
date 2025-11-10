/**
 * NotificationItem Component
 *
 * Displays a single notification with icon, content, and actions
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
    SparklesIcon,
    FilmIcon,
    UserGroupIcon,
    BellIcon,
    FireIcon,
    XMarkIcon,
} from '@heroicons/react/24/outline'
import { Notification, NOTIFICATION_META } from '../../types/notifications'
import { useNotificationStore } from '../../stores/notificationStore'
import { useSessionStore } from '../../stores/sessionStore'
import { useAppStore } from '../../stores/appStore'
import { Content } from '../../typings'

interface NotificationItemProps {
    notification: Notification
}

export default function NotificationItem({ notification }: NotificationItemProps) {
    const router = useRouter()
    const getUserId = useSessionStore((state) => state.getUserId)
    const userId = getUserId()
    const { markNotificationAsRead, deleteNotification, closePanel } = useNotificationStore()
    const { openModal } = useAppStore()
    const [isLoading, setIsLoading] = useState(false)

    const meta = NOTIFICATION_META[notification.type]

    // Get the appropriate icon component
    const getIcon = () => {
        switch (notification.type) {
            case 'collection_update':
                return SparklesIcon
            case 'new_release':
                return FilmIcon
            case 'share_activity':
                return UserGroupIcon
            case 'trending_update':
                return FireIcon
            case 'system':
                return BellIcon
            default:
                return BellIcon
        }
    }

    const Icon = getIcon()

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
                console.error('Failed to fetch content for notification:', error)
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

    // Handle delete
    const handleDelete = async (e: React.MouseEvent) => {
        e.stopPropagation() // Prevent triggering click handler
        if (!userId) return

        await deleteNotification(userId, notification.id)
    }

    return (
        <div
            className={`group relative flex gap-3 border-b border-gray-700/50 p-4 transition-all duration-200 ${
                notification.actionUrl
                    ? isLoading
                        ? 'cursor-wait opacity-70'
                        : 'cursor-pointer hover:bg-gray-800/80'
                    : 'cursor-default'
            } ${
                !notification.isRead
                    ? 'bg-gradient-to-r from-gray-800/40 to-transparent border-l-4 border-l-red-600'
                    : 'bg-transparent opacity-70'
            }`}
            onClick={handleClick}
        >
            {/* Icon */}
            <div
                className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${meta.bgColor}`}
            >
                <Icon className={`h-5 w-5 ${meta.color}`} aria-hidden="true" />
            </div>

            {/* Content */}
            <div className="flex-1 space-y-1">
                {/* Title and timestamp */}
                <div className="flex items-start justify-between gap-2">
                    <h4
                        className={`text-sm font-medium ${
                            notification.isRead ? 'text-gray-300' : 'text-white'
                        }`}
                    >
                        {notification.title}
                    </h4>
                    <time
                        className="text-xs text-gray-500"
                        dateTime={new Date(notification.createdAt).toISOString()}
                    >
                        {getTimeAgo(notification.createdAt)}
                    </time>
                </div>

                {/* Message */}
                <p className={`text-sm ${notification.isRead ? 'text-gray-400' : 'text-gray-300'}`}>
                    {notification.message}
                </p>

                {/* Poster image (if available) */}
                {notification.imageUrl && (
                    <div className="mt-2">
                        <img
                            src={notification.imageUrl}
                            alt=""
                            className="h-20 w-auto rounded object-cover"
                        />
                    </div>
                )}
            </div>

            {/* Delete button */}
            <button
                onClick={handleDelete}
                className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-gray-800/80 opacity-0 transition-opacity hover:bg-red-600 group-hover:opacity-100"
                aria-label="Delete notification"
            >
                <XMarkIcon className="h-4 w-4 text-gray-400 hover:text-white" aria-hidden="true" />
            </button>
        </div>
    )
}

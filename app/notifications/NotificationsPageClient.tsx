'use client'

import { useEffect, useMemo, useState } from 'react'
import { BellIcon, CheckIcon } from '@heroicons/react/24/outline'
import { Cog6ToothIcon, TrashIcon } from '@heroicons/react/24/solid'
import { useNotificationStore } from '../../stores/notificationStore'
import { useSessionStore } from '../../stores/sessionStore'
import NotificationItem from '../../components/notifications/NotificationItem'
import SubPageLayout from '../../components/layout/SubPageLayout'
import PageHeader from '../../components/layout/PageHeader'
import PageEmptyState, { emptyStateActionClass } from '../../components/layout/PageEmptyState'
import { ListSearchInput, ManageMenu } from '../../components/layout/PageToolbar'
import { useModalStore } from '../../stores/modalStore'
import PageLoader from '../../components/common/PageLoader'
import { useRouter } from 'next/navigation'

export default function NotificationsPageClient() {
    const router = useRouter()
    const getUserId = useSessionStore((state) => state.getUserId)
    const sessionType = useSessionStore((state) => state.sessionType)
    const isInitialized = useSessionStore((state) => state.isInitialized)
    const userId = getUserId()
    const isGuest = sessionType === 'guest'
    const [searchQuery, setSearchQuery] = useState('')
    const openAuthModal = useModalStore((state) => state.openAuthModal)
    const {
        notifications: rawNotifications,
        unreadCount,
        isLoading: isLoadingNotifications,
        subscribe,
        unsubscribeFromNotifications,
        markAllNotificationsAsRead,
    } = useNotificationStore()

    // Deduplicate notifications by ID (in case of duplicates in Firestore)
    const notifications = useMemo(() => {
        const seen = new Set<string>()
        return rawNotifications.filter((n) => {
            if (seen.has(n.id)) return false
            seen.add(n.id)
            return true
        })
    }, [rawNotifications])

    // Filter notifications by search query
    const filteredNotifications = useMemo(() => {
        if (!searchQuery.trim()) return notifications
        const query = searchQuery.toLowerCase()
        return notifications.filter(
            (n) =>
                n.title?.toLowerCase().includes(query) || n.message?.toLowerCase().includes(query)
        )
    }, [notifications, searchQuery])

    // Show loading state while initializing or loading notifications
    const isLoading = !isInitialized || isLoadingNotifications

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

    const handleMarkAllAsRead = async () => {
        if (!userId || isGuest) return
        await markAllNotificationsAsRead(userId)
    }

    const hasNotifications = !isLoading && !isGuest && notifications.length > 0

    return (
        <SubPageLayout hideHeader>
            <div className="space-y-6">
                <PageHeader
                    title="Notifications"
                    icon={<BellIcon />}
                    actions={
                        hasNotifications && (
                            <>
                                <button
                                    type="button"
                                    onClick={handleMarkAllAsRead}
                                    disabled={unreadCount === 0}
                                    className="inline-flex h-9 items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900 px-4 text-sm font-medium text-gray-300 transition-colors hover:border-zinc-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <CheckIcon className="h-4 w-4 text-green-400" />
                                    Mark all read
                                    {unreadCount > 0 && ` (${unreadCount})`}
                                </button>
                                <ManageMenu
                                    items={[
                                        {
                                            label: 'Settings',
                                            icon: Cog6ToothIcon,
                                            onSelect: () => router.push('/settings/notifications'),
                                        },
                                        {
                                            label: 'Clear data',
                                            icon: TrashIcon,
                                            danger: true,
                                            onSelect: () => router.push('/settings/account'),
                                        },
                                    ]}
                                />
                            </>
                        )
                    }
                >
                    {hasNotifications && (
                        <ListSearchInput
                            value={searchQuery}
                            onChange={setSearchQuery}
                            placeholder="Search notifications..."
                            voiceSourceId="notifications-search"
                        />
                    )}
                </PageHeader>

                {isLoading && (
                    <div className="py-16">
                        <PageLoader inline={true} message="Loading notifications..." />
                    </div>
                )}

                {!isLoading && isGuest && (
                    <PageEmptyState
                        icon={<BellIcon />}
                        title="Sign in to get notifications"
                        description="Get told when titles you saved are released, what is newly trending, and when people react to your rankings."
                        action={
                            <button
                                type="button"
                                onClick={() => openAuthModal('signin')}
                                className={emptyStateActionClass}
                            >
                                Sign in
                            </button>
                        }
                    />
                )}

                {!isLoading && !isGuest && notifications.length === 0 && (
                    <PageEmptyState
                        icon={<BellIcon />}
                        title="No notifications yet"
                        description="You are all caught up."
                    />
                )}

                {hasNotifications && filteredNotifications.length === 0 && (
                    <p className="py-12 text-center text-gray-400">
                        No notifications match your search.
                    </p>
                )}

                {hasNotifications && filteredNotifications.length > 0 && (
                    <div className="max-w-3xl overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/40">
                        {filteredNotifications.map((notification, index) => (
                            <div
                                key={notification.id}
                                className="animate-fadeInUp"
                                style={{
                                    animationDelay: `${Math.min(index * 50, 500)}ms`,
                                    animationFillMode: 'both',
                                }}
                            >
                                <NotificationItem notification={notification} />
                            </div>
                        ))}
                    </div>
                )}

                {/* Add keyframe animation for fade-in */}
                <style jsx>{`
                    @keyframes fadeInUp {
                        from {
                            opacity: 0;
                            transform: translateY(20px);
                        }
                        to {
                            opacity: 1;
                            transform: translateY(0);
                        }
                    }

                    :global(.animate-fadeInUp) {
                        animation: fadeInUp 0.5s ease-out;
                    }
                `}</style>
            </div>
        </SubPageLayout>
    )
}

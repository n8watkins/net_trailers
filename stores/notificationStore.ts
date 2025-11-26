/**
 * Notification Store (Zustand)
 *
 * Manages notification state with real-time Firestore sync
 */

import { notificationLog, notificationWarn } from '../utils/debugLogger'
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { Notification, CreateNotificationRequest, NotificationStats } from '../types/notifications'
import {
    createNotification,
    getAllNotifications,
    getUnreadNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
    getNotificationStats,
    subscribeToNotifications,
} from '../utils/firestore/notifications'

const GUEST_ID_PREFIX = 'guest_'

const isGuestUserId = (userId?: string | null): boolean =>
    Boolean(userId && userId.startsWith(GUEST_ID_PREFIX))

function ensureAuthUser(userId: string | null | undefined, action: string): userId is string {
    if (!userId) {
        notificationWarn(`Cannot ${action}: No user ID`)
        return false
    }

    if (isGuestUserId(userId)) {
        notificationWarn(`Cannot ${action}: Guest sessions use local notifications only`)
        return false
    }

    return true
}

interface NotificationState {
    // State
    notifications: Notification[]
    unreadCount: number
    isLoading: boolean
    isPanelOpen: boolean
    stats: NotificationStats | null
    error: string | null

    // Real-time subscription
    unsubscribe: (() => void) | null

    // Actions
    loadNotifications: (userId: string | null) => Promise<void>
    loadUnreadNotifications: (userId: string | null) => Promise<void>
    loadStats: (userId: string | null) => Promise<void>
    createNotification: (userId: string | null, request: CreateNotificationRequest) => Promise<void>
    markNotificationAsRead: (userId: string | null, notificationId: string) => Promise<void>
    markAllNotificationsAsRead: (userId: string | null) => Promise<void>
    deleteNotification: (userId: string | null, notificationId: string) => Promise<void>
    deleteAllNotifications: (userId: string | null) => Promise<void>
    togglePanel: () => void
    openPanel: () => void
    closePanel: () => void

    // Real-time subscription
    subscribe: (userId: string | null) => void
    unsubscribeFromNotifications: () => void

    // Utility
    clearNotifications: () => void
    setError: (error: string | null) => void
}

export const useNotificationStore = create<NotificationState>()(
    devtools(
        (set, get) => ({
            // Initial state
            notifications: [],
            unreadCount: 0,
            isLoading: false,
            isPanelOpen: false,
            stats: null,
            error: null,
            unsubscribe: null,

            // Load all notifications
            loadNotifications: async (userId: string | null) => {
                notificationLog('[Notifications] Loading all notifications for user:', userId?.slice(0, 8))
                if (!ensureAuthUser(userId, 'load notifications')) {
                    set({
                        notifications: [],
                        unreadCount: 0,
                        isLoading: false,
                        error: null,
                    })
                    return
                }

                set({ isLoading: true, error: null })

                try {
                    const result = await getAllNotifications(userId)
                    const notifications = result.data
                    const unreadCount = notifications.filter((n) => !n.isRead).length

                    notificationLog('[Notifications] Loaded:', notifications.length, 'total,', unreadCount, 'unread')
                    set({
                        notifications,
                        unreadCount,
                        isLoading: false,
                    })
                } catch (error) {
                    console.error('Error loading notifications:', error)
                    set({
                        error:
                            error instanceof Error ? error.message : 'Failed to load notifications',
                        isLoading: false,
                    })
                }
            },

            // Load only unread notifications
            loadUnreadNotifications: async (userId: string | null) => {
                if (!ensureAuthUser(userId, 'load unread notifications')) {
                    set({
                        notifications: [],
                        unreadCount: 0,
                        isLoading: false,
                        error: null,
                    })
                    return
                }

                set({ isLoading: true, error: null })

                try {
                    const result = await getUnreadNotifications(userId)
                    const unreadNotifications = result.data
                    const unreadCount = unreadNotifications.length

                    set({
                        notifications: unreadNotifications,
                        unreadCount,
                        isLoading: false,
                    })
                } catch (error) {
                    console.error('Error loading unread notifications:', error)
                    set({
                        error:
                            error instanceof Error
                                ? error.message
                                : 'Failed to load unread notifications',
                        isLoading: false,
                    })
                }
            },

            // Load notification statistics
            loadStats: async (userId: string | null) => {
                if (!ensureAuthUser(userId, 'load notification stats')) {
                    set({ stats: null })
                    return
                }

                try {
                    const stats = await getNotificationStats(userId)
                    set({ stats })
                } catch (error) {
                    console.error('Error loading notification stats:', error)
                }
            },

            // Create a new notification
            createNotification: async (
                userId: string | null,
                request: CreateNotificationRequest
            ) => {
                notificationLog('[Notifications] Creating notification:', request.type, request.title)
                if (!ensureAuthUser(userId, 'create notification')) {
                    return
                }

                try {
                    const notification = await createNotification(userId, request)
                    notificationLog('[Notifications] Created notification:', notification.id)

                    // Add to local state
                    set((state) => ({
                        notifications: [notification, ...state.notifications],
                        unreadCount: state.unreadCount + 1,
                    }))
                } catch (error) {
                    console.error('Error creating notification:', error)
                    set({
                        error:
                            error instanceof Error
                                ? error.message
                                : 'Failed to create notification',
                    })
                }
            },

            // Mark a notification as read
            markNotificationAsRead: async (userId: string | null, notificationId: string) => {
                notificationLog('[Notifications] Marking as read:', notificationId)
                if (!ensureAuthUser(userId, 'mark notification as read')) {
                    return
                }

                try {
                    await markAsRead(userId, notificationId)
                    notificationLog('[Notifications] Marked as read successfully')

                    // Update local state
                    set((state) => ({
                        notifications: state.notifications.map((n) =>
                            n.id === notificationId ? { ...n, isRead: true } : n
                        ),
                        unreadCount: Math.max(0, state.unreadCount - 1),
                    }))
                } catch (error) {
                    console.error('Error marking notification as read:', error)
                    set({
                        error:
                            error instanceof Error
                                ? error.message
                                : 'Failed to mark notification as read',
                    })
                }
            },

            // Mark all notifications as read
            markAllNotificationsAsRead: async (userId: string | null) => {
                if (!ensureAuthUser(userId, 'mark all notifications as read')) {
                    return
                }

                set({ isLoading: true, error: null })

                try {
                    await markAllAsRead(userId)

                    // Update local state
                    set((state) => ({
                        notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
                        unreadCount: 0,
                        isLoading: false,
                    }))
                } catch (error) {
                    console.error('Error marking all as read:', error)
                    set({
                        error:
                            error instanceof Error
                                ? error.message
                                : 'Failed to mark all notifications as read',
                        isLoading: false,
                    })
                }
            },

            // Delete a notification
            deleteNotification: async (userId: string | null, notificationId: string) => {
                if (!ensureAuthUser(userId, 'delete notification')) {
                    return
                }

                try {
                    await deleteNotification(userId, notificationId)

                    // Update local state
                    set((state) => {
                        const notification = state.notifications.find(
                            (n) => n.id === notificationId
                        )
                        const wasUnread = notification && !notification.isRead

                        return {
                            notifications: state.notifications.filter(
                                (n) => n.id !== notificationId
                            ),
                            unreadCount: wasUnread
                                ? Math.max(0, state.unreadCount - 1)
                                : state.unreadCount,
                        }
                    })
                } catch (error) {
                    console.error('Error deleting notification:', error)
                    set({
                        error:
                            error instanceof Error
                                ? error.message
                                : 'Failed to delete notification',
                    })
                }
            },

            // Delete all notifications
            deleteAllNotifications: async (userId: string | null) => {
                if (!ensureAuthUser(userId, 'delete all notifications')) {
                    return
                }

                set({ isLoading: true, error: null })

                try {
                    // Temporarily unsubscribe to prevent race conditions during deletion
                    const currentUnsubscribe = get().unsubscribe
                    if (currentUnsubscribe) {
                        currentUnsubscribe()
                        set({ unsubscribe: null })
                    }

                    // Clear local state immediately for instant UI feedback
                    set({
                        notifications: [],
                        unreadCount: 0,
                    })

                    // Delete from Firestore
                    await deleteAllNotifications(userId)

                    // Re-subscribe after deletion completes
                    const unsubscribe = subscribeToNotifications(userId, (notifications) => {
                        const unreadCount = notifications.filter((n) => !n.isRead).length

                        set({
                            notifications,
                            unreadCount,
                            isLoading: false,
                        })
                    })

                    set({ unsubscribe, isLoading: false })
                } catch (error) {
                    console.error('Error deleting all notifications:', error)
                    set({
                        error:
                            error instanceof Error
                                ? error.message
                                : 'Failed to delete all notifications',
                        isLoading: false,
                    })

                    // Re-subscribe even on error to restore real-time updates
                    const unsubscribe = subscribeToNotifications(userId, (notifications) => {
                        const unreadCount = notifications.filter((n) => !n.isRead).length

                        set({
                            notifications,
                            unreadCount,
                            isLoading: false,
                        })
                    })

                    set({ unsubscribe })
                }
            },

            // Toggle notification panel
            togglePanel: () => {
                set((state) => ({ isPanelOpen: !state.isPanelOpen }))
            },

            // Open notification panel
            openPanel: () => {
                set({ isPanelOpen: true })
            },

            // Close notification panel
            closePanel: () => {
                set({ isPanelOpen: false })
            },

            // Subscribe to real-time updates
            subscribe: (userId: string | null) => {
                notificationLog('[Notifications] Subscribing to real-time updates for user:', userId?.slice(0, 8))
                if (!ensureAuthUser(userId, 'subscribe to notifications')) {
                    return
                }

                // Unsubscribe from previous subscription if exists
                const currentUnsubscribe = get().unsubscribe
                if (currentUnsubscribe) {
                    notificationLog('[Notifications] Cleaning up previous subscription')
                    currentUnsubscribe()
                }

                // Create new subscription
                const unsubscribe = subscribeToNotifications(userId, (notifications) => {
                    const unreadCount = notifications.filter((n) => !n.isRead).length
                    notificationLog('[Notifications] Real-time update received:', notifications.length, 'notifications,', unreadCount, 'unread')

                    set({
                        notifications,
                        unreadCount,
                        isLoading: false,
                    })
                })

                notificationLog('[Notifications] Subscription established')
                set({ unsubscribe })
            },

            // Unsubscribe from real-time updates
            unsubscribeFromNotifications: () => {
                const unsubscribe = get().unsubscribe
                if (unsubscribe) {
                    notificationLog('[Notifications] Unsubscribing from real-time updates')
                    unsubscribe()
                    set({ unsubscribe: null })
                }
            },

            // Clear all notifications (local state only)
            clearNotifications: () => {
                // Unsubscribe first
                const unsubscribe = get().unsubscribe
                if (unsubscribe) {
                    unsubscribe()
                }

                set({
                    notifications: [],
                    unreadCount: 0,
                    isLoading: false,
                    isPanelOpen: false,
                    stats: null,
                    error: null,
                    unsubscribe: null,
                })
            },

            // Set error message
            setError: (error: string | null) => {
                set({ error })
            },
        }),
        { name: 'NotificationStore' }
    )
)

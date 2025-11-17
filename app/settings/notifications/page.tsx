'use client'

import React, { useState } from 'react'
import useUserData from '../../../hooks/useUserData'
import { useAuthStatus } from '../../../hooks/useAuthStatus'
import { useToast } from '../../../hooks/useToast'
import { useAuthStore } from '../../../stores/authStore'
import { useGuestStore } from '../../../stores/guestStore'
import NotificationsSection from '../../../components/settings/NotificationsSection'
import { DEFAULT_NOTIFICATION_PREFERENCES } from '../../../types/notifications'

const NotificationsPage: React.FC = () => {
    const { isGuest } = useAuthStatus()
    const userData = useUserData()
    const { showSuccess, showError } = useToast()

    // Get direct store access for preferences updates
    const authStoreUpdatePrefs = useAuthStore((state) => state.updatePreferences)
    const guestStoreUpdatePrefs = useGuestStore((state) => state.updatePreferences)
    const authNotificationPreferences = useAuthStore((state) => state.notifications)
    const guestNotificationPreferences = useGuestStore((state) => state.notifications)
    const notificationPreferences = React.useMemo(
        () =>
            (isGuest ? guestNotificationPreferences : authNotificationPreferences) ??
            DEFAULT_NOTIFICATION_PREFERENCES,
        [isGuest, authNotificationPreferences, guestNotificationPreferences]
    )

    const [notifications, setNotifications] = useState(() => notificationPreferences)

    // Track original preferences to detect changes
    const [originalNotifications, setOriginalNotifications] = useState(notificationPreferences)

    // React to store changes
    React.useEffect(() => {
        if (userData.isInitializing) {
            return
        }

        const notificationsChanged =
            JSON.stringify(notificationPreferences) !== JSON.stringify(notifications)

        if (notificationsChanged) {
            setNotifications(notificationPreferences)
            setOriginalNotifications(notificationPreferences)
        }
    }, [notificationPreferences, userData.isInitializing, notifications])

    // Check if notifications have changed
    const notificationsChanged =
        JSON.stringify(notifications) !== JSON.stringify(originalNotifications)

    // Notifications handlers
    const handleNotificationsChange = React.useCallback(
        (changes: Partial<typeof notifications>) => {
            setNotifications((prev: typeof notifications) => ({ ...prev, ...changes }))
        },
        []
    )

    const handleSaveNotifications = React.useCallback(async () => {
        try {
            // Update preferences through the appropriate store
            const updatedPreferences = {
                childSafetyMode: userData.childSafetyMode ?? false,
                autoMute: userData.autoMute ?? true,
                defaultVolume: userData.defaultVolume ?? 50,
                improveRecommendations: userData.improveRecommendations ?? true,
                showRecommendations: userData.showRecommendations ?? false,
                notifications,
            }

            if (isGuest) {
                // For guest, update the guest store
                guestStoreUpdatePrefs(updatedPreferences)
            } else {
                // For authenticated, update auth store
                await authStoreUpdatePrefs(updatedPreferences)
            }

            // Update original notifications to reflect saved state
            setOriginalNotifications(notifications)

            showSuccess('Notification preferences saved successfully!')
        } catch (error) {
            console.error('❌ [Settings] Error saving notification preferences:', error)
            showError('Failed to save notification preferences')
        }
    }, [
        notifications,
        isGuest,
        userData.childSafetyMode,
        userData.autoMute,
        userData.defaultVolume,
        userData.improveRecommendations,
        userData.showRecommendations,
        authStoreUpdatePrefs,
        guestStoreUpdatePrefs,
        showSuccess,
        showError,
    ])

    return (
        <NotificationsSection
            notifications={notifications}
            notificationsChanged={notificationsChanged}
            onNotificationsChange={handleNotificationsChange}
            onSave={handleSaveNotifications}
        />
    )
}

export default NotificationsPage

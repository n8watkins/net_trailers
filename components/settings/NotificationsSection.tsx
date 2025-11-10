'use client'

import React, { useState } from 'react'
import { BellIcon, EnvelopeIcon } from '@heroicons/react/24/outline'
import { NotificationPreferences } from '../../types/notifications'
import { useToast } from '../../hooks/useToast'
import useAuth from '../../hooks/useAuth'
import { createNotification } from '../../utils/firestore/notifications'

interface NotificationsSectionProps {
    notifications: NotificationPreferences
    notificationsChanged: boolean
    onNotificationsChange: (notifications: Partial<NotificationPreferences>) => void
    onSave: () => void
}

const NotificationsSection: React.FC<NotificationsSectionProps> = ({
    notifications,
    notificationsChanged,
    onNotificationsChange,
    onSave,
}) => {
    const { user } = useAuth()
    const { showSuccess, showError } = useToast()
    const [isSendingEmail, setIsSendingEmail] = useState(false)
    const [isGeneratingNotifications, setIsGeneratingNotifications] = useState(false)

    const handleSendTestEmail = async () => {
        if (!user?.email) {
            showError('No email address found for your account')
            return
        }

        setIsSendingEmail(true)
        try {
            const response = await fetch('/api/email/send-pilot', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: user.email,
                    userName: user.displayName || '',
                }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to send email')
            }

            showSuccess('Test email sent successfully! Check your inbox.')
        } catch (error) {
            console.error('Error sending test email:', error)
            showError(error instanceof Error ? error.message : 'Failed to send test email')
        } finally {
            setIsSendingEmail(false)
        }
    }

    const handleGenerateTestNotifications = async () => {
        if (!user?.uid) {
            showError('You must be logged in to generate test notifications')
            return
        }

        setIsGeneratingNotifications(true)
        try {
            // Sample trending content data
            const fakeTrendingItems = [
                {
                    id: 872585,
                    contentTitle: 'Oppenheimer',
                    media_type: 'movie' as const,
                    poster_path: '/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg',
                },
                {
                    id: 976573,
                    contentTitle: 'Elemental',
                    media_type: 'movie' as const,
                    poster_path: '/4Y1WNkd88JXmGfhtWR7dmDAo1T2.jpg',
                },
                {
                    id: 94997,
                    contentTitle: 'House of the Dragon',
                    media_type: 'tv' as const,
                    poster_path: '/7QMsOTMUswlwxJP0rTTZfmz2tX2.jpg',
                },
                {
                    id: 246,
                    contentTitle: 'Avatar: The Last Airbender',
                    media_type: 'tv' as const,
                    poster_path: '/9RQhVb3r3mCMqYVhLoCu4EvuipP.jpg',
                },
                {
                    id: 569094,
                    contentTitle: 'Spider-Man: Across the Spider-Verse',
                    media_type: 'movie' as const,
                    poster_path: '/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg',
                },
            ]

            console.log(`🎬 Generating fake trending notifications for user: ${user.uid}`)

            const results = []

            for (const content of fakeTrendingItems) {
                try {
                    const title = content.contentTitle
                    const mediaType = content.media_type === 'movie' ? 'Movie' : 'TV Show'
                    const posterPath = content.poster_path

                    const notification = await createNotification(user.uid, {
                        type: 'trending_update',
                        title: `🔥 Now Trending: ${title}`,
                        message: `${title} (${mediaType}) just entered the trending list!`,
                        contentId: content.id,
                        actionUrl: `/?contentId=${content.id}&media_type=${content.media_type}`,
                        imageUrl: posterPath
                            ? `https://image.tmdb.org/t/p/w500${posterPath}`
                            : undefined,
                        expiresIn: 7, // 7 days
                    })

                    console.log(`✅ Created notification for: ${title}`)
                    results.push({ success: true, title, notificationId: notification.id })
                } catch (error) {
                    console.error(
                        `❌ Failed to create notification for content ${content.id}:`,
                        error
                    )
                    results.push({
                        success: false,
                        title: content.contentTitle,
                        error: error instanceof Error ? error.message : 'Unknown error',
                    })
                }
            }

            const successCount = results.filter((r) => r.success).length
            const errorCount = results.filter((r) => !r.success).length

            if (successCount === 0) {
                throw new Error('Failed to create any notifications')
            }

            showSuccess(
                `Created ${successCount} trending notifications! Check the notification bell.`
            )

            if (errorCount > 0) {
                console.warn(`${errorCount} notifications failed to create`)
            }
        } catch (error) {
            console.error('Error generating test notifications:', error)
            showError(
                error instanceof Error ? error.message : 'Failed to generate test notifications'
            )
        } finally {
            setIsGeneratingNotifications(false)
        }
    }

    return (
        <div className="p-8">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-white mb-2">Notifications</h2>
                <p className="text-[#b3b3b3]">
                    Manage how you receive notifications about new content and updates
                </p>
            </div>

            <div className="space-y-8">
                {/* General Notifications */}
                <div>
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                        <BellIcon className="w-5 h-5 mr-2" />
                        General Notifications
                    </h3>
                    <div className="space-y-6 bg-[#0a0a0a] rounded-lg border border-[#313131] p-6">
                        {/* In-App Notifications */}
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-[#e5e5e5] mb-1">
                                    In-App Notifications
                                </label>
                                <p className="text-sm text-[#b3b3b3]">
                                    Show notifications within the app
                                </p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer ml-4">
                                <input
                                    type="checkbox"
                                    checked={notifications.inApp}
                                    onChange={(e) =>
                                        onNotificationsChange({ inApp: e.target.checked })
                                    }
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Notification Types */}
                <div>
                    <h3 className="text-lg font-semibold text-white mb-4">Notification Types</h3>
                    <div className="space-y-6 bg-[#0a0a0a] rounded-lg border border-[#313131] p-6">
                        {/* Trending New Content */}
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-[#e5e5e5] mb-1">
                                    New Releases
                                </label>
                                <p className="text-sm text-[#b3b3b3]">
                                    Get notified about new movie and TV show releases
                                </p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer ml-4">
                                <input
                                    type="checkbox"
                                    checked={notifications.types.new_release}
                                    onChange={(e) =>
                                        onNotificationsChange({
                                            types: {
                                                ...notifications.types,
                                                new_release: e.target.checked,
                                            },
                                        })
                                    }
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                            </label>
                        </div>

                        {/* Collection Updates */}
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-[#e5e5e5] mb-1">
                                    Collection Updates
                                </label>
                                <p className="text-sm text-[#b3b3b3]">
                                    Get notified when collections are updated with new content
                                </p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer ml-4">
                                <input
                                    type="checkbox"
                                    checked={notifications.types.collection_update}
                                    onChange={(e) =>
                                        onNotificationsChange({
                                            types: {
                                                ...notifications.types,
                                                collection_update: e.target.checked,
                                            },
                                        })
                                    }
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                            </label>
                        </div>

                        {/* Trending Updates */}
                        <div className="space-y-4">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-[#e5e5e5] mb-1">
                                        Trending Updates
                                    </label>
                                    <p className="text-sm text-[#b3b3b3]">
                                        Get notified when new content enters the trending list
                                    </p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer ml-4">
                                    <input
                                        type="checkbox"
                                        checked={notifications.types.trending_update}
                                        onChange={(e) =>
                                            onNotificationsChange({
                                                types: {
                                                    ...notifications.types,
                                                    trending_update: e.target.checked,
                                                },
                                            })
                                        }
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                                </label>
                            </div>

                            {/* Generate Test Notifications Button */}
                            {notifications.types.trending_update && user?.uid && (
                                <div className="pt-4 border-t border-[#313131]">
                                    <button
                                        onClick={handleGenerateTestNotifications}
                                        disabled={isGeneratingNotifications}
                                        className="px-4 py-2 bg-[#1a1a1a] border border-[#313131] text-white rounded-lg hover:bg-[#2a2a2a] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                    >
                                        <BellIcon className="w-4 h-4" />
                                        {isGeneratingNotifications
                                            ? 'Generating...'
                                            : 'Generate Test Notifications'}
                                    </button>
                                    <p className="text-xs text-[#b3b3b3] mt-2">
                                        Creates 5 fake trending notifications for testing
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* System Notifications */}
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-[#e5e5e5] mb-1">
                                    System Announcements
                                </label>
                                <p className="text-sm text-[#b3b3b3]">
                                    Get notified about app updates and important announcements
                                </p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer ml-4">
                                <input
                                    type="checkbox"
                                    checked={notifications.types.system}
                                    onChange={(e) =>
                                        onNotificationsChange({
                                            types: {
                                                ...notifications.types,
                                                system: e.target.checked,
                                            },
                                        })
                                    }
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Delivery Methods */}
                <div>
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                        <EnvelopeIcon className="w-5 h-5 mr-2" />
                        Delivery Methods
                    </h3>
                    <div className="space-y-6 bg-[#0a0a0a] rounded-lg border border-[#313131] p-6">
                        {/* Browser Notifications */}
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-[#e5e5e5] mb-1">
                                    Browser Notifications
                                </label>
                                <p className="text-sm text-[#b3b3b3]">
                                    Receive push notifications in your browser (disabled by default)
                                </p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer ml-4">
                                <input
                                    type="checkbox"
                                    checked={notifications.push}
                                    onChange={(e) =>
                                        onNotificationsChange({ push: e.target.checked })
                                    }
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                            </label>
                        </div>

                        {/* Email Notifications - Pilot Feature */}
                        <div className="space-y-4">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-[#e5e5e5] mb-1">
                                        Email Notifications (Pilot)
                                    </label>
                                    <p className="text-sm text-[#b3b3b3]">
                                        Receive a showcase email with trending movies and TV shows
                                    </p>
                                    <p className="text-xs text-[#999] mt-1">
                                        This is a demo feature to showcase email functionality
                                    </p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer ml-4">
                                    <input
                                        type="checkbox"
                                        checked={notifications.email}
                                        onChange={(e) =>
                                            onNotificationsChange({ email: e.target.checked })
                                        }
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                                </label>
                            </div>

                            {/* Send Test Email Button */}
                            {notifications.email && user?.email && (
                                <div className="pt-4 border-t border-[#313131]">
                                    <button
                                        onClick={handleSendTestEmail}
                                        disabled={isSendingEmail}
                                        className="px-4 py-2 bg-[#1a1a1a] border border-[#313131] text-white rounded-lg hover:bg-[#2a2a2a] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                    >
                                        <EnvelopeIcon className="w-4 h-4" />
                                        {isSendingEmail ? 'Sending...' : 'Send Test Email'}
                                    </button>
                                    <p className="text-xs text-[#b3b3b3] mt-2">
                                        Test email will be sent to: {user.email}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Save Button */}
                {notificationsChanged && (
                    <div className="flex justify-end pt-6 border-t border-[#313131]">
                        <button
                            onClick={onSave}
                            className="px-6 py-3 bg-red-600 text-white rounded-lg font-medium transition-all duration-200 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 focus:ring-offset-[#141414]"
                        >
                            Save Changes
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}

export default NotificationsSection

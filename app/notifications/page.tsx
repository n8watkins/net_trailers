/**
 * Notifications Page
 *
 * Full-page view of all notifications with filtering and detailed view
 */

import NotificationsPageClient from './NotificationsPageClient'

export const metadata = {
    title: 'Notifications - NetTrailers',
    description: 'View all your notifications',
}

export default function NotificationsPage() {
    return <NotificationsPageClient />
}

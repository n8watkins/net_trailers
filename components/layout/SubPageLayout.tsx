/**
 * SubPageLayout - Standardized layout for user account pages
 *
 * Provides consistent spacing, alignment, and structure for:
 * - Profile
 * - Watch History
 * - Collections
 * - Liked Content
 * - Hidden Content
 * - Notifications
 * - Settings
 */

import React, { ReactNode } from 'react'
import Header from './Header'
import PageHeader from './PageHeader'
import { useModalStore } from '../../stores/modalStore'

interface SubPageLayoutProps {
    /** Page title (e.g., "Watch History") */
    title?: ReactNode
    /** Icon element to display next to title */
    icon?: ReactNode
    /** Icon color class (e.g., "text-purple-400") */
    iconColor?: string
    /** Description text below title */
    description?: string
    /** Optional actions to show in the same row as title (e.g., manage dropdown) */
    titleActions?: ReactNode
    /** Optional actions/controls to show in header (search, filters, etc.) */
    headerActions?: ReactNode
    /** Main page content */
    children: ReactNode
    /** Additional class names for the main content area */
    contentClassName?: string
    /** Additional class names for the header section (to match content width) */
    headerClassName?: string
    /** Show a border below the header section */
    headerBorder?: boolean
    /** Hide the page header section entirely (for pages with custom headers) */
    hideHeader?: boolean
}

export default function SubPageLayout({
    title,
    icon,
    iconColor = 'text-white',
    description,
    titleActions,
    headerActions,
    children,
    contentClassName = '',
    headerClassName = '',
    headerBorder = false,
    hideHeader = false,
}: SubPageLayoutProps) {
    const { modal } = useModalStore()
    const showModal = modal.isOpen

    return (
        <div
            className={`relative min-h-screen overflow-x-clip ${showModal && 'overflow-y-hidden'} bg-gradient-to-b from-black to-gray-900`}
        >
            <Header />

            {/* Main content with top padding to account for taller fixed header (includes sub-nav) */}
            <main className="relative pb-24 px-4 sm:px-6 md:px-8 lg:px-16 pt-36 sm:pt-40 md:pt-44">
                <div className="max-w-[1800px] mx-auto flex flex-col space-y-6 py-8">
                    {/* Page Header */}
                    {!hideHeader && (title || icon || headerActions || titleActions) && (
                        <div
                            className={`${headerBorder ? 'pb-6 border-b border-gray-700' : ''} ${headerClassName}`}
                        >
                            <PageHeader
                                title={title}
                                icon={icon}
                                iconColor={iconColor}
                                actions={titleActions}
                            >
                                {description && (
                                    <p className="text-gray-400 max-w-2xl">{description}</p>
                                )}
                                {headerActions}
                            </PageHeader>
                        </div>
                    )}

                    {/* Main Content Area */}
                    <div className={contentClassName}>{children}</div>
                </div>
            </main>
        </div>
    )
}

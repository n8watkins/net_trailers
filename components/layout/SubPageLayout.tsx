/**
 * SubPageLayout - Standardized layout for SubHeader pages
 *
 * Provides consistent spacing, alignment, and structure for:
 * - Watch History
 * - Liked Content
 * - Hidden Content
 * - Profile
 */

import React, { ReactNode } from 'react'
import Header from './Header'
import SubHeader from '../common/SubHeader'
import { useAppStore } from '../../stores/appStore'

interface SubPageLayoutProps {
    /** Page title (e.g., "Watch History") */
    title: string
    /** Icon element to display next to title */
    icon: ReactNode
    /** Icon color class (e.g., "text-purple-400") */
    iconColor?: string
    /** Description text below title */
    description?: string
    /** Optional actions/controls to show in header (search, filters, etc.) */
    headerActions?: ReactNode
    /** Main page content */
    children: ReactNode
    /** Additional class names for the main content area */
    contentClassName?: string
}

export default function SubPageLayout({
    title,
    icon,
    iconColor = 'text-white',
    description,
    headerActions,
    children,
    contentClassName = '',
}: SubPageLayoutProps) {
    const { modal } = useAppStore()
    const showModal = modal.isOpen

    return (
        <div
            className={`relative min-h-screen overflow-x-clip ${showModal && 'overflow-y-hidden'} bg-gradient-to-b from-black to-gray-900`}
        >
            <Header />
            <SubHeader />

            <main className="relative pb-24 px-4 sm:px-6 lg:px-8">
                <div className="max-w-[1600px] mx-auto flex flex-col space-y-6 py-8">
                    {/* Page Header */}
                    <div className="space-y-4">
                        {/* Title Section */}
                        <div className="flex items-center space-x-3">
                            <div className={`w-8 h-8 ${iconColor}`}>{icon}</div>
                            <h1 className="text-3xl font-bold text-white md:text-4xl">{title}</h1>
                        </div>

                        {/* Description */}
                        {description && <p className="text-gray-400 max-w-2xl">{description}</p>}

                        {/* Header Actions (search, filters, etc.) */}
                        {headerActions && <div className="pt-2">{headerActions}</div>}
                    </div>

                    {/* Main Content Area */}
                    <div className={contentClassName}>{children}</div>
                </div>
            </main>
        </div>
    )
}

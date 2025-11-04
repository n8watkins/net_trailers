'use client'

import React from 'react'
import { LockClosedIcon, SparklesIcon } from '@heroicons/react/24/outline'

interface PremiumFeatureGateProps {
    isLocked: boolean // true if user is guest/not authenticated
    feature: 'advanced_filters' | 'ai_generation' | 'preview'
    children: React.ReactNode
    onUnlockClick?: () => void // Callback to open sign-in modal
    showBadge?: boolean // Show "Premium" badge
}

/**
 * PremiumFeatureGate Component
 *
 * Wraps premium features and shows lock overlay for non-authenticated users.
 * Displays tooltips and handles click to open sign-in modal.
 */
export function PremiumFeatureGate({
    isLocked,
    feature,
    children,
    onUnlockClick,
    showBadge = true,
}: PremiumFeatureGateProps) {
    const featureLabels = {
        advanced_filters: 'Advanced Filters',
        ai_generation: 'AI Name Generation',
        preview: 'Content Preview',
    }

    const featureDescriptions = {
        advanced_filters: 'Unlock advanced filtering options',
        ai_generation: 'Let AI generate creative names',
        preview: 'Preview content before creating',
    }

    if (!isLocked) {
        // Not locked - show feature normally with optional premium badge
        return (
            <div className="relative">
                {showBadge && (
                    <div className="absolute -top-2 -right-2 z-10">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold rounded-full shadow-lg">
                            <SparklesIcon className="w-3 h-3" />
                            Premium
                        </span>
                    </div>
                )}
                {children}
            </div>
        )
    }

    // Locked - show overlay with unlock prompt
    return (
        <div className="relative">
            {/* Feature content (blurred/disabled) */}
            <div className="pointer-events-none blur-sm opacity-40">{children}</div>

            {/* Lock overlay */}
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-900/80 to-black/60 backdrop-blur-sm rounded-lg border-2 border-purple-500/30">
                <button
                    type="button"
                    onClick={onUnlockClick}
                    className="group flex flex-col items-center gap-3 p-6 hover:scale-105 transition-transform duration-200"
                >
                    {/* Lock icon with glow effect */}
                    <div className="relative">
                        <div className="absolute inset-0 bg-purple-600 blur-xl opacity-50 group-hover:opacity-75 transition-opacity" />
                        <LockClosedIcon className="relative w-12 h-12 text-purple-400 group-hover:text-purple-300 transition-colors" />
                    </div>

                    {/* Feature label */}
                    <div className="text-center">
                        <h3 className="text-white font-semibold text-lg mb-1">
                            {featureLabels[feature]}
                        </h3>
                        <p className="text-gray-300 text-sm mb-3">{featureDescriptions[feature]}</p>
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium rounded-lg group-hover:from-purple-500 group-hover:to-pink-500 transition-all shadow-lg">
                            <SparklesIcon className="w-4 h-4" />
                            Sign In to Unlock
                        </div>
                    </div>
                </button>
            </div>

            {/* Premium badge */}
            {showBadge && (
                <div className="absolute -top-2 -right-2 z-10">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold rounded-full shadow-lg">
                        <LockClosedIcon className="w-3 h-3" />
                        Premium
                    </span>
                </div>
            )}
        </div>
    )
}

/**
 * Simpler inline version for buttons
 */
export function PremiumButton({
    isLocked,
    onClick,
    children,
    className = '',
    ...props
}: {
    isLocked: boolean
    onClick?: () => void
    children: React.ReactNode
    className?: string
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
    if (isLocked) {
        return (
            <button
                type="button"
                className={`relative ${className} opacity-60 cursor-not-allowed`}
                disabled
                {...props}
            >
                <span className="flex items-center gap-2">
                    <LockClosedIcon className="w-4 h-4" />
                    {children}
                </span>
            </button>
        )
    }

    return (
        <button type="button" onClick={onClick} className={className} {...props}>
            {children}
        </button>
    )
}

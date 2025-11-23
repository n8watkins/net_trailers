/**
 * EmptyState - Standardized empty state component
 * Used across all SubHeader pages for consistent messaging
 */

import { ReactNode } from 'react'

interface EmptyStateProps {
    /** Emoji or icon to display */
    emoji: string
    /** Main heading text */
    title: string
    /** Description text */
    description: string
    /** Optional action button/link */
    action?: ReactNode
}

export default function EmptyState({ emoji, title, description, action }: EmptyStateProps) {
    return (
        <div className="text-center py-20">
            <div className="text-6xl mb-4">{emoji}</div>
            <h2 className="text-2xl font-semibold text-white mb-2">{title}</h2>
            <p className="text-gray-400">{description}</p>
            {action && <div className="mt-6">{action}</div>}
        </div>
    )
}

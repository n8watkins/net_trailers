/**
 * StatsBar - Standardized stats/action bar
 * Shows item count and optional action buttons
 */

import { ReactNode } from 'react'

interface StatsBarProps {
    /** Total count of items */
    count: number
    /** Label for the count (e.g., "items liked", "items hidden") */
    countLabel: string
    /** Optional action buttons to display */
    actions?: ReactNode
}

export default function StatsBar({ count, countLabel, actions }: StatsBarProps) {
    if (count === 0) return null

    return (
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 py-3 border-b border-gray-700/30">
            {/* Stats */}
            <div className="text-lg font-semibold text-white">
                {count} {countLabel}
            </div>

            {/* Actions */}
            {actions && <div className="flex items-center gap-4">{actions}</div>}
        </div>
    )
}

'use client'

import { useEffect } from 'react'
import { useAiQuotaStore } from '../../stores/aiQuotaStore'

/**
 * "4 of 10 AI searches left today", or a plain note when they are used up.
 * Hidden when the quota cannot be looked up.
 */
export default function AiQuotaLine({ className = '' }: { className?: string }) {
    const quota = useAiQuotaStore((state) => state.quota)
    const refresh = useAiQuotaStore((state) => state.refresh)

    useEffect(() => {
        void refresh()
    }, [refresh])

    if (!quota) return null

    if (quota.remaining <= 0) {
        return (
            <p className={`text-xs text-amber-200 sm:text-sm ${className}`} role="status">
                {quota.exhausted === 'global'
                    ? 'AI search has hit its daily limit for everyone. The example moods still work.'
                    : `You've used today's ${quota.limit} AI searches. The example moods still work.`}
            </p>
        )
    }

    return (
        <p className={`text-xs text-gray-300 sm:text-sm ${className}`} role="status">
            {quota.remaining} of {quota.limit} AI searches left today
        </p>
    )
}

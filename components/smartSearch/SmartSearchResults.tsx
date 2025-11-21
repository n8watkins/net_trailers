'use client'

import { useSmartSearchStore } from '../../stores/smartSearchStore'
import ContentCard from '../common/ContentCard'

export default function SmartSearchResults() {
    const { results, color } = useSmartSearchStore()

    return (
        <div
            className="relative rounded-2xl p-6 overflow-hidden"
            style={{
                backgroundColor: `${color}08`,
                border: `1px solid ${color}30`,
            }}
        >
            {/* Subtle gradient glow effect */}
            <div
                className="absolute inset-0 opacity-20 pointer-events-none"
                style={{
                    background: `radial-gradient(ellipse at top left, ${color}40 0%, transparent 50%)`,
                }}
            />

            {/* Results grid */}
            <div className="relative flex flex-wrap gap-6">
                {results.map((content) => (
                    <div key={content.id}>
                        <ContentCard content={content} size="normal" />
                    </div>
                ))}
            </div>
        </div>
    )
}

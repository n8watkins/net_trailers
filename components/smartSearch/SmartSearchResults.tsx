'use client'

import { useSmartSearchStore } from '../../stores/smartSearchStore'
import ContentCard from '../common/ContentCard'

export default function SmartSearchResults() {
    const { results } = useSmartSearchStore()

    return (
        <div className="flex flex-wrap gap-6 mb-8">
            {results.map((content) => (
                <div key={content.id}>
                    <ContentCard content={content} size="normal" />
                </div>
            ))}
        </div>
    )
}

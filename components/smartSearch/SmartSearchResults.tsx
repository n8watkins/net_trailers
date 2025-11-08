'use client'

import { XMarkIcon } from '@heroicons/react/24/solid'
import { useSmartSearchStore } from '../../stores/smartSearchStore'
import ContentCard from '../common/ContentCard'

export default function SmartSearchResults() {
    const { results, removeContent } = useSmartSearchStore()

    const handleRemove = (e: React.MouseEvent, tmdbId: number) => {
        e.stopPropagation()
        removeContent(tmdbId)
    }

    return (
        <div className="flex flex-wrap gap-6 mb-8">
            {results.map((content) => (
                <div key={content.id} className="relative group">
                    {/* Remove Button - Center Top with white circle and black X */}
                    <button
                        onClick={(e) => handleRemove(e, content.id)}
                        onMouseEnter={(e) => e.stopPropagation()}
                        onMouseLeave={(e) => e.stopPropagation()}
                        className="
                            absolute top-2 left-1/2 -translate-x-1/2 z-50
                            w-10 h-10 rounded-full
                            bg-white shadow-lg
                            border-2 border-black
                            opacity-0 group-hover:opacity-100
                            transition-all duration-200
                            hover:scale-110
                            flex items-center justify-center
                        "
                        aria-label="Remove from results"
                    >
                        <XMarkIcon className="h-6 w-6 text-black" />
                    </button>

                    {/* Content Card with all the hover effects */}
                    <ContentCard content={content} size="medium" />
                </div>
            ))}
        </div>
    )
}

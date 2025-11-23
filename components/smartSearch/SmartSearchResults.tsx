'use client'

import { useEffect, useState, useMemo } from 'react'
import { useSmartSearchStore } from '../../stores/smartSearchStore'
import ContentCard from '../common/ContentCard'

export default function SmartSearchResults() {
    const { results, newlyAddedIds, clearNewlyAddedIds } = useSmartSearchStore()

    // Track which items have started their animation
    const [animatedIds, setAnimatedIds] = useState<Set<number>>(new Set())

    // Convert Set to array for comparison (Sets don't trigger re-renders)
    const newlyAddedArray = useMemo(() => Array.from(newlyAddedIds), [newlyAddedIds])

    // Stagger the fade-in animation for newly added items
    useEffect(() => {
        if (newlyAddedArray.length === 0) return

        // Stagger each new item's animation by 100ms
        newlyAddedArray.forEach((id, index) => {
            setTimeout(() => {
                setAnimatedIds((prev) => new Set([...prev, id]))
            }, index * 100) // 100ms delay between each card
        })

        // Clear the newlyAddedIds after all animations are triggered
        const totalDelay = newlyAddedArray.length * 100 + 500 // Extra 500ms for animation to complete
        const cleanupTimer = setTimeout(() => {
            clearNewlyAddedIds()
            // Clear animated IDs after a brief moment
            setTimeout(() => {
                setAnimatedIds(new Set())
            }, 100)
        }, totalDelay)

        return () => clearTimeout(cleanupTimer)
    }, [newlyAddedArray, clearNewlyAddedIds])

    return (
        <div>
            {/* Results grid */}
            <div className="flex flex-wrap gap-3 sm:gap-4 md:gap-6 lg:gap-8">
                {results.map((content) => {
                    const isNewlyAdded = newlyAddedIds.has(content.id)
                    const hasAnimated = animatedIds.has(content.id)

                    // New items start invisible and fade in when their turn comes
                    const shouldAnimate = isNewlyAdded
                    const isVisible = !isNewlyAdded || hasAnimated

                    return (
                        <div
                            key={content.id}
                            className={`transition-all duration-500 ease-out ${
                                shouldAnimate
                                    ? isVisible
                                        ? 'opacity-100 translate-y-0 scale-100'
                                        : 'opacity-0 translate-y-4 scale-95'
                                    : ''
                            }`}
                        >
                            <ContentCard content={content} size="normal" />
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

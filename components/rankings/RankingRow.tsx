/**
 * RankingRow Component
 *
 * Displays a horizontal scrollable row of ranking cards
 * Similar to content rows on homepage but for rankings
 */

'use client'

import { useRef, useState } from 'react'
import { Ranking } from '@/types/rankings'
import { RankingCard } from './RankingCard'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid'

interface RankingRowProps {
    title: string
    emoji?: string
    rankings: Ranking[]
    showAuthor?: boolean
    onLike?: (rankingId: string) => void
}

export function RankingRow({ title, emoji, rankings, showAuthor = true, onLike }: RankingRowProps) {
    const rowRef = useRef<HTMLDivElement>(null)
    const [isMoved, setIsMoved] = useState(false)
    const [showLeftArrow, setShowLeftArrow] = useState(false)
    const [showRightArrow, setShowRightArrow] = useState(true)

    const handleScroll = () => {
        if (rowRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = rowRef.current
            setShowLeftArrow(scrollLeft > 0)
            setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10)
        }
    }

    const handleClick = (direction: 'left' | 'right') => {
        setIsMoved(true)
        if (rowRef.current) {
            const scrollAmount = rowRef.current.clientWidth * 0.8
            rowRef.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth',
            })
        }
    }

    if (rankings.length === 0) {
        return null
    }

    return (
        <div className="space-y-2 mb-8">
            {/* Row header */}
            <div className="flex items-center gap-2 px-4 md:px-8">
                {emoji && <span className="text-xl">{emoji}</span>}
                <h2 className="text-lg md:text-xl font-semibold text-white">{title}</h2>
                <span className="text-sm text-gray-500">({rankings.length})</span>
            </div>

            {/* Scrollable row */}
            <div className="group relative">
                {/* Left arrow */}
                {showLeftArrow && (
                    <button
                        onClick={() => handleClick('left')}
                        className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 min-w-[44px] min-h-[44px] bg-black/70 hover:bg-black/90 rounded-full flex items-center justify-center opacity-70 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200"
                    >
                        <ChevronLeftIcon className="w-6 h-6 text-white" />
                    </button>
                )}

                {/* Rankings container */}
                <div
                    ref={rowRef}
                    onScroll={handleScroll}
                    className="flex gap-4 overflow-x-scroll scrollbar-hide px-4 md:px-8 py-2"
                >
                    {rankings.map((ranking) => (
                        <div key={ranking.id} className="flex-shrink-0 w-72 sm:w-76 md:w-80">
                            <RankingCard
                                ranking={ranking}
                                showAuthor={showAuthor}
                                onLike={onLike}
                            />
                        </div>
                    ))}
                </div>

                {/* Right arrow */}
                {showRightArrow && rankings.length > 3 && (
                    <button
                        onClick={() => handleClick('right')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 min-w-[44px] min-h-[44px] bg-black/70 hover:bg-black/90 rounded-full flex items-center justify-center opacity-70 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200"
                    >
                        <ChevronRightIcon className="w-6 h-6 text-white" />
                    </button>
                )}
            </div>
        </div>
    )
}

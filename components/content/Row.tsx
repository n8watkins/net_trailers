import React, { useRef, useState } from 'react'
import { Content } from '../../typings'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid'
import ContentCard from '../common/ContentCard'
import { useSessionData } from '../../hooks/useSessionData'
import { filterDislikedContent } from '../../utils/contentFilter'

interface Props {
    title: string
    content: Content[]
}
function Row({ title, content }: Props) {
    const rowRef = useRef<HTMLDivElement>(null)
    const [isMoved, setIsMoved] = useState(false)
    const sessionData = useSessionData()

    // Filter out disliked content
    const filteredContent = filterDislikedContent(content, sessionData.hiddenMovies)

    // Don't render if no content after filtering
    if (!filteredContent || filteredContent.length === 0) {
        return null
    }

    const handleClick = (direction: string) => {
        setIsMoved(true)
        if (rowRef.current && rowRef.current.children.length > 0) {
            const { scrollLeft, clientWidth } = rowRef.current

            // Use clientWidth for better performance instead of getBoundingClientRect
            const scrollDistance = clientWidth * 0.8 // Scroll 80% of visible width
            const scrollTo =
                direction === 'left' ? scrollLeft - scrollDistance : scrollLeft + scrollDistance

            rowRef.current.scrollTo({
                left: scrollTo,
                behavior: 'smooth',
            })
        }
    }
    return (
        <div className="pb-4 sm:pb-6 md:pb-8">
            {/* Section Title */}
            <h2 className="text-white text-lg sm:text-xl md:text-2xl lg:text-3xl font-semibold px-4 sm:px-6 md:px-8 lg:px-16 pt-8 sm:pt-10 md:pt-12 transition duration-200 hover:text-gray-300">
                {title}
            </h2>

            {/* Content Row */}
            <div className="relative row-container h-[17rem] sm:h-[19rem] md:h-[21rem] lg:h-[23rem] xl:h-[28.5rem] group">
                {/* Left Arrow - Hidden on mobile, visible on larger screens */}
                <div
                    className={`hidden md:flex absolute top-0 left-[-1rem] z-50 rounded-lg w-32 h-[17rem] sm:h-[19rem] md:h-[21rem] lg:h-[23rem] xl:h-[28.5rem] items-center justify-center ${
                        isMoved ? 'opacity-0 group-hover:opacity-100' : 'opacity-0'
                    } transition-all duration-300 cursor-pointer pointer-events-auto border border-transparent hover:shadow-[0_0_20px_rgba(107,114,128,0.5)] hover:backdrop-blur-sm group/chevron`}
                    onClick={() => handleClick('left')}
                >
                    <div
                        className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-80 group-hover/chevron:opacity-100 transition-opacity duration-300"
                        style={{
                            background:
                                'radial-gradient(circle, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.55) 35%, rgba(0,0,0,0.75) 55%, rgba(0,0,0,0.9) 75%, rgba(0,0,0,1) 100%)',
                        }}
                    ></div>
                    <ChevronLeftIcon className="h-14 w-14 text-white drop-shadow-2xl transition-transform duration-300 relative z-10 group-hover/chevron:scale-110" />
                </div>

                {/* Scrollable Container */}
                <div
                    ref={rowRef}
                    className="flex gap-3 sm:gap-4 md:gap-5 lg:gap-6 xl:gap-8 overflow-x-scroll overflow-y-hidden scrollbar-hide scroll-smooth
                              px-4 sm:px-6 md:px-8 lg:px-16
                              py-10"
                    style={{
                        scrollbarWidth: 'none',
                        msOverflowStyle: 'none',
                        willChange: 'scroll-position',
                        WebkitOverflowScrolling: 'touch',
                    }}
                >
                    {filteredContent.map((item) => (
                        <div
                            key={`${item.media_type || 'unknown'}-${item.id}`}
                            className="flex-shrink-0"
                        >
                            <ContentCard content={item} />
                        </div>
                    ))}
                </div>

                {/* Right Arrow - Hidden on mobile, visible on larger screens */}
                <div
                    className="hidden md:flex absolute top-0 right-[-1rem] z-50 rounded-lg w-32 h-[17rem] sm:h-[19rem] md:h-[21rem] lg:h-[23rem] xl:h-[28.5rem] items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 cursor-pointer pointer-events-auto border border-transparent hover:shadow-[0_0_20px_rgba(107,114,128,0.5)] hover:backdrop-blur-sm group/chevron"
                    onClick={() => handleClick('right')}
                >
                    <div
                        className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-80 group-hover/chevron:opacity-100 transition-opacity duration-300"
                        style={{
                            background:
                                'radial-gradient(circle, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.55) 35%, rgba(0,0,0,0.75) 55%, rgba(0,0,0,0.9) 75%, rgba(0,0,0,1) 100%)',
                        }}
                    ></div>
                    <ChevronRightIcon className="h-14 w-14 text-white drop-shadow-2xl transition-transform duration-300 relative z-10 group-hover/chevron:scale-110" />
                </div>
            </div>
        </div>
    )
}

export default Row

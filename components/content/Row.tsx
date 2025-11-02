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
        if (rowRef.current) {
            const { scrollLeft } = rowRef.current
            const thumbnailLength = rowRef.current.children[0].clientWidth

            const thumbnailspacing =
                rowRef.current.children[1].getBoundingClientRect().left -
                rowRef.current.children[0].getBoundingClientRect().right

            const thumbnailsOnPage = Math.floor(window.innerWidth / thumbnailLength)

            const scrollDistance = thumbnailLength * 6 + thumbnailspacing * thumbnailsOnPage - 1
            const scrollTo =
                direction === 'left' ? scrollLeft - scrollDistance : scrollLeft + scrollDistance

            rowRef.current?.scrollTo({
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
                    className={`hidden md:flex absolute top-0 z-50 items-center justify-center ${
                        isMoved ? '' : 'opacity-0'
                    } transition-all duration-300 cursor-pointer pointer-events-auto`}
                    onClick={() => handleClick('left')}
                    style={{
                        background:
                            'linear-gradient(to right, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 100%)',
                        width: '100px',
                        height: '100%',
                        left: '-2rem',
                    }}
                >
                    <div className="ml-8 bg-transparent group-hover:bg-black/50 rounded-lg w-14 h-[17rem] sm:h-[19rem] md:h-[21rem] lg:h-[23rem] xl:h-[28.5rem] flex items-center justify-center hover:backdrop-blur-md hover:bg-black/70 transition-all duration-300 shadow-2xl border border-transparent group-hover:border-white/20 opacity-70 group-hover:opacity-100">
                        <ChevronLeftIcon className="h-14 w-14 text-white drop-shadow-2xl hover:scale-125 transition-transform duration-300" />
                    </div>
                </div>

                {/* Scrollable Container */}
                <div
                    ref={rowRef}
                    className="flex gap-3 sm:gap-4 md:gap-5 lg:gap-6 xl:gap-8 overflow-x-scroll overflow-y-hidden scrollbar-hide scroll-smooth
                              px-4 sm:px-6 md:px-8 lg:px-16
                              py-10"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
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
                    className="hidden md:flex absolute top-0 z-50 items-center justify-center transition-all duration-300 cursor-pointer pointer-events-auto"
                    onClick={() => handleClick('right')}
                    style={{
                        background:
                            'linear-gradient(to left, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 100%)',
                        width: '100px',
                        height: '100%',
                        right: '-2rem',
                    }}
                >
                    <div className="mr-8 bg-transparent group-hover:bg-black/50 rounded-lg w-14 h-[17rem] sm:h-[19rem] md:h-[21rem] lg:h-[23rem] xl:h-[28.5rem] flex items-center justify-center hover:backdrop-blur-md hover:bg-black/70 transition-all duration-300 shadow-2xl border border-transparent group-hover:border-white/20 opacity-70 group-hover:opacity-100">
                        <ChevronRightIcon className="h-14 w-14 text-white drop-shadow-2xl hover:scale-125 transition-transform duration-300" />
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Row

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
            <div className="relative row-container h-[17rem] sm:h-[19rem] md:h-[21rem] lg:h-[23rem] xl:h-[28.5rem]">
                {/* Left Arrow - Hidden on mobile, visible on larger screens */}
                <div
                    className={`hidden md:flex absolute left-0 top-0 z-30 h-full items-center pl-2 ${
                        isMoved ? 'row-container:hover:opacity-100' : 'opacity-0'
                    } transition-opacity cursor-pointer pointer-events-auto`}
                    onClick={() => handleClick('left')}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'transparent'
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent'
                    }}
                >
                    <ChevronLeftIcon className="h-8 w-8 text-white hover:scale-110 transition-transform" />
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
                        <div key={item.id} className="flex-shrink-0">
                            <ContentCard content={item} />
                        </div>
                    ))}
                </div>

                {/* Right Arrow - Hidden on mobile, visible on larger screens */}
                <div
                    className="hidden md:flex absolute right-0 top-0 z-30 h-full items-center pr-2 row-container:hover:opacity-100 opacity-0 transition-opacity cursor-pointer pointer-events-auto"
                    onClick={() => handleClick('right')}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'transparent'
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent'
                    }}
                >
                    <ChevronRightIcon className="h-8 w-8 text-white hover:scale-110 transition-transform" />
                </div>
            </div>
        </div>
    )
}

export default Row

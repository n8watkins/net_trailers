import React, { useRef, useState } from 'react'
import { Content } from '../typings'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid'
import Thumbnail from './Thumbnail'

interface Props {
    title: string
    content: Content[]
}
function Row({ title, content }: Props) {
    const rowRef = useRef<HTMLDivElement>(null)
    const [isMoved, setIsMoved] = useState(false)

    // Don't render if no content
    if (!content || content.length === 0) {
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

            const thumbnailsOnPage = Math.floor(
                window.innerWidth / thumbnailLength
            )

            const scrollDistance =
                thumbnailLength * 6 + thumbnailspacing * thumbnailsOnPage - 1
            const scrollTo =
                direction === 'left'
                    ? scrollLeft - scrollDistance
                    : scrollLeft + scrollDistance

            rowRef.current?.scrollTo({
                left: scrollTo,
                behavior: 'smooth',
            })
        }
    }
    return (
        <div className="pb-8 sm:pb-10 md:pb-12">
            {/* Section Title */}
            <h2 className="text-white text-lg sm:text-xl md:text-2xl lg:text-3xl font-semibold px-4 sm:px-6 md:px-8 lg:px-16 py-3 sm:py-4 lg:py-5 transition duration-200 hover:text-gray-300">
                {title}
            </h2>

            {/* Content Row */}
            <div className="relative row-container">
                {/* Left Arrow - Hidden on mobile, visible on larger screens */}
                <div
                    className={`hidden md:flex absolute left-0 top-0 z-30 h-full items-center pl-2 ${
                        isMoved ? 'row-container:hover:opacity-100' : 'opacity-0'
                    } transition-opacity cursor-pointer pointer-events-auto`}
                    onClick={() => handleClick('left')}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'linear-gradient(to right, rgba(20,20,20,0.9), transparent)'
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
                    className="flex gap-3 sm:gap-4 md:gap-5 lg:gap-6 xl:gap-8 overflow-x-auto scrollbar-hide scroll-smooth
                              px-4 sm:px-6 md:px-8 lg:px-16
                              py-6 sm:py-8 md:py-10 lg:py-12"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                    {content.map((item) => (
                        <div key={item.id} className="flex-shrink-0">
                            <Thumbnail content={item} />
                        </div>
                    ))}
                </div>

                {/* Right Arrow - Hidden on mobile, visible on larger screens */}
                <div
                    className="hidden md:flex absolute right-0 top-0 z-30 h-full items-center pr-2 row-container:hover:opacity-100 opacity-0 transition-opacity cursor-pointer pointer-events-auto"
                    onClick={() => handleClick('right')}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'linear-gradient(to left, rgba(20,20,20,0.9), transparent)'
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

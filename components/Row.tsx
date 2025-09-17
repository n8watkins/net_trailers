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
        <div className="pb-[2rem]">
            <h2 className=" text-[#e5e5e5] transition duration-200 hover:text-white lg:text-3xl lg:font-semibold  px-16 py-5 w-max ">
                {title}
            </h2>
            <div className={`relative w-screen flex group items-center `}>
                <div
                    className={`absolute flex z-30 h-[100%] py-2 items-center bg-[#141414]/60 ${
                        isMoved && ``
                    }`}
                >
                    <ChevronLeftIcon
                        className={`  chevron left-2  ${
                            isMoved && `group-hover:opacity-100 cursor-pointer`
                        }`}
                        onClick={() => handleClick('left')}
                    ></ChevronLeftIcon>
                </div>
                <div
                    ref={rowRef}
                    className="relative  px-60 h- py-2 flex  pl-14 space-x-2 scrollbar-hide overflow-x-scroll"
                >
                    {content.map((item) => {
                        return <Thumbnail key={item.id} content={item} />
                    })}
                </div>
                <div
                    className={`absolute flex z-30 h-[100%] py-2  right-0 items-center bg-[#141414]/60 ${
                        isMoved && ``
                    }`}
                >
                    <ChevronRightIcon
                        className=" chevron  right-2 group-hover:opacity-100  "
                        onClick={() => handleClick('right')}
                    ></ChevronRightIcon>
                </div>
            </div>
        </div>
    )
}

export default Row

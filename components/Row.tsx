import React, { useRef, useState } from 'react'
import { Movie } from '../typings'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid'
import Thumbnail from './Thumbnail'
import { type } from 'os'

interface Props {
    title: string
    movies: Movie[]
}
function Row({ title, movies }: Props) {
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
        <div className="pb-[3rem]">
            <h2 className=" text-[#e5e5e5] transition duration-200 hover:text-white lg:text-3xl lg:font-semibold  px-16  w-max ">
                {title}
            </h2>
            <div className="relative w-screen flex group  ">
                <ChevronLeftIcon
                    className={`  chevron left-5 z-10   ${
                        isMoved && `group-hover:opacity-100 cursor-pointer`
                    }`}
                    onClick={() => handleClick('left')}
                ></ChevronLeftIcon>
                <div
                    ref={rowRef}
                    className=" right-0 h-45 px-16 py-2 flex space-x-2 scrollbar-hide overflow-x-scroll"
                >
                    {movies.map((m) => {
                        return <Thumbnail key={m.id} movie={m} />
                    })}
                </div>

                <ChevronRightIcon
                    className="absolute chevron  right-5  group-hover:opacity-100  "
                    onClick={() => handleClick('right')}
                ></ChevronRightIcon>
            </div>
        </div>
    )
}

export default Row

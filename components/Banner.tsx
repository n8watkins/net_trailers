import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Content, getTitle, getYear, getContentType } from '../typings'
import Image from 'next/image'
import { BASE_URL } from '../constants/movie'
import { PlayIcon } from '@heroicons/react/24/solid'
import { InformationCircleIcon } from '@heroicons/react/24/outline'
import { modalState, movieState } from '../atoms/modalAtom'
import { useRecoilState } from 'recoil'

interface Props {
    trending: Content[]
}

//pass props to Banner component
function Banner({ trending }: Props) {
    const [showModal, setShowModal] = useRecoilState(modalState)
    const [currentContent, setCurrentContent] = useRecoilState(movieState)

    const [featuredContent, setFeaturedContent] = useState<Content | null>(null)

    useEffect(() => {
        setFeaturedContent(trending[Math.floor(Math.random() * trending.length)])
    }, [trending])

    const contentImgUrl = featuredContent?.backdrop_path || featuredContent?.poster_path
    return (
        <>
            {/* background image */}
            <div className="absolute inset-0 -z-10 font-sans">
                {contentImgUrl && (
                    <Image
                        src={`${BASE_URL}/${
                            featuredContent?.backdrop_path ||
                            featuredContent?.poster_path
                        }`}
                        alt={featuredContent ? `${getTitle(featuredContent)} backdrop` : 'Content backdrop'}
                        fill
                        quality={100}
                        priority
                        style={{ objectFit: 'cover' }}
                        sizes="(max-width: 768px) 100vw, 50vw"
                    ></Image>
                )}
                <div className="absolute h-32 w-full bg-gradient-to-b from-transparent to-[#141414] bottom-0"></div>
            </div>

            {/* movie info background gradient */}
            <div className="absolute inset-0 flex flex-col justify-center px-10 md:px-16 lg:px-20 bg-gradient-to-r from-[#141414]/90 to-transparent">
                <div className="max-w-xl lg:max-w-2xl space-y-4 md:space-y-6">
                    <h1 className="text-3xl font-bold md:text-5xl lg:text-6xl xl:text-7xl leading-tight">
                        {featuredContent ? getTitle(featuredContent) : 'Loading...'}
                    </h1>
                    <div className="flex items-center space-x-2 mb-2">
                        <span className="text-sm text-gray-300">
                            {featuredContent ? getContentType(featuredContent) : ''}
                        </span>
                        <span className="text-sm text-gray-300">
                            {featuredContent ? getYear(featuredContent) : ''}
                        </span>
                    </div>
                    <p className="text-sm md:text-lg lg:text-xl leading-relaxed text-gray-200 max-w-lg lg:max-w-xl">
                        {truncateString(featuredContent?.overview)}
                    </p>

                    {/* Buttons*/}
                    <div className="flex gap-4 pt-4">
                        {/* <Link href={`/movie/${randomMovie?.id}`}> */}
                        <button className="bannerButton bg-white text-black hover:bg-white/80 transition-all duration-200 font-bold">
                            <PlayIcon className="h-6 w-6 md:h-7 md:w-7 lg:h-8 lg:w-8" />
                            <span>Play</span>
                        </button>
                        {/* </Link> */}
                        {/*more info button */}
                        {/* <Link href={`/movie/${randomMovie?.id}`}> */}
                        <button
                            className="bannerButton bg-gray-600/70 text-white hover:bg-gray-600/50 transition-all duration-200 font-semibold backdrop-blur-sm"
                            onClick={() => {
                                setShowModal(true)
                                setCurrentContent(featuredContent)
                            }}
                        >
                            <InformationCircleIcon className="h-6 w-6 md:h-7 md:w-7 lg:h-8 lg:w-8" />
                            <span>More Info</span>
                        </button>
                        {/* </Link> */}
                    </div>
                </div>
            </div>
        </>
    )
}
//helper function to truncate string to 300 characters
const truncateString = (str: string | undefined) => {
    let maxSringLength = 210
    if (str === undefined) return ''
    if (str.length <= maxSringLength) {
        return str
    } else {
        let truncated = str.substring(0, maxSringLength)
        let lastPeriod = truncated.lastIndexOf('.')
        if (lastPeriod === -1) {
            return truncated + '...'
        } else {
            return truncated.substring(0, lastPeriod)
        }
    }
}

export default Banner

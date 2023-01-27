import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Movie, TV } from '../typings'
import Image from 'next/image'
import { BASE_URL } from '../constants/movie'
import { PlayIcon } from '@heroicons/react/24/solid'
import { InformationCircleIcon } from '@heroicons/react/24/outline'

interface Props {
    trending: Movie[]
    // topRatedMovies: Movie[]
    // actionMovies: Movie[]
    // comedyMovies: Movie[]
    // horrorMovies: Movie[]
    // romanceMovies: Movie[]
    // documentaries: Movie[]
    // topRatedTV: TV[]
    // actionTV: TV[]
    // comedyTV: TV[]
    // horrorTV: TV[]
}

//pass props to Banner component
function Banner({
    trending,
}: // topRatedMovies,
// actionMovies,
// comedyMovies,
// horrorMovies,
// romanceMovies,
// documentaries,
// topRatedTV,
// actionTV,
// comedyTV,
// horrorTV,
Props) {
    //state for random movie
    const [randomMovie, setRandomMovie] = useState<Movie | null>(null)

    //randomly select a movie from trending
    useEffect(() => {
        setRandomMovie(trending[Math.floor(Math.random() * trending.length)])
    }, [trending])

    return (
        <>
            {/* background image */}
            <div className=" absolute top-0 left-0 h-[50vw] w-[100vw] -z-10 font-sans ">
                <Image
                    src={`${BASE_URL}${
                        randomMovie?.backdrop_path || randomMovie?.poster_path
                    }`}
                    alt="movie_backdrop"
                    fill
                    quality={100}
                    priority
                    style={{ objectFit: 'cover' }}
                ></Image>
                <div className=" absolute h-[14vw] w-screen bg-gradient-to-b from-transparent to-[#141414] bottom-0 "></div>
            </div>

            {/* movie info backgorund gradient */}
            <div className="absolute h-[2000px] w-[60vw] flex flex-col px-10 space-y-2  md:px-14   bg-gradient-to-l from-transparent to-[#141414]/80 ">
                <div className="absolute top-[25em] md:space-y-6">
                    <h1 className="  max-w-[30vw] pt-5 text-2xl font-bold md:text-4xl lg:text-5xl ">
                        {randomMovie?.title ||
                            randomMovie?.name ||
                            randomMovie?.original_name}
                    </h1>
                    <p className=" bottom-0  max-w-xs text-xs md:max-w-lg md:text-md lg:max-w-2xl lg:text-xl  ">
                        {truncateString(randomMovie?.overview)}
                    </p>

                    {/* Buttons*/}
                    <div className="flex gap-3  ">
                        {/* <Link href={`/movie/${randomMovie?.id}`}> */}
                        <button className="bannerButton  bg-[white] text-black hover:bg-[white]/[.6]">
                            <PlayIcon className=" md:h-10 md::w-10 lg:h-10 lg:w-10 " />
                            <div>Play</div>
                        </button>
                        {/* </Link> */}
                        {/*more info button */}
                        {/* <Link href={`/movie/${randomMovie?.id}`}> */}
                        <button className=" text-shadow-3xl bannerButton flex bg-[rgba(109,109,110,0.7)] text-[white] hover:bg-[rgba(109,109,110,0.6)] ">
                            <InformationCircleIcon className=" h-8 w-8" />
                            More Info
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

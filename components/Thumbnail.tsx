import React from 'react'
import { Movie } from '../typings'
import Image from 'next/image'

interface Props {
    movie?: Movie
}
function Thumbnail({ movie }: Props) {
    let movieImage = movie?.backdrop_path || movie?.poster_path

    return (
        <div className="relative h-28 w-[180px] md:h-36 md:w-[200px]  xl:h-[165px] xl:min-w-[290px] cursor-pointer transition duration-200 ease-out  md:hover:scale-105  ">
            {movieImage !== undefined && (
                <Image
                    src={`https://image.tmdb.org/t/p/w500${movieImage}`}
                    alt="movie_backdrop"
                    fill
                    style={{ objectFit: 'cover' }}
                    className="rounded-sm"
                    sizes="(max-width: 768px) 100vw, 50vw"
                    priority={false}
                ></Image>
            )}
        </div>
    )
}

export default Thumbnail

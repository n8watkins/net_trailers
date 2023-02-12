import React, { useRef } from 'react'
import { Movie } from '../typings'
import Image from 'next/image'
import { useRecoilState } from 'recoil'
import { modalState, movieState } from '../atoms/modalAtom'

interface Props {
    movie?: Movie
}
function Thumbnail({ movie }: Props) {
    const movieImage = movie?.poster_path
    const [showModal, setShowModal] = useRecoilState(modalState)
    const [currentMovie, setCurrentMovie] = useRecoilState(movieState)

    return (
        <div
            className="relative h-28 w-[180px] md:h-36 md:w-[200px] z-20 xl:h-[400px] xl:min-w-[290px] cursor-pointer transition duration-200 ease-out  md:hover:scale-105 "
            onClick={() => {
                setShowModal(true)
                setCurrentMovie(movie || null)
            }}
        >
            {movieImage !== undefined && (
                <Image
                    src={`https://image.tmdb.org/t/p/w500${movieImage}`}
                    alt="movie_backdrop"
                    fill
                    style={{ objectFit: 'contain' }}
                    className="rounded-sm z-20"
                    sizes="(max-width: 768px) 100vw, 50vw"
                    priority={false}
                ></Image>
            )}
        </div>
    )
}

export default Thumbnail

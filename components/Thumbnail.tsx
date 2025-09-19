import React, { useRef } from 'react'
import { Content, getTitle, getYear, getContentType } from '../typings'
import Image from 'next/image'
import { useRecoilState } from 'recoil'
import { modalState, movieState, autoPlayWithSoundState } from '../atoms/modalAtom'

interface Props {
    content?: Content
}
function Thumbnail({ content }: Props) {
    const posterImage = content?.poster_path
    const [showModal, setShowModal] = useRecoilState(modalState)
    const [currentContent, setCurrentContent] = useRecoilState(movieState)
    const [autoPlayWithSound, setAutoPlayWithSound] = useRecoilState(autoPlayWithSoundState)

    return (
        <div
            className="relative cursor-pointer transition duration-200 ease-out group
                       w-[140px] h-[200px]
                       sm:w-[160px] sm:h-[240px]
                       md:w-[180px] md:h-[270px]
                       lg:w-[200px] lg:h-[300px]
                       xl:w-[240px] xl:h-[360px]
                       md:hover:scale-105"
            onClick={() => {
                setAutoPlayWithSound(false)
                setShowModal(true)
                setCurrentContent(content || null)
            }}
        >
            {/* Movie Poster */}
            {posterImage && (
                <Image
                    src={`https://image.tmdb.org/t/p/w500${posterImage}`}
                    alt={content ? `${getTitle(content)} ${getContentType(content)}` : 'Content poster'}
                    fill
                    style={{ objectFit: 'cover' }}
                    className="rounded-md transition-opacity group-hover:opacity-80"
                    sizes="(max-width: 640px) 140px, (max-width: 768px) 160px, (max-width: 1024px) 180px, 240px"
                    priority={false}
                />
            )}

            {/* Movie Title Overlay */}
            {content && (
                <div className="absolute bottom-0 left-0 right-0 p-2 md:p-3 lg:p-4
                              bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                    <h3 className="text-white font-bold leading-tight
                                 text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl
                                 movie-title-shadow line-clamp-2 mb-1">
                        {getTitle(content)}
                    </h3>
                    <p className="text-gray-300 text-xs sm:text-sm md:text-base opacity-80">
                        {getYear(content)} • {getContentType(content)}
                    </p>
                </div>
            )}

        </div>
    )
}

export default Thumbnail

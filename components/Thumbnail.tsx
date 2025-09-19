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
            className="relative cursor-pointer transition-all duration-300 ease-out group
                       w-[140px] h-[200px]
                       sm:w-[160px] sm:h-[240px]
                       md:w-[180px] md:h-[270px]
                       lg:w-[200px] lg:h-[300px]
                       xl:w-[240px] xl:h-[360px]
                       hover:scale-110 hover:z-50"
        >
            {/* Movie Poster with Red Glow */}
            {posterImage && (
                <div className="relative w-full h-full
                              transition-all duration-300 ease-out
                              group-hover:shadow-lg group-hover:shadow-red-500/60
                              rounded-md overflow-hidden">
                    <Image
                        src={`https://image.tmdb.org/t/p/w500${posterImage}`}
                        alt={content ? `${getTitle(content)} ${getContentType(content)}` : 'Content poster'}
                        fill
                        style={{ objectFit: 'cover' }}
                        className="rounded-md transition-all duration-300"
                        sizes="(max-width: 640px) 140px, (max-width: 768px) 160px, (max-width: 1024px) 180px, 240px"
                        priority={false}
                    />

                    {/* Red glow border effect */}
                    <div className="absolute inset-0 rounded-md
                                  transition-all duration-300 ease-out
                                  group-hover:shadow-[0_0_20px_rgba(239,68,68,0.8),inset_0_0_20px_rgba(239,68,68,0.2)]
                                  group-hover:ring-2 group-hover:ring-red-500/50"></div>
                </div>
            )}

            {/* Movie Title Overlay */}
            {content && (
                <div className="absolute bottom-0 left-0 right-0 p-2 md:p-3 lg:p-4
                              bg-gradient-to-t from-black/80 via-black/40 to-transparent
                              opacity-100 group-hover:opacity-0 transition-opacity duration-300">
                    <h3 className="text-white font-bold leading-tight
                                 text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl
                                 line-clamp-2">
                        {getTitle(content)}
                    </h3>
                </div>
            )}

            {/* Hover Action Buttons */}
            {content && (
                <div className="absolute bottom-4 left-4 right-4
                              opacity-0 group-hover:opacity-100
                              transition-all duration-300 ease-out
                              transform translate-y-4 group-hover:translate-y-0
                              flex gap-2">
                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            setAutoPlayWithSound(true)
                            setShowModal(true)
                            setCurrentContent(content || null)
                        }}
                        className="bg-white text-black font-semibold
                                 px-3 py-1.5 md:px-4 md:py-2
                                 text-xs md:text-sm
                                 rounded-md hover:bg-gray-200
                                 transition-colors duration-200
                                 flex-1 flex items-center justify-center gap-1"
                    >
                        ▶ Watch Now
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            // Add to list functionality here
                            console.log('Add to list:', content.id)
                        }}
                        className="bg-gray-800/90 text-white
                                 px-2 py-1.5 md:px-3 md:py-2
                                 text-xs md:text-sm
                                 rounded-md hover:bg-gray-700
                                 transition-colors duration-200
                                 flex items-center justify-center"
                    >
                        +
                    </button>
                </div>
            )}

        </div>
    )
}

export default Thumbnail

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
                              rounded-md overflow-hidden
                              group-hover:shadow-[0_0_20px_rgba(220,38,38,0.8),0_0_40px_rgba(220,38,38,0.4)]
                              group-hover:ring-2 group-hover:ring-red-500/70">
                    <Image
                        src={`https://image.tmdb.org/t/p/w500${posterImage}`}
                        alt={content ? `${getTitle(content)} ${getContentType(content)}` : 'Content poster'}
                        fill
                        style={{ objectFit: 'cover' }}
                        className="rounded-md transition-all duration-300"
                        sizes="(max-width: 640px) 140px, (max-width: 768px) 160px, (max-width: 1024px) 180px, 240px"
                        priority={false}
                    />

                    {/* Additional red glow overlay */}
                    <div className="absolute inset-0 rounded-md
                                  transition-all duration-300 ease-out
                                  group-hover:shadow-[inset_0_0_15px_rgba(220,38,38,0.2)]"></div>
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
                              flex gap-3">
                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            setAutoPlayWithSound(true)
                            setShowModal(true)
                            setCurrentContent(content || null)
                        }}
                        className="bg-black text-red-500 font-bold
                                 px-3 py-1.5 md:px-4 md:py-2
                                 text-xs md:text-sm
                                 rounded-md hover:bg-gray-900 hover:text-red-400
                                 transition-all duration-200
                                 flex-1 flex items-center justify-center gap-1
                                 shadow-lg hover:shadow-xl
                                 border-2 border-red-500 hover:border-red-400"
                    >
                        ▶ Watch
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            // Add to list functionality here
                            console.log('Add to watchlist:', content.id)
                        }}
                        className="bg-gray-800/90 text-white
                                 px-3 py-1.5 md:px-4 md:py-2
                                 text-xs md:text-sm
                                 rounded-md hover:bg-gray-700
                                 transition-colors duration-200
                                 flex items-center justify-center gap-1
                                 shadow-lg hover:shadow-xl
                                 border border-gray-600 hover:border-gray-500"
                        title="Add to Watchlist"
                    >
                        <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                            />
                        </svg>
                    </button>
                </div>
            )}

        </div>
    )
}

export default Thumbnail

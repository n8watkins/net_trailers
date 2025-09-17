import React, { useRef } from 'react'
import { Content, getTitle, getYear, getContentType } from '../typings'
import Image from 'next/image'
import { useRecoilState } from 'recoil'
import { modalState, movieState } from '../atoms/modalAtom'

interface Props {
    content?: Content
}
function Thumbnail({ content }: Props) {
    const posterImage = content?.poster_path
    const [showModal, setShowModal] = useRecoilState(modalState)
    const [currentContent, setCurrentContent] = useRecoilState(movieState)

    return (
        <div
            className="relative h-28 w-[180px] md:h-36 md:w-[200px] z-20 xl:h-[400px] xl:min-w-[290px] cursor-pointer transition duration-200 ease-out  md:hover:scale-105 "
            onClick={() => {
                setShowModal(true)
                setCurrentContent(content || null)
            }}
        >
            {posterImage && (
                <Image
                    src={`https://image.tmdb.org/t/p/w500${posterImage}`}
                    alt={content ? `${getTitle(content)} ${getContentType(content)}` : 'Content poster'}
                    fill
                    style={{ objectFit: 'contain' }}
                    className="rounded-sm z-20"
                    sizes="(max-width: 768px) 100vw, 50vw"
                    priority={false}
                />
            )}

            {/* Optional: Add content type indicator */}
            {content && (
                <div className="absolute bottom-1 left-1 bg-black/70 text-white text-xs px-1 py-0.5 rounded">
                    {getContentType(content)} • {getYear(content)}
                </div>
            )}
        </div>
    )
}

export default Thumbnail

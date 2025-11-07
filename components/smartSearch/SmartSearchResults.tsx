'use client'

import { useState } from 'react'
import Image from 'next/image'
import { StarIcon, XMarkIcon } from '@heroicons/react/24/solid'
import { PlayIcon, InformationCircleIcon } from '@heroicons/react/24/outline'
import { useSmartSearchStore } from '../../stores/smartSearchStore'
import { useAppStore } from '../../stores/appStore'
import { getTitle, getYear } from '../../typings'

export default function SmartSearchResults() {
    const { results, removeContent } = useSmartSearchStore()
    const { openModal } = useAppStore()
    const [hoveredId, setHoveredId] = useState<number | null>(null)

    const handleRemove = (e: React.MouseEvent, tmdbId: number) => {
        e.stopPropagation()
        removeContent(tmdbId)
    }

    const handleContentClick = (content: (typeof results)[0]) => {
        openModal(content, false, false)
    }

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-8">
            {results.map((content) => {
                const posterPath = content.poster_path
                    ? `https://image.tmdb.org/t/p/w500${content.poster_path}`
                    : '/placeholder-poster.png'

                return (
                    <div
                        key={content.id}
                        className="relative group cursor-pointer"
                        onMouseEnter={() => setHoveredId(content.id)}
                        onMouseLeave={() => setHoveredId(null)}
                        onClick={() => handleContentClick(content)}
                    >
                        {/* Poster */}
                        <div className="relative aspect-[2/3] rounded-md overflow-hidden bg-gray-800">
                            <Image
                                src={posterPath}
                                alt={getTitle(content)}
                                fill
                                sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                                className="object-cover transition-transform duration-300 group-hover:scale-110"
                            />

                            {/* Remove Button */}
                            <button
                                onClick={(e) => handleRemove(e, content.id)}
                                className="
                  absolute top-2 right-2 z-10
                  p-1.5 rounded-full bg-black/70 backdrop-blur-sm
                  opacity-0 group-hover:opacity-100
                  transition-opacity duration-200
                  hover:bg-red-600
                "
                                aria-label="Remove from results"
                            >
                                <XMarkIcon className="h-4 w-4 text-white" />
                            </button>

                            {/* Hover Overlay */}
                            {hoveredId === content.id && (
                                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent p-4 flex flex-col justify-end animate-fade-in">
                                    {/* Title & Year */}
                                    <h3 className="text-white font-semibold text-sm mb-1 line-clamp-2">
                                        {getTitle(content)}
                                    </h3>
                                    <p className="text-gray-300 text-xs mb-2">{getYear(content)}</p>

                                    {/* Rating */}
                                    {content.vote_average > 0 && (
                                        <div className="flex items-center gap-1 mb-3">
                                            <StarIcon className="h-4 w-4 text-yellow-400" />
                                            <span className="text-white text-xs font-medium">
                                                {content.vote_average.toFixed(1)}
                                            </span>
                                        </div>
                                    )}

                                    {/* Action Buttons */}
                                    <div className="flex gap-2">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                openModal(content, true, true)
                                            }}
                                            className="flex-1 flex items-center justify-center gap-1 px-2 py-1 bg-white text-black rounded text-xs font-semibold hover:bg-gray-200 transition-colors"
                                        >
                                            <PlayIcon className="h-3 w-3" />
                                            <span>Play</span>
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                openModal(content, true, false)
                                            }}
                                            className="p-1 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors"
                                            aria-label="More info"
                                        >
                                            <InformationCircleIcon className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}

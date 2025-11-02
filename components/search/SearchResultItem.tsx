import React from 'react'
import Image from 'next/image'
import { Content, getTitle, getYear, isMovie } from '../../typings'

interface SearchResultItemProps {
    item: Content
    index: number
    isSelected: boolean
    onClick: (item: Content) => void
    onRef?: (el: HTMLDivElement | null) => void
}

export default function SearchResultItem({
    item,
    index,
    isSelected,
    onClick,
    onRef,
}: SearchResultItemProps) {
    return (
        <div
            key={`${item.id}-${index}`}
            ref={onRef}
            className={`flex items-center rounded-lg p-3 cursor-pointer group border transition-all duration-300 ease-in-out ${
                isSelected
                    ? 'bg-red-600/30 border-red-500/50 shadow-lg shadow-red-500/20'
                    : 'bg-gray-700/30 border-transparent hover:bg-gray-600/30 hover:border-gray-500/30'
            }`}
            onClick={() => onClick(item)}
        >
            {/* Movie Poster */}
            <div className="flex-shrink-0 w-12 h-[72px] relative rounded overflow-hidden bg-gray-600">
                {item.poster_path ? (
                    <Image
                        src={`https://image.tmdb.org/t/p/w200${item.poster_path}`}
                        alt={getTitle(item)}
                        fill
                        sizes="48px"
                        className="object-cover group-hover:scale-105 transition-transform duration-200 select-none"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                            <path
                                fillRule="evenodd"
                                d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
                                clipRule="evenodd"
                            />
                        </svg>
                    </div>
                )}
            </div>

            {/* Content Details */}
            <div className="flex-1 ml-3 min-w-0">
                {/* Title and Year */}
                <div className="flex items-start justify-between mb-1">
                    <div className="flex-1 min-w-0">
                        <h4 className="text-white font-medium text-sm truncate group-hover:text-red-400 transition-colors">
                            {getTitle(item)}
                        </h4>
                        <p className="text-gray-400 text-xs">{getYear(item)}</p>
                    </div>
                </div>

                {/* Rating and Media Type */}
                <div className="flex items-center gap-2">
                    {/* Rating */}
                    {item.vote_average > 0 && (
                        <div className="flex items-center gap-1">
                            <span className="text-yellow-400 text-xs">⭐</span>
                            <span className="text-white text-xs font-medium">
                                {item.vote_average.toFixed(1)}
                            </span>
                        </div>
                    )}

                    {/* Media Type Badge */}
                    <span
                        className={`
                        px-1.5 py-0.5 text-xs font-medium rounded
                        ${isMovie(item) ? 'bg-blue-600 text-white' : 'bg-green-600 text-white'}
                    `}
                    >
                        {isMovie(item) ? 'Movie' : 'TV'}
                    </span>
                </div>
            </div>
        </div>
    )
}

import React from 'react'
import Image from 'next/image'
import { Content, getTitle } from '../../../typings'

interface ContentInfoCardProps {
    targetContent: Content
}

function ContentInfoCard({ targetContent }: ContentInfoCardProps) {
    return (
        <div className="mb-6 p-4 bg-gradient-to-r from-gray-800/80 to-gray-900/50 rounded-lg border border-gray-700/50">
            <div className="flex items-start space-x-4">
                {/* Larger poster image */}
                <div className="relative w-24 h-36 flex-shrink-0">
                    <Image
                        src={`https://image.tmdb.org/t/p/w342${targetContent.poster_path}`}
                        alt={getTitle(targetContent)}
                        fill
                        className="object-cover rounded-lg shadow-lg"
                        sizes="(max-width: 96px) 100vw, 96px"
                    />
                </div>
                {/* Content details */}
                <div className="flex-1 min-w-0">
                    <h3 className="text-white font-bold text-lg leading-tight mb-2 line-clamp-2">
                        {getTitle(targetContent)}
                    </h3>
                    <div className="flex items-center space-x-2 mb-2">
                        <span className="inline-block px-2 py-1 bg-gray-700 rounded text-xs text-gray-300 font-medium">
                            {targetContent.media_type === 'movie' ? 'Movie' : 'TV Show'}
                        </span>
                        {targetContent.media_type === 'movie' &&
                            'release_date' in targetContent &&
                            targetContent.release_date && (
                                <span className="text-gray-400 text-sm">
                                    {new Date(targetContent.release_date).getFullYear()}
                                </span>
                            )}
                        {targetContent.media_type === 'tv' &&
                            'first_air_date' in targetContent &&
                            targetContent.first_air_date && (
                                <span className="text-gray-400 text-sm">
                                    {new Date(targetContent.first_air_date).getFullYear()}
                                </span>
                            )}
                    </div>
                    {targetContent.overview && (
                        <p className="text-gray-400 text-sm line-clamp-2 leading-relaxed">
                            {targetContent.overview}
                        </p>
                    )}
                </div>
            </div>
        </div>
    )
}

export default ContentInfoCard

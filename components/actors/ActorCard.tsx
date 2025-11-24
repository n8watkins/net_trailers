'use client'

import { useState, useCallback } from 'react'
import Image from 'next/image'
import { TrendingPerson } from '../../typings'

interface ActorCardProps {
    actor: TrendingPerson
    onClick: (actor: TrendingPerson) => void
}

export default function ActorCard({ actor, onClick }: ActorCardProps) {
    const [imageLoaded, setImageLoaded] = useState(false)
    const [imageError, setImageError] = useState(false)
    const [isHovered, setIsHovered] = useState(false)

    const profileImage = actor.profile_path
        ? `https://image.tmdb.org/t/p/w185${actor.profile_path}`
        : null

    const handleClick = useCallback(() => {
        onClick(actor)
    }, [actor, onClick])

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onClick(actor)
            }
        },
        [actor, onClick]
    )

    // Get known for titles (up to 2)
    const knownForTitles = actor.known_for
        ?.slice(0, 2)
        .map((item) => ('title' in item ? item.title : 'name' in item ? item.name : ''))
        .filter(Boolean)
        .join(', ')

    return (
        <div
            role="button"
            tabIndex={0}
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="flex flex-col items-center cursor-pointer group transition-all duration-300 w-[100px] sm:w-[120px] md:w-[140px] lg:w-[160px]"
        >
            {/* Circular Image Container */}
            <div
                className={`relative w-[80px] h-[80px] sm:w-[100px] sm:h-[100px] md:w-[120px] md:h-[120px] lg:w-[140px] lg:h-[140px] rounded-full overflow-hidden transition-all duration-300 ${
                    isHovered
                        ? 'scale-110 shadow-[0_0_20px_rgba(220,38,38,0.5)] ring-2 ring-red-500'
                        : 'shadow-lg'
                }`}
            >
                {/* Loading skeleton */}
                {!imageLoaded && profileImage && !imageError && (
                    <div className="absolute inset-0 bg-gray-800 animate-pulse flex items-center justify-center">
                        <div className="w-6 h-6 border-2 border-gray-600 border-t-red-600 rounded-full animate-spin" />
                    </div>
                )}

                {/* Profile image or placeholder */}
                {profileImage && !imageError ? (
                    <Image
                        src={profileImage}
                        alt={actor.name}
                        fill
                        style={{ objectFit: 'cover' }}
                        className={`transition-all duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                        sizes="(max-width: 640px) 80px, (max-width: 768px) 100px, (max-width: 1024px) 120px, 140px"
                        onLoad={() => setImageLoaded(true)}
                        onError={() => setImageError(true)}
                    />
                ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
                        <span className="text-3xl sm:text-4xl md:text-5xl">
                            {actor.gender === 1 ? '👩' : '👨'}
                        </span>
                    </div>
                )}

                {/* Hover overlay */}
                <div
                    className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity duration-300 ${
                        isHovered ? 'opacity-100' : 'opacity-0'
                    }`}
                >
                    <span className="text-white text-xs sm:text-sm font-medium px-2 py-1 bg-red-600 rounded-full">
                        View Films
                    </span>
                </div>
            </div>

            {/* Actor Name */}
            <h3
                className={`mt-3 text-center font-semibold text-sm sm:text-base transition-colors duration-300 line-clamp-2 ${
                    isHovered ? 'text-red-400' : 'text-white'
                }`}
            >
                {actor.name}
            </h3>

            {/* Known For */}
            {knownForTitles && (
                <p className="mt-1 text-center text-xs text-gray-400 line-clamp-1 px-1">
                    {knownForTitles}
                </p>
            )}
        </div>
    )
}

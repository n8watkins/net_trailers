'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { TrendingPerson } from '../../typings'
import { PersonRoleFilter } from '../../utils/personRole'

interface ActorCardProps {
    actor: TrendingPerson
    /** Optional genre filter to pass to person page */
    genreFilter?: string
    /** Optional role filter (defaults to acting for legacy behavior) */
    defaultRole?: PersonRoleFilter
}

export default function ActorCard({ actor, genreFilter, defaultRole = 'acting' }: ActorCardProps) {
    const router = useRouter()
    const [imageLoaded, setImageLoaded] = useState(false)
    const [imageError, setImageError] = useState(false)
    const [isHovered, setIsHovered] = useState(false)

    const profileImage = actor.profile_path
        ? `https://image.tmdb.org/t/p/w185${actor.profile_path}`
        : null

    // Build URL with optional role/genre filters
    const buildPersonUrl = () => {
        const params = new URLSearchParams()
        if (defaultRole) {
            params.set('role', defaultRole)
        }
        if (genreFilter) {
            params.set('genre', genreFilter)
        }
        const queryString = params.toString()
        return queryString ? `/person/${actor.id}?${queryString}` : `/person/${actor.id}`
    }

    const handleClick = () => {
        router.push(buildPersonUrl())
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            router.push(buildPersonUrl())
        }
    }

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
            className="flex flex-col items-center cursor-pointer group transition-all duration-300 w-[120px] sm:w-[150px] md:w-[180px] lg:w-[200px]"
        >
            {/* Circular Image Container */}
            <div
                className={`relative w-[120px] h-[120px] sm:w-[150px] sm:h-[150px] md:w-[180px] md:h-[180px] lg:w-[200px] lg:h-[200px] rounded-full overflow-hidden transition-all duration-300 ${
                    isHovered
                        ? 'scale-105 shadow-[0_0_20px_rgba(220,38,38,0.5)] ring-2 ring-red-500'
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
                        sizes="(max-width: 640px) 120px, (max-width: 768px) 150px, (max-width: 1024px) 180px, 200px"
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

                {/* Hover overlay - subtle darkening */}
                <div
                    className={`absolute inset-0 bg-black/20 transition-opacity duration-300 ${
                        isHovered ? 'opacity-100' : 'opacity-0'
                    }`}
                />
            </div>

            {/* Actor Name */}
            <h3 className="mt-3 text-center font-semibold text-base sm:text-lg text-white line-clamp-2">
                {actor.name}
            </h3>

            {/* Known For */}
            {knownForTitles && (
                <p className="mt-1 text-center text-sm text-gray-400 line-clamp-1 px-1">
                    {knownForTitles}
                </p>
            )}
        </div>
    )
}

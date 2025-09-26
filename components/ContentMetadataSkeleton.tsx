import React from 'react'

export default function ContentMetadataSkeleton() {
    return (
        <div
            className="text-white space-y-4 sm:space-y-6 animate-pulse"
            style={{ textShadow: '0 0 3px rgba(0, 0, 0, .8)' }}
        >
            {/* Title Skeleton */}
            <div className="space-y-2">
                <div className="h-8 sm:h-12 md:h-14 lg:h-16 bg-gray-700/50 rounded-md w-3/4" />
                <div className="h-6 sm:h-8 md:h-10 lg:h-12 bg-gray-700/50 rounded-md w-1/2" />
            </div>

            {/* Debug Button Skeleton */}
            <div className="h-8 sm:h-10 bg-gray-700/50 rounded-md w-32" />

            {/* Year, Rating, Runtime, Type Skeleton */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <div className="h-5 sm:h-6 bg-gray-700/50 rounded w-12" />
                <div className="h-4 w-1 bg-gray-600/50" />
                <div className="h-5 sm:h-6 bg-gray-700/50 rounded w-8" />
                <div className="h-4 w-1 bg-gray-600/50" />
                <div className="h-5 sm:h-6 bg-gray-700/50 rounded w-16" />
                <div className="h-4 w-1 bg-gray-600/50" />
                <div className="h-5 sm:h-6 bg-gray-700/50 rounded w-12" />
            </div>

            {/* Overview Skeleton */}
            <div className="space-y-2">
                <div className="h-4 bg-gray-700/50 rounded w-full" />
                <div className="h-4 bg-gray-700/50 rounded w-full" />
                <div className="h-4 bg-gray-700/50 rounded w-3/4" />
            </div>

            {/* Director & Cast Skeleton */}
            <div className="space-y-3 text-sm">
                {/* Director */}
                <div className="flex items-center space-x-2">
                    <div className="h-4 bg-gray-600/50 rounded w-16" />
                    <div className="h-4 bg-gray-700/50 rounded w-32" />
                </div>

                {/* Cast */}
                <div className="flex items-center space-x-2">
                    <div className="h-4 bg-gray-600/50 rounded w-8" />
                    <div className="h-4 bg-gray-700/50 rounded w-48" />
                </div>

                {/* Genres */}
                <div className="flex items-center space-x-2">
                    <div className="h-4 bg-gray-600/50 rounded w-12" />
                    <div className="h-4 bg-gray-700/50 rounded w-40" />
                </div>

                {/* IMDb */}
                <div className="flex items-center space-x-2">
                    <div className="h-4 bg-gray-600/50 rounded w-10" />
                    <div className="h-4 bg-gray-700/50 rounded w-24" />
                </div>
            </div>
        </div>
    )
}

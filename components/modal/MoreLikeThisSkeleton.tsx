/**
 * Skeleton loading state for More Like This section
 * Maintains consistent height while recommendations load
 */

export default function MoreLikeThisSkeleton() {
    return (
        <div className="space-y-6 border-t border-gray-700 pt-6 animate-pulse">
            {/* Header skeleton */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4 pb-2">
                <div className="h-8 bg-gray-700/50 rounded w-48"></div>
                <div className="h-10 bg-gray-700/50 rounded-full w-48"></div>
            </div>

            {/* Grid skeleton - 12 cards in 2x6 or 3x4 or 4x3 layout */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
                {Array.from({ length: 12 }).map((_, index) => (
                    <div key={index} className="space-y-2">
                        {/* Card image skeleton - maintaining 2:3 aspect ratio */}
                        <div className="relative aspect-[2/3] bg-gray-700/50 rounded-md overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gray-600/30 to-transparent animate-shimmer"></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

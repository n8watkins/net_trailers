import React from 'react'
import { CheckIcon, PlusIcon } from '@heroicons/react/24/solid'
import { Content, getTitle } from '../typings'
import useUserData from '../hooks/useUserData'
import { useToast } from '../hooks/useToast'
import ToolTipMod from './ToolTipMod'

interface WatchLaterButtonProps {
    content: Content
    variant?: 'thumbnail' | 'modal'
    className?: string
}

function WatchLaterButton({ content, variant = 'modal', className = '' }: WatchLaterButtonProps) {
    const { addToWatchlist, removeFromWatchlist, isInWatchlist } = useUserData()
    const { showSuccess, showError } = useToast()

    const isInList = isInWatchlist(content.id)

    const handleWatchlistToggle = (e: React.MouseEvent) => {
        e.stopPropagation()
        try {
            if (isInList) {
                removeFromWatchlist(content.id)
                showSuccess('Removed from Watchlist', `${getTitle(content)} has been removed from your watchlist`)
            } else {
                addToWatchlist(content)
                showSuccess('Added to Watchlist', `${getTitle(content)} has been added to your watchlist`)
            }
        } catch (error) {
            showError('Error', 'Failed to update watchlist. Please try again.')
        }
    }

    if (variant === 'thumbnail') {
        return (
            <button
                onClick={handleWatchlistToggle}
                className={`${
                    isInList
                        ? 'bg-red-600/90 border-red-500 hover:bg-red-700'
                        : 'bg-gray-800/90 border-gray-600 hover:bg-gray-700'
                } text-white
                         px-3 py-1.5 md:px-4 md:py-2
                         text-xs md:text-sm
                         rounded-md hover:scale-105
                         transition-all duration-200
                         flex items-center justify-center gap-1
                         shadow-lg hover:shadow-xl
                         border hover:border-gray-500
                         group/watchlist ${className}`}
                title={isInList ? "Remove from Watchlist" : "Add to Watchlist"}
            >
                <svg
                    className={`w-4 h-4 group-hover/watchlist:scale-110 transition-transform duration-200 ${
                        isInList ? 'fill-current' : 'fill-none'
                    }`}
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
        )
    }

    // Modal variant
    return (
        <ToolTipMod title={isInList ? "Remove from My List" : "Add to My List"}>
            <button
                className={`p-2 sm:p-3 rounded-full border-2 border-white/30 bg-black/20 hover:bg-black/50 hover:border-white text-white transition-all duration-200 ${className}`}
                onClick={handleWatchlistToggle}
            >
                {isInList ? (
                    <CheckIcon className="h-4 w-4 sm:h-6 sm:w-6" />
                ) : (
                    <PlusIcon className="h-4 w-4 sm:h-6 sm:w-6" />
                )}
            </button>
        </ToolTipMod>
    )
}

export default WatchLaterButton
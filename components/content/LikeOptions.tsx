import React, { useState } from 'react'
import ToolTipMod from '../common/ToolTipMod'
import { useAppStore } from '../../stores/appStore'
import { useLikedHidden } from '../../hooks/useLikedHidden'
import { Content } from '../../typings'
import {
    HandThumbUpIcon as HandThumbUpIconOutline,
    HandThumbDownIcon as HandThumbDownIconOutline,
} from '@heroicons/react/24/outline'

import {
    HandThumbUpIcon as HandThumbUpIconFilled,
    HandThumbDownIcon as HandThumbDownIconFilled,
} from '@heroicons/react/24/solid'

function LikeOptions() {
    const { modal, showDemoMessage, setShowDemoMessage } = useAppStore()
    const currentMovie = modal.content?.content || null
    const {
        isLiked,
        isHidden,
        addLikedMovie,
        removeLikedMovie,
        addHiddenMovie,
        removeHiddenMovie,
        likedMovies,
    } = useLikedHidden()

    const [showOptions, setShowOptions] = useState(false)

    // Get current liked/hidden status
    const userRating = {
        disliked: currentMovie ? isHidden(currentMovie.id) : false,
        liked: currentMovie ? isLiked(currentMovie.id) : false,
    }

    const rated = userRating.liked || userRating.disliked
    const handleMouseEnter = () => {
        setShowOptions(true)
    }
    const handleMouseLeave = () => {
        setShowOptions(false)
    }
    // Handle rating changes
    const handleRatingChange = (rating: 'liked' | 'disliked') => {
        if (!currentMovie) return

        // Show demo message for first-time users
        if (showDemoMessage && likedMovies.length === 0) {
            setShowDemoMessage(true)
        }

        const contentObj = currentMovie as Content

        if (rating === 'liked') {
            if (userRating.liked) {
                // Remove if already liked
                removeLikedMovie(contentObj.id)
            } else {
                // Add to liked (automatically removes from hidden due to mutual exclusion)
                addLikedMovie(contentObj)
            }
        } else {
            // rating === 'disliked'
            if (userRating.disliked) {
                // Remove if already hidden
                removeHiddenMovie(contentObj.id)
            } else {
                // Add to hidden (automatically removes from liked due to mutual exclusion)
                addHiddenMovie(contentObj)
            }
        }
    }

    return (
        <div>
            <div className="relative flex z-20 items-center justify-center ">
                {/*//tooltip for liking*/}

                {userRating.liked ? (
                    <HandThumbUpIconFilled
                        className={`ratingIcon IconDimensions z-10 border-solid border-2 animate-yee border-white/30
                            ${showOptions ? 'border-transparent' : ''}
                            ${rated ? 'hover:bg-transparent ' : 'hover:bg-gray-800 '}`}
                        onMouseEnter={handleMouseEnter}
                        onClick={() => handleRatingChange('liked')}
                    />
                ) : userRating.disliked ? (
                    <HandThumbDownIconFilled
                        className={`ratingIcon IconDimensions z-10 border-solid border-2 animate-boo border-white/30
                            ${showOptions ? 'border-transparent' : ''}
                            ${rated ? 'hover:bg-transparent ' : 'hover:bg-gray-800 '}`}
                        onMouseEnter={handleMouseEnter}
                        onClick={() => handleRatingChange('disliked')}
                    />
                ) : (
                    <ToolTipMod title="I like this">
                        <HandThumbUpIconOutline
                            className={`ratingIcon IconDimensions z-30  border-solid border-2 border-white/30
                            ${showOptions ? 'border-transparent' : ''}`}
                            onMouseEnter={handleMouseEnter}
                            onClick={() => handleRatingChange('liked')}
                        />
                    </ToolTipMod>
                )}
                <div
                    className={`absolute bg-[#141414]  h-14 items-center rounded-3xl justify-center
                                   ${
                                       showOptions
                                           ? 'transition-width duration-200 opacity-100  drop-shadow-4xl  w-36'
                                           : 'opacity-0'
                                   }`}
                    onMouseLeave={handleMouseLeave}
                >
                    {/* Show thumbs down when not currently selected */}
                    {!userRating.disliked && (
                        <ToolTipMod title="Not for me">
                            <HandThumbDownIconOutline
                                className={`ratingIcon  IconDimensions top-1 left-[4.5rem]  ${
                                    showOptions ? 'translateLeft ' : 'text-transparent '
                                }`}
                                onClick={() => handleRatingChange('disliked')}
                            />
                        </ToolTipMod>
                    )}

                    {/* Show thumbs up when not currently selected */}
                    {!userRating.liked && (
                        <ToolTipMod title="I like this">
                            <HandThumbUpIconOutline
                                className={`ratingIcon  IconDimensions top-1 left-[2.2rem]  ${
                                    showOptions ? 'translateLeft ' : 'text-transparent '
                                }`}
                                onClick={() => handleRatingChange('liked')}
                            />
                        </ToolTipMod>
                    )}
                </div>
            </div>
        </div>
    )
}

export default LikeOptions

import React, { useEffect, useState } from 'react'
import ToolTipMod from './ToolTipMod'
import { useRecoilValue, useRecoilState } from 'recoil'
import { movieState } from '../atoms/modalAtom'
import { showDemoMessageState } from '../atoms/userDataAtom'
import { useRatings } from '../hooks/useRatings'
import { Content } from '../typings'
import {
    HandThumbUpIcon as HandThumbUpIconOutline,
    HandThumbDownIcon as HandThumbDownIconOutline,
} from '@heroicons/react/24/outline'

import {
    HandThumbUpIcon as HandThumbUpIconFilled,
    HandThumbDownIcon as HandThumbDownIconFilled,
} from '@heroicons/react/24/solid'

function LikeOptions() {
    const currentMovie = useRecoilValue(movieState)
    const { getRating, setRating, removeRating, ratings } = useRatings()
    const [showDemoMessage, setShowDemoMessage] = useRecoilState(showDemoMessageState)

    const [showOptions, setShowOptions] = useState(false)

    // Get current rating from user data
    const currentRating = currentMovie ? getRating(currentMovie.id) : null

    const userRating = {
        disliked: currentRating?.rating === 'disliked',
        liked: currentRating?.rating === 'liked',
    }

    const rated = currentRating !== null
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
        if (showDemoMessage && ratings.length === 0) {
            setShowDemoMessage(true)
        }

        if (currentRating?.rating === rating) {
            // Remove rating if clicking the same rating
            removeRating(currentMovie.id)
        } else {
            // Set new rating with the content object (ensure it's a Content object)
            const contentObj = currentMovie as Content
            setRating(contentObj.id, rating, contentObj)
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

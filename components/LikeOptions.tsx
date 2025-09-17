import React, { useEffect, useState } from 'react'
import ToolTipMod from './ToolTipMod'
import { useRecoilValue, useRecoilState } from 'recoil'
import { movieState } from '../atoms/modalAtom'
import { showDemoMessageState } from '../atoms/userDataAtom'
import useUserData from '../hooks/useUserData'
import {
    HandThumbUpIcon as HandThumbUpIconOutline,
    HeartIcon as HeartIconOutline,
    HandThumbDownIcon as HandThumbDownIconOutline,
} from '@heroicons/react/24/outline'

import {
    HandThumbUpIcon as HandThumbUpIconFilled,
    HeartIcon as HeartIconFilled,
    HandThumbDownIcon as HandThumbDownIconFilled,
} from '@heroicons/react/24/solid'

function LikeOptions() {
    const currentMovie = useRecoilValue(movieState)
    const { getRating, setRating, removeRating, ratings } = useUserData()
    const [showDemoMessage, setShowDemoMessage] = useRecoilState(showDemoMessageState)

    const [showOptions, setShowOptions] = useState(false)

    // Get current rating from user data
    const currentRating = currentMovie ? getRating(currentMovie.id) : null

    const userRating = {
        disliked: currentRating?.rating === 'disliked',
        liked: currentRating?.rating === 'liked',
        loved: currentRating?.rating === 'loved',
    }

    const rated = currentRating !== null
    const handleMouseEnter = () => {
        setShowOptions(true)
    }
    const handleMouseLeave = () => {
        setShowOptions(false)
    }
    // Handle rating changes
    const handleRatingChange = (rating: 'liked' | 'disliked' | 'loved') => {
        if (!currentMovie) return

        // Show demo message for first-time users
        if (showDemoMessage && ratings.length === 0) {
            setShowDemoMessage(true)
        }

        if (currentRating?.rating === rating) {
            // Remove rating if clicking the same rating
            removeRating(currentMovie.id)
        } else {
            // Set new rating
            setRating(currentMovie.id, rating)
        }
    }
    
    return (
        <div>
            <div className="relative flex left-5 top-5 lg:top-[1.35rem] z-20 items-center justify-center ">
                {/*//tooltip for liking*/}

                {userRating.liked ? (
                    <HandThumbUpIconFilled
                        className={`ratingIcon IconDimensions z-10 border-solid border-2 animate-yee border-white/30
                            ${showOptions ? 'border-transparent' : ''}
                            ${
                                rated
                                    ? 'hover:bg-transparent '
                                    : 'hover:bg-gray-800 '
                            }`}
                        onMouseEnter={handleMouseEnter}
                        onClick={() => handleRatingChange('liked')}
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
                                           ? 'transition-width duration-200 opacity-100  drop-shadow-4xl  w-44'
                                           : 'opacity-0'
                                   }`}
                    onMouseLeave={handleMouseLeave}
                >
                    {userRating.disliked ? (
                        <div
                            className={`transition-all duration-300  ${
                                showOptions ? 'translateLeft' : ''
                            }`}
                        >
                            <HandThumbDownIconFilled
                                className={`ratingIcon  IconDimensions top-1 left-[4.5rem] animate-boo ${
                                    showOptions ? ' ' : 'text-transparent '
                                } ${
                                    rated
                                        ? 'hover:bg-transparent '
                                        : 'hover:bg-gray-800 '
                                }`}
                                onClick={() => handleRatingChange('disliked')}
                            />
                        </div>
                    ) : (
                        <ToolTipMod title="Not for me">
                            <HandThumbDownIconOutline
                                className={`ratingIcon  IconDimensions top-1 left-[4.5rem]  ${
                                    showOptions
                                        ? 'translateLeft '
                                        : 'text-transparent '
                                }`}
                                onClick={() => handleRatingChange('disliked')}
                            />
                        </ToolTipMod>
                    )}

                    {userRating.loved ? (
                        <div
                            className={`transition-all duration-300  ${
                                showOptions ? 'translateRight' : ''
                            }`}
                        >
                            <HeartIconFilled
                                className={`ratingIcon  IconDimensions absolute  top-1 right-[4.6rem] animate-scaleUp  text-red-400 ${
                                    showOptions ? '' : 'text-transparent '
                                } ${
                                    rated
                                        ? 'hover:bg-transparent '
                                        : 'hover:bg-gray-800 '
                                }`}
                                onClick={() => handleRatingChange('loved')}
                            />
                        </div>
                    ) : (
                        <ToolTipMod title="Love this!">
                            <HeartIconOutline
                                className={`ratingIcon  IconDimensions top-1 right-[4.5rem]   ${
                                    showOptions
                                        ? 'translateRight '
                                        : 'text-transparent '
                                }`}
                                onClick={() => handleRatingChange('loved')}
                            />
                        </ToolTipMod>
                    )}
                </div>
            </div>
        </div>
    )
}

export default LikeOptions

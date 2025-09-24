import React, { useState } from 'react'
import ToolTipMod from './ToolTipMod'
import { useRecoilValue, useRecoilState } from 'recoil'
import { movieState } from '../atoms/modalAtom'
import { showDemoMessageState } from '../atoms/userDataAtom'
import useUserData from '../hooks/useUserData'
import { Content } from '../typings'
import { HandThumbUpIcon as HandThumbUpIconOutline } from '@heroicons/react/24/outline'

import { HandThumbUpIcon as HandThumbUpIconFilled } from '@heroicons/react/24/solid'

function SimpleLikeButton() {
    const currentMovie = useRecoilValue(movieState)
    const { getRating, setRating, removeRating, ratings } = useUserData()
    const [showDemoMessage, setShowDemoMessage] = useRecoilState(showDemoMessageState)
    const [isAnimating, setIsAnimating] = useState(false)

    // Get current rating from user data
    const currentRating = currentMovie ? getRating(currentMovie.id) : null
    const isLiked = currentRating?.rating === 'liked'

    // Handle like toggle
    const handleLikeToggle = () => {
        if (!currentMovie) return

        // Show demo message for first-time users
        if (showDemoMessage && ratings.length === 0) {
            setShowDemoMessage(true)
        }

        // Trigger animation when liking (not when unliking)
        if (!isLiked) {
            setIsAnimating(true)
            setTimeout(() => setIsAnimating(false), 800) // Animation duration
        }

        if (isLiked) {
            // Remove rating if already liked
            removeRating(currentMovie.id)
        } else {
            // Set like rating with the content object
            const contentObj = currentMovie as Content
            setRating(contentObj.id, 'liked', contentObj)
        }
    }

    return (
        <ToolTipMod title={isLiked ? 'Unlike' : 'Like'}>
            <button
                className={`relative p-2 sm:p-3 rounded-full border-2 border-white/30 bg-black/20 hover:bg-black/50 hover:border-white text-white transition-all duration-200 ${
                    isAnimating ? 'animate-pulse scale-105' : ''
                }`}
                onClick={handleLikeToggle}
            >
                {isLiked ? (
                    <HandThumbUpIconFilled
                        className={`h-4 w-4 sm:h-6 sm:w-6 text-white transition-all duration-300 drop-shadow-lg ${
                            isAnimating ? 'animate-heartBeat' : 'hover:scale-110'
                        }`}
                    />
                ) : (
                    <HandThumbUpIconOutline
                        className={`h-4 w-4 sm:h-6 sm:w-6 text-white/70 transition-all duration-300 hover:text-white ${
                            isAnimating ? 'animate-heartBeat' : 'hover:scale-110'
                        }`}
                    />
                )}
            </button>
        </ToolTipMod>
    )
}

export default SimpleLikeButton

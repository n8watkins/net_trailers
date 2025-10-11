import React, { useState } from 'react'
import ToolTipMod from './ToolTipMod'
import { Content, getTitle } from '../typings'
import { HandThumbUpIcon as HandThumbUpIconOutline } from '@heroicons/react/24/outline'
import { HandThumbUpIcon as HandThumbUpIconFilled } from '@heroicons/react/24/solid'
import useUserData from '../hooks/useUserData'
import { useToast } from '../hooks/useToast'
import { useAppStore } from '../stores/appStore'

function SimpleLikeButton() {
    // Get current movie from Zustand store
    const { modal } = useAppStore()
    const currentMovie = modal.content?.content || null

    // Use new schema hooks
    const { isLiked: checkIsLiked, addLikedMovie, removeLikedMovie } = useUserData()
    const { showSuccess } = useToast()
    const [isAnimating, setIsAnimating] = useState(false)

    // Get current liked status
    const isLiked = currentMovie ? checkIsLiked(currentMovie.id) : false

    // Handle like toggle
    const handleLikeToggle = () => {
        if (!currentMovie) return

        // Trigger animation when liking (not when unliking)
        if (!isLiked) {
            setIsAnimating(true)
            setTimeout(() => setIsAnimating(false), 800) // Animation duration
        }

        const contentObj = currentMovie as Content
        if (isLiked) {
            // Remove if already liked
            removeLikedMovie(contentObj.id)
            showSuccess(`Unliked ${getTitle(contentObj)}`, 'Removed from your liked content')
        } else {
            // Add to liked
            addLikedMovie(contentObj)
            showSuccess(`Liked ${getTitle(contentObj)}`, 'Added to your liked content')
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

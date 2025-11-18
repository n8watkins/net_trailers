import React, { useState, useRef, useEffect } from 'react'
import ToolTipMod from '../common/ToolTipMod'
import { Content, getTitle } from '../../typings'
import { HandThumbUpIcon as HandThumbUpIconOutline } from '@heroicons/react/24/outline'
import { HandThumbUpIcon as HandThumbUpIconFilled } from '@heroicons/react/24/solid'
import useUserData from '../../hooks/useUserData'
import { useToast } from '../../hooks/useToast'
import { useModalStore } from '../../stores/modalStore'

function SimpleLikeButton() {
    // Get current movie from Zustand store
    const { modal } = useModalStore()
    const currentMovie = modal.content?.content || null

    // Use new schema hooks
    const { isLiked: checkIsLiked, addLikedMovie, removeLikedMovie } = useUserData()
    const { showSuccess } = useToast()

    // Animation state (matching ContentCard pattern)
    const [likeAnimationType, setLikeAnimationType] = useState<'like' | 'unlike' | null>(null)
    const [likeAnimationIteration, setLikeAnimationIteration] = useState(0)
    const likeAnimationTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    // Get current liked status
    const isLiked = currentMovie ? checkIsLiked(currentMovie.id) : false

    // Cleanup animation timeout on unmount
    useEffect(() => {
        return () => {
            if (likeAnimationTimeoutRef.current) {
                clearTimeout(likeAnimationTimeoutRef.current)
            }
        }
    }, [])

    // Trigger animation function (matching ContentCard pattern)
    const triggerLikeAnimation = (type: 'like' | 'unlike') => {
        if (likeAnimationTimeoutRef.current) {
            clearTimeout(likeAnimationTimeoutRef.current)
        }

        // Force state change even if same animation is triggered consecutively
        setLikeAnimationType(null)
        requestAnimationFrame(() => {
            setLikeAnimationType(type)
            setLikeAnimationIteration((prev) => prev + 1)
            likeAnimationTimeoutRef.current = setTimeout(() => {
                setLikeAnimationType(null)
            }, 450)
        })
    }

    // Handle like toggle
    const handleLikeToggle = () => {
        if (!currentMovie) return

        const contentObj = currentMovie as Content
        if (isLiked) {
            // Remove if already liked
            triggerLikeAnimation('unlike')
            removeLikedMovie(contentObj.id)
            showSuccess(`Unliked ${getTitle(contentObj)}`, 'Removed from your liked content')
        } else {
            // Add to liked
            triggerLikeAnimation('like')
            addLikedMovie(contentObj)
            showSuccess(`Liked ${getTitle(contentObj)}`, 'Added to your liked content')
        }
    }

    return (
        <ToolTipMod title={isLiked ? 'Unlike' : 'Like'}>
            <button
                className="group relative p-2 sm:p-3 rounded-full border-2 border-white/30 bg-black/20 hover:bg-black/50 hover:border-white text-white transition-colors duration-200"
                onClick={handleLikeToggle}
            >
                {isLiked ? (
                    <HandThumbUpIconFilled
                        key={`liked-${likeAnimationIteration}`}
                        className="h-4 w-4 sm:h-6 sm:w-6 text-white"
                        style={
                            likeAnimationType
                                ? {
                                      animation: `scale-pulse-${likeAnimationType} 0.45s ease-in-out`,
                                  }
                                : undefined
                        }
                    />
                ) : (
                    <HandThumbUpIconOutline
                        key={`outline-${likeAnimationIteration}`}
                        className="h-4 w-4 sm:h-6 sm:w-6 text-white/70 group-hover:text-white transition-colors"
                        style={
                            likeAnimationType
                                ? {
                                      animation: `scale-pulse-${likeAnimationType} 0.45s ease-in-out`,
                                  }
                                : undefined
                        }
                    />
                )}
            </button>
        </ToolTipMod>
    )
}

export default SimpleLikeButton

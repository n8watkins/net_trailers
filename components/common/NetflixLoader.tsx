'use client'

import React, { useState, useEffect, useMemo } from 'react'

interface Props {
    message?: string
    inline?: boolean // New prop to control full-page vs inline mode
    slowCounter?: boolean // Slower counter animation for longer operations like Gemini requests
    progress?: number // Actual loading progress (0-100), overrides fake counter if provided
}

const NetflixLoader: React.FC<Props> = ({
    message = 'Loading your movies...',
    inline = false,
    slowCounter = false,
    progress,
}) => {
    const [loadingCounter, setLoadingCounter] = useState(0)
    const [loadingMessage, setLoadingMessage] = useState('🎬 Finding your favorite movies...')

    // Use actual progress if provided, otherwise use fake counter
    const displayProgress = progress !== undefined ? progress : loadingCounter

    // Prevent scrolling while loading (only in full-page mode)
    useEffect(() => {
        if (inline) return // Skip scroll prevention in inline mode

        // Save original overflow style
        const originalOverflow = document.body.style.overflow
        const originalPosition = document.body.style.position

        // Prevent scrolling
        document.body.style.overflow = 'hidden'
        document.body.style.position = 'fixed'
        document.body.style.width = '100%'

        // Cleanup: restore scrolling when component unmounts
        return () => {
            document.body.style.overflow = originalOverflow
            document.body.style.position = originalPosition
            document.body.style.width = ''

            // Scroll to top after loading completes
            window.scrollTo({ top: 0, behavior: 'instant' })
        }
    }, [inline])

    // Counter animation for loading (only if progress prop not provided)
    useEffect(() => {
        // Skip fake counter if actual progress is being provided
        if (progress !== undefined) return

        setLoadingCounter(0)
        setLoadingMessage('🎬 Finding your favorite movies...')

        // Counter animation - much slower for Gemini requests (5 seconds), faster for regular loads
        const increment = slowCounter ? 1 : 2 // Slower increment for Gemini
        const interval = slowCounter ? 50 : 15 // Much slower interval for Gemini (5 seconds total)

        const counterInterval = setInterval(() => {
            setLoadingCounter((prev) => {
                if (prev >= 100) {
                    clearInterval(counterInterval)
                    return 100
                }
                return prev + increment
            })
        }, interval)

        // Message rotation - independent of counter with longer delay
        const messages = [
            '🎬 Finding favorites...',
            '🍿 Popping corn...',
            '🎭 Auditioning films...',
            '📽️ Rolling carpet...',
            '🌟 Polishing Oscars...',
            '🎪 Setting up...',
            '🎨 Creating magic...',
            '🚀 Almost there...',
            '🎉 Ready to binge...',
            '✨ Movies await!',
        ]

        let messageIndex = 0
        const messageInterval = setInterval(() => {
            messageIndex = (messageIndex + 1) % messages.length
            setLoadingMessage(messages[messageIndex])
        }, 1100) // 1.1 seconds - readable but not too slow

        return () => {
            clearInterval(counterInterval)
            clearInterval(messageInterval)
        }
    }, [slowCounter, progress])

    // Memoize the bouncing dots to prevent re-renders from affecting animation
    const bouncingDots = useMemo(
        () => (
            <div className="flex space-x-3 justify-center mb-6">
                <div className="w-6 h-6 bg-red-600 rounded-full bounce-dot-1"></div>
                <div className="w-6 h-6 bg-red-600 rounded-full bounce-dot-2"></div>
                <div className="w-6 h-6 bg-red-600 rounded-full bounce-dot-3"></div>
            </div>
        ),
        [] // Never re-create this element
    )

    return (
        <div
            className={
                inline
                    ? 'py-32 flex items-center justify-center min-h-[60vh]'
                    : 'fixed inset-0 z-[9999] bg-[#141414] flex items-center justify-center'
            }
        >
            <div className="text-center max-w-[90vw] sm:max-w-md px-4 sm:px-6">
                {bouncingDots}
                <p className="text-white text-xl mb-2 min-h-[3rem] flex items-center justify-center">
                    {loadingMessage}
                </p>
                <p className="text-gray-400 text-sm">{message}</p>
            </div>
        </div>
    )
}

export default NetflixLoader

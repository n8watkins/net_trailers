'use client'

import React, { useState, useEffect } from 'react'

interface Props {
    message?: string
    inline?: boolean // New prop to control full-page vs inline mode
}

const NetflixLoader: React.FC<Props> = ({ message = 'Loading your movies...', inline = false }) => {
    const [loadingCounter, setLoadingCounter] = useState(0)
    const [loadingMessage, setLoadingMessage] = useState('🎬 Finding your favorite movies...')

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

    // Counter animation for loading
    useEffect(() => {
        setLoadingCounter(0)
        setLoadingMessage('🎬 Finding your favorite movies...')

        // Counter animation - faster to reach 100% before loading completes
        const counterInterval = setInterval(() => {
            setLoadingCounter((prev) => {
                if (prev >= 100) {
                    clearInterval(counterInterval)
                    return 100
                }
                return prev + 2 // Increment by 2 for faster animation
            })
        }, 15) // Faster interval - completes in ~750ms

        // Message rotation - independent of counter
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
        }, 500) // Change message every half second

        return () => {
            clearInterval(counterInterval)
            clearInterval(messageInterval)
        }
    }, [])

    return (
        <div
            className={
                inline
                    ? 'py-32 flex items-center justify-center min-h-[60vh]'
                    : 'fixed inset-0 z-[9999] bg-[#141414] flex items-center justify-center'
            }
        >
            <div className="text-center max-w-md px-6">
                <div className="flex space-x-3 justify-center mb-6">
                    <div className="w-6 h-6 bg-red-600 rounded-full animate-bounce"></div>
                    <div
                        className="w-6 h-6 bg-red-600 rounded-full animate-bounce"
                        style={{ animationDelay: '0.1s' }}
                    ></div>
                    <div
                        className="w-6 h-6 bg-red-600 rounded-full animate-bounce"
                        style={{ animationDelay: '0.2s' }}
                    ></div>
                </div>
                <div className="text-2xl font-bold text-white mb-6 font-mono">
                    {loadingCounter}%
                </div>
                <p className="text-white text-xl mb-2 min-h-[3rem] flex items-center justify-center">
                    {loadingMessage}
                </p>
                <p className="text-gray-400 text-sm">{message}</p>
            </div>
        </div>
    )
}

export default NetflixLoader

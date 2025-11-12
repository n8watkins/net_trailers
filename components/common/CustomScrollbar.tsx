'use client'

import React, { useEffect, useRef, useState } from 'react'

/**
 * CustomScrollbar - A custom overlay scrollbar that doesn't affect layout
 *
 * Features:
 * - Overlays content without taking up space
 * - Auto-hides after 1 second of no scrolling
 * - Smooth fade in/out transitions
 * - Proportional thumb size based on content
 * - Only shows on desktop (mobile devices have native overlay scrollbars)
 */
export default function CustomScrollbar() {
    const thumbRef = useRef<HTMLDivElement>(null)
    const [isVisible, setIsVisible] = useState(false)
    const [isTouchDevice, setIsTouchDevice] = useState(false)
    const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    // Detect if this is a touch device
    useEffect(() => {
        const checkTouchDevice = () => {
            setIsTouchDevice(
                'ontouchstart' in window ||
                    navigator.maxTouchPoints > 0 ||
                    // @ts-ignore - for older browsers
                    navigator.msMaxTouchPoints > 0
            )
        }
        checkTouchDevice()
    }, [])

    useEffect(() => {
        // Don't set up scroll tracking on touch devices
        if (isTouchDevice) return

        const updateThumb = () => {
            if (!thumbRef.current) return

            // Use document.documentElement for the scrolling element
            const scroller = document.documentElement
            const vh = scroller.clientHeight
            const sh = scroller.scrollHeight
            const st = scroller.scrollTop

            // Only show scrollbar if content is scrollable
            if (sh <= vh) {
                setIsVisible(false)
                return
            }

            // Show scrollbar
            setIsVisible(true)

            // Clear existing hide timeout
            if (hideTimeoutRef.current) {
                clearTimeout(hideTimeoutRef.current)
            }

            // Set new hide timeout
            hideTimeoutRef.current = setTimeout(() => {
                setIsVisible(false)
            }, 1000)

            // Calculate thumb height (proportional to viewport vs total content, min 32px)
            const h = Math.max(32, (vh / sh) * vh)
            thumbRef.current.style.height = h + 'px'

            // Calculate thumb position
            const maxScroll = sh - vh
            const maxThumbTravel = vh - h
            const top = maxScroll > 0 ? (st / maxScroll) * maxThumbTravel : 0
            thumbRef.current.style.top = top + 'px'
        }

        // Listen to scroll and resize events
        window.addEventListener('scroll', updateThumb)
        window.addEventListener('resize', updateThumb)
        window.addEventListener('load', updateThumb)

        // Initial update
        updateThumb()

        // Cleanup
        return () => {
            window.removeEventListener('scroll', updateThumb)
            window.removeEventListener('resize', updateThumb)
            window.removeEventListener('load', updateThumb)
            if (hideTimeoutRef.current) {
                clearTimeout(hideTimeoutRef.current)
            }
        }
    }, [isTouchDevice])

    // Don't render on touch devices (they have native overlay scrollbars)
    if (isTouchDevice) return null

    return (
        <div className={`custom-scrollbar ${isVisible ? 'visible' : ''}`} aria-hidden="true">
            <div ref={thumbRef} className="custom-scrollbar-thumb" />
        </div>
    )
}

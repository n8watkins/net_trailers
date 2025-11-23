'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'

/**
 * CustomScrollbar - A custom overlay scrollbar that doesn't affect layout
 *
 * Features:
 * - Overlays content without taking up space
 * - Auto-hides after 1 second of no scrolling
 * - Shows when hovering near the right edge of the screen
 * - Clickable track to jump to position
 * - Draggable thumb for precise scrolling
 * - Smooth fade in/out transitions
 * - Proportional thumb size based on content
 * - Only shows on desktop (mobile devices have native overlay scrollbars)
 */
export default function CustomScrollbar() {
    const trackRef = useRef<HTMLDivElement>(null)
    const thumbRef = useRef<HTMLDivElement>(null)
    const [isVisible, setIsVisible] = useState(false)
    const [isHovering, setIsHovering] = useState(false)
    const [isDragging, setIsDragging] = useState(false)
    const [isTouchDevice, setIsTouchDevice] = useState(false)
    const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const dragStartY = useRef(0)
    const dragStartScrollTop = useRef(0)

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

    const updateThumb = useCallback(() => {
        if (!thumbRef.current) return

        // Use document.documentElement for the scrolling element
        const scroller = document.documentElement
        const vh = scroller.clientHeight
        const sh = scroller.scrollHeight
        const st = scroller.scrollTop

        // Only show scrollbar if content is scrollable
        if (sh <= vh) {
            return
        }

        // Calculate thumb height (proportional to viewport vs total content, min 32px)
        const h = Math.max(32, (vh / sh) * vh)
        thumbRef.current.style.height = h + 'px'

        // Calculate thumb position
        const maxScroll = sh - vh
        const maxThumbTravel = vh - h
        const top = maxScroll > 0 ? (st / maxScroll) * maxThumbTravel : 0
        thumbRef.current.style.top = top + 'px'
    }, [])

    const scheduleHide = useCallback(() => {
        if (hideTimeoutRef.current) {
            clearTimeout(hideTimeoutRef.current)
        }
        hideTimeoutRef.current = setTimeout(() => {
            if (!isHovering && !isDragging) {
                setIsVisible(false)
            }
        }, 1000)
    }, [isHovering, isDragging])

    // Handle clicking on the track to jump to position
    const handleTrackClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (!trackRef.current || !thumbRef.current) return

        // Don't handle if clicking on the thumb itself
        if (e.target === thumbRef.current) return

        const trackRect = trackRef.current.getBoundingClientRect()
        const clickY = e.clientY - trackRect.top
        const trackHeight = trackRect.height
        const thumbHeight = thumbRef.current.offsetHeight

        // Calculate where to scroll based on click position
        const scroller = document.documentElement
        const maxScroll = scroller.scrollHeight - scroller.clientHeight
        const maxThumbTravel = trackHeight - thumbHeight

        // Center the thumb on the click position
        const targetThumbTop = Math.max(0, Math.min(clickY - thumbHeight / 2, maxThumbTravel))
        const scrollRatio = targetThumbTop / maxThumbTravel
        const targetScrollTop = scrollRatio * maxScroll

        window.scrollTo({
            top: targetScrollTop,
            behavior: 'smooth',
        })
    }, [])

    // Handle thumb drag start
    const handleThumbMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragging(true)
        dragStartY.current = e.clientY
        dragStartScrollTop.current = document.documentElement.scrollTop
    }, [])

    // Handle mouse move during drag
    useEffect(() => {
        if (!isDragging) return

        const handleMouseMove = (e: MouseEvent) => {
            if (!thumbRef.current || !trackRef.current) return

            const deltaY = e.clientY - dragStartY.current
            const trackHeight = trackRef.current.offsetHeight
            const thumbHeight = thumbRef.current.offsetHeight
            const maxThumbTravel = trackHeight - thumbHeight

            const scroller = document.documentElement
            const maxScroll = scroller.scrollHeight - scroller.clientHeight

            // Convert pixel delta to scroll delta
            const scrollDelta = (deltaY / maxThumbTravel) * maxScroll
            const newScrollTop = Math.max(
                0,
                Math.min(dragStartScrollTop.current + scrollDelta, maxScroll)
            )

            window.scrollTo({
                top: newScrollTop,
                behavior: 'instant',
            })
        }

        const handleMouseUp = () => {
            setIsDragging(false)
            scheduleHide()
        }

        document.addEventListener('mousemove', handleMouseMove)
        document.addEventListener('mouseup', handleMouseUp)

        return () => {
            document.removeEventListener('mousemove', handleMouseMove)
            document.removeEventListener('mouseup', handleMouseUp)
        }
    }, [isDragging, scheduleHide])

    useEffect(() => {
        // Don't set up scroll tracking on touch devices
        if (isTouchDevice) return

        const handleScroll = () => {
            const scroller = document.documentElement
            const vh = scroller.clientHeight
            const sh = scroller.scrollHeight

            // Only show scrollbar if content is scrollable
            if (sh <= vh) {
                setIsVisible(false)
                return
            }

            setIsVisible(true)
            updateThumb()

            if (!isHovering && !isDragging) {
                scheduleHide()
            }
        }

        // Listen to scroll and resize events
        window.addEventListener('scroll', handleScroll)
        window.addEventListener('resize', updateThumb)
        window.addEventListener('load', updateThumb)

        // Initial update
        updateThumb()

        // Cleanup
        return () => {
            window.removeEventListener('scroll', handleScroll)
            window.removeEventListener('resize', updateThumb)
            window.removeEventListener('load', updateThumb)
            if (hideTimeoutRef.current) {
                clearTimeout(hideTimeoutRef.current)
            }
        }
    }, [isTouchDevice, isHovering, isDragging, updateThumb, scheduleHide])

    // Handle hover state
    const handleMouseEnter = useCallback(() => {
        const scroller = document.documentElement
        if (scroller.scrollHeight <= scroller.clientHeight) return

        setIsHovering(true)
        setIsVisible(true)
        if (hideTimeoutRef.current) {
            clearTimeout(hideTimeoutRef.current)
        }
        updateThumb()
    }, [updateThumb])

    const handleMouseLeave = useCallback(() => {
        setIsHovering(false)
        if (!isDragging) {
            scheduleHide()
        }
    }, [isDragging, scheduleHide])

    // Don't render on touch devices (they have native overlay scrollbars)
    if (isTouchDevice) return null

    return (
        <div
            ref={trackRef}
            className={`custom-scrollbar ${isVisible ? 'visible' : ''} ${isDragging ? 'dragging' : ''}`}
            aria-hidden="true"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={handleTrackClick}
        >
            <div
                ref={thumbRef}
                className="custom-scrollbar-thumb"
                onMouseDown={handleThumbMouseDown}
            />
        </div>
    )
}

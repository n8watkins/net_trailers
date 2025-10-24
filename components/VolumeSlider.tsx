import React, { useRef, useState, useEffect, useCallback } from 'react'

interface VolumeSliderProps {
    volume: number // 0-1 range
    onChange: (volume: number) => void
    className?: string
}

export default function VolumeSlider({ volume, onChange, className = '' }: VolumeSliderProps) {
    const sliderRef = useRef<HTMLDivElement>(null)
    const [isDragging, setIsDragging] = useState(false)
    const [localVolume, setLocalVolume] = useState(volume)
    const requestRef = useRef<number>()

    // Sync local volume with prop when not dragging
    useEffect(() => {
        if (!isDragging) {
            setLocalVolume(volume)
        }
    }, [volume, isDragging])

    const handleVolumeChange = useCallback(
        (clientY: number) => {
            if (!sliderRef.current) return

            const rect = sliderRef.current.getBoundingClientRect()
            const sliderHeight = rect.height
            const clickPosition = clientY - rect.top

            // Invert calculation: top = max volume (1), bottom = min volume (0)
            const newVolume = Math.max(0, Math.min(1, 1 - clickPosition / sliderHeight))

            setLocalVolume(newVolume)

            // Use requestAnimationFrame to throttle onChange calls
            if (requestRef.current) {
                cancelAnimationFrame(requestRef.current)
            }
            requestRef.current = requestAnimationFrame(() => {
                onChange(newVolume)
            })
        },
        [onChange]
    )

    const handleMouseDown = useCallback(
        (e: React.MouseEvent) => {
            e.preventDefault()
            setIsDragging(true)
            handleVolumeChange(e.clientY)
        },
        [handleVolumeChange]
    )

    const handleTouchStart = useCallback(
        (e: React.TouchEvent) => {
            e.preventDefault()
            setIsDragging(true)
            if (e.touches[0]) {
                handleVolumeChange(e.touches[0].clientY)
            }
        },
        [handleVolumeChange]
    )

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging) {
                handleVolumeChange(e.clientY)
            }
        }

        const handleTouchMove = (e: TouchEvent) => {
            if (isDragging && e.touches[0]) {
                handleVolumeChange(e.touches[0].clientY)
            }
        }

        const handleMouseUp = () => {
            setIsDragging(false)
        }

        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove)
            document.addEventListener('mouseup', handleMouseUp)
            document.addEventListener('touchmove', handleTouchMove)
            document.addEventListener('touchend', handleMouseUp)
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove)
            document.removeEventListener('mouseup', handleMouseUp)
            document.removeEventListener('touchmove', handleTouchMove)
            document.removeEventListener('touchend', handleMouseUp)
            if (requestRef.current) {
                cancelAnimationFrame(requestRef.current)
            }
        }
    }, [isDragging, handleVolumeChange])

    const fillHeight = localVolume * 100
    // Constrain ball position: at 0% it's at bottom (0px), at 100% it's at top minus ball radius
    // Ball is 16px (w-4), so radius is 8px. Track height is 80px (h-20).
    // At 100%, ball bottom should be at (80px - 8px) = 72px from bottom
    const maxBallPosition = 72 // 80px track height - 8px ball radius
    const ballPosition = localVolume * maxBallPosition

    return (
        <div className={`flex flex-col items-center ${className}`}>
            <div
                ref={sliderRef}
                className="relative w-3 h-20 bg-white border-2 border-white rounded-full cursor-pointer"
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
            >
                {/* Filled portion (black, from bottom) */}
                <div
                    className="absolute bottom-0 left-0 right-0 bg-black rounded-full will-change-[height]"
                    style={{ height: `${fillHeight}%` }}
                />

                {/* Volume thumb/ball - black with white border */}
                <div
                    className="absolute left-1/2 transform -translate-x-1/2 w-4 h-4 bg-black border-2 border-white rounded-full cursor-grab active:cursor-grabbing shadow-lg will-change-[bottom]"
                    style={{
                        bottom: `${ballPosition}px`, // Constrained to stay within track bounds
                    }}
                />
            </div>
        </div>
    )
}

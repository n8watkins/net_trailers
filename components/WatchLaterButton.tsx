import React, { useState, useRef } from 'react'
import { CheckIcon, PlusIcon } from '@heroicons/react/24/solid'
import { Content, getTitle } from '../typings'
import useUserData from '../hooks/useUserData'
import { useToast } from '../hooks/useToast'
import ToolTipMod from './ToolTipMod'
import ListDropdown from './ListDropdown'
import { useRouter } from 'next/router'

interface WatchLaterButtonProps {
    content: Content
    variant?: 'thumbnail' | 'modal'
    className?: string
    onDropdownStateChange?: (isOpen: boolean) => void
}

function WatchLaterButton({
    content,
    variant = 'modal',
    className = '',
    onDropdownStateChange,
}: WatchLaterButtonProps) {
    const { addToWatchlist, removeFromWatchlist, isInWatchlist, getListsContaining } = useUserData()
    const { showWatchlistAdd, showWatchlistRemove, showError } = useToast()
    const router = useRouter()

    const [_isHovered, setIsHovered] = useState(false)
    const [showDropdown, setShowDropdown] = useState(false)
    const [dropdownPosition, setDropdownPosition] = useState({ x: 0, y: 0 })
    const [isButtonOrDropdownHovered, setIsButtonOrDropdownHovered] = useState(false)
    const buttonRef = useRef<HTMLButtonElement>(null)
    const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    const listsContaining = getListsContaining(content.id)
    const inWatchlist = isInWatchlist(content.id)
    const isInAnyList = listsContaining.length > 0

    const handleDropdownToggle = (e: React.MouseEvent) => {
        e.stopPropagation()

        if (!showDropdown && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect()
            // For fixed positioning, use viewport coordinates (no scroll offset)
            setDropdownPosition({
                x: rect.left, // Align dropdown's left edge with button's left edge
                y: rect.bottom, // Button's bottom edge (for dropup, ListDropdown will position above this)
            })
        }

        setShowDropdown(!showDropdown)
    }

    const _handleNavigateToWatchlists = (e: React.MouseEvent) => {
        e.stopPropagation()
        router.push('/watchlists')
    }

    const _handleQuickWatchlist = (e: React.MouseEvent) => {
        e.stopPropagation()
        try {
            if (inWatchlist) {
                removeFromWatchlist(content.id)
                showWatchlistRemove(`Removed ${getTitle(content)} from My List`)
            } else {
                addToWatchlist(content)
                showWatchlistAdd(`Added ${getTitle(content)} to My List`)
            }
        } catch (error) {
            console.error('❌ Error in handleQuickWatchlist:', error)
            showError('Error', 'Failed to update list. Please try again.')
        }
    }

    if (variant === 'thumbnail') {
        const handleMouseEnter = () => {
            // Clear any pending close timeout
            if (closeTimeoutRef.current) {
                clearTimeout(closeTimeoutRef.current)
                closeTimeoutRef.current = null
            }

            setIsButtonOrDropdownHovered(true)

            if (buttonRef.current) {
                const rect = buttonRef.current.getBoundingClientRect()
                // Right-align the dropdown (256px wide) to the button's right edge
                setDropdownPosition({
                    x: rect.right - 256, // Dropdown width is 256px (w-64)
                    y: rect.top, // Use top instead of bottom for higher positioning
                })
            }
            setShowDropdown(true)
            onDropdownStateChange?.(true)
        }

        const handleMouseLeave = () => {
            // Delay closing to allow movement between button and dropdown
            closeTimeoutRef.current = setTimeout(() => {
                setIsButtonOrDropdownHovered(false)
                setShowDropdown(false)
                onDropdownStateChange?.(false)
            }, 100)
        }

        return (
            <div
                className="relative z-[110]"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
                <button
                    ref={buttonRef}
                    onClick={(e) => {
                        e.stopPropagation()
                    }}
                    className={`p-3 rounded-full border-2 transition-all duration-200 flex items-center justify-center ${
                        isButtonOrDropdownHovered
                            ? 'bg-red-600 border-red-500 text-black'
                            : 'bg-black border-white/30 text-white'
                    } ${className}`}
                    title={inWatchlist ? 'In Lists' : 'Add to Lists'}
                >
                    <PlusIcon className="w-5 h-5" />
                </button>

                <ListDropdown
                    content={content}
                    isOpen={showDropdown}
                    onClose={() => {
                        setShowDropdown(false)
                        onDropdownStateChange?.(false)
                    }}
                    position={dropdownPosition}
                    variant="dropup"
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                />
            </div>
        )
    }

    // Modal variant - always show dropdown
    return (
        <>
            <ToolTipMod
                title={
                    isInAnyList
                        ? `In ${listsContaining.length} list${listsContaining.length > 1 ? 's' : ''} - Click for options`
                        : 'Add to Lists'
                }
            >
                <button
                    ref={buttonRef}
                    className={`relative p-2 sm:p-3 rounded-full border-2 ${
                        isInAnyList
                            ? 'border-green-400/60 bg-green-500/20 hover:bg-green-500/30'
                            : 'border-white/30 bg-black/20 hover:bg-black/50'
                    } hover:border-white text-white transition-all duration-200 ${className}`}
                    onClick={handleDropdownToggle}
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                >
                    {isInAnyList ? (
                        <CheckIcon className="h-4 w-4 sm:h-6 sm:w-6 text-green-400" />
                    ) : (
                        <PlusIcon className="h-4 w-4 sm:h-6 sm:w-6" />
                    )}

                    {/* Show count badge if in multiple lists */}
                    {listsContaining.length > 1 && (
                        <span className="absolute -top-1 -right-1 bg-green-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                            {listsContaining.length}
                        </span>
                    )}
                </button>
            </ToolTipMod>

            <ListDropdown
                content={content}
                isOpen={showDropdown}
                onClose={() => setShowDropdown(false)}
                position={dropdownPosition}
                variant="dropup"
            />
        </>
    )
}

export default WatchLaterButton

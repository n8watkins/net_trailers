import React, { useState, useRef } from 'react'
import { CheckIcon, PlusIcon, MinusIcon } from '@heroicons/react/24/solid'
import { Content, getTitle } from '../typings'
import useUserData from '../hooks/useUserData'
import { useToast } from '../hooks/useToast'
import { useSetRecoilState } from 'recoil'
import { listModalState } from '../atoms/listModalAtom'
import ToolTipMod from './ToolTipMod'
import ListDropdown from './ListDropdown'

interface WatchLaterButtonProps {
    content: Content
    variant?: 'thumbnail' | 'modal'
    className?: string
}

function WatchLaterButton({ content, variant = 'modal', className = '' }: WatchLaterButtonProps) {
    const { getListsContaining, addToWatchlist, removeFromWatchlist, isInWatchlist } = useUserData()
    const { showSuccess, showError, showWatchlistAdd, showWatchlistRemove } = useToast()
    const setListModal = useSetRecoilState(listModalState)

    const [isHovered, setIsHovered] = useState(false)
    const [showDropdown, setShowDropdown] = useState(false)
    const [dropdownPosition, setDropdownPosition] = useState({ x: 0, y: 0 })
    const buttonRef = useRef<HTMLButtonElement>(null)

    const listsContaining = getListsContaining(content.id)
    const inWatchlist = isInWatchlist(content.id)
    const isInAnyList = listsContaining.length > 0

    const handleDropdownToggle = (e: React.MouseEvent) => {
        e.stopPropagation()

        if (!showDropdown && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect()
            setDropdownPosition({
                x: rect.left + window.scrollX,
                y: rect.top + window.scrollY,
            })
        }

        setShowDropdown(!showDropdown)
    }

    const handleQuickWatchlist = (e: React.MouseEvent) => {
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
        return (
            <>
                <button
                    ref={buttonRef}
                    onClick={handleDropdownToggle}
                    className={`${
                        inWatchlist
                            ? 'bg-red-600/90 border-red-500 hover:bg-red-700'
                            : 'bg-gray-800/90 border-gray-600 hover:bg-gray-700'
                    } text-white
                             px-3 py-1.5 md:px-4 md:py-2
                             text-xs md:text-sm
                             rounded-md hover:scale-105
                             transition-all duration-200
                             flex items-center justify-center gap-1
                             shadow-lg hover:shadow-xl
                             border hover:border-gray-500
                             group/watchlist ${className}`}
                    title={inWatchlist ? 'Remove from My List' : 'Add to My List'}
                >
                    <svg
                        className={`w-4 h-4 group-hover/watchlist:scale-110 transition-transform duration-200 ${
                            inWatchlist ? 'fill-current' : 'fill-none'
                        }`}
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                        />
                    </svg>
                    {isInAnyList && listsContaining.length > 1 && (
                        <span className="text-xs bg-white/20 px-1 rounded">
                            +{listsContaining.length - 1}
                        </span>
                    )}
                </button>

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

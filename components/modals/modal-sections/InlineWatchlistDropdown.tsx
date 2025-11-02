'use client'

import React from 'react'
import { HandThumbUpIcon, HandThumbDownIcon, PlusIcon, EyeIcon } from '@heroicons/react/24/solid'
import { Content, getTitle } from '../../../typings'
import useUserData from '../../../hooks/useUserData'
import { useToast } from '../../../hooks/useToast'

// Helper function to convert hex color to rgba with opacity
const hexToRgba = (hex: string, opacity: number): string => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    if (result) {
        const r = parseInt(result[1], 16)
        const g = parseInt(result[2], 16)
        const b = parseInt(result[3], 16)
        return `rgba(${r}, ${g}, ${b}, ${opacity})`
    }
    return `rgba(107, 114, 128, ${opacity})` // Fallback to gray
}

interface InlineWatchlistDropdownProps {
    currentMovie: Content
    isOpen: boolean
    onOpenCreateList: () => void
    dropdownRef: React.RefObject<HTMLDivElement | null>
}

function InlineWatchlistDropdown({
    currentMovie,
    isOpen,
    onOpenCreateList,
    dropdownRef,
}: InlineWatchlistDropdownProps) {
    const {
        addToList,
        removeFromList,
        isInWatchlist,
        addToWatchlist,
        removeFromWatchlist,
        defaultWatchlist,
        userCreatedWatchlists,
    } = useUserData()

    const { showSuccess, showWatchlistAdd, showWatchlistRemove } = useToast()

    // Memoize the list computation
    const allLists = React.useMemo(() => {
        const watchlistVirtual = {
            id: 'default-watchlist',
            name: 'Watchlist',
            items: defaultWatchlist,
            emoji: '📺',
            color: '#E50914',
            isPublic: false,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        }
        return [watchlistVirtual, ...userCreatedWatchlists]
    }, [defaultWatchlist, userCreatedWatchlists])

    if (!isOpen) return null

    return (
        <div
            ref={dropdownRef}
            className="bg-[#141414] border border-gray-600 rounded-lg shadow-2xl p-4 mb-4 w-64 max-w-sm relative"
        >
            <div className="space-y-3">
                {/* Create New List Button - At the top */}
                <button
                    onClick={onOpenCreateList}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gray-800/30 hover:bg-gray-700/50 border-2 border-gray-600/30 hover:border-gray-500/50 rounded-lg transition-all duration-200"
                >
                    <PlusIcon className="w-5 h-5 text-gray-400" />
                    <span className="text-gray-300 font-medium">Create New List</span>
                </button>

                {/* All Lists */}
                {allLists.map((list) => {
                    const isInList = list.items.some((item) => item.id === currentMovie.id)
                    const getListIcon = () => {
                        if (list.name === 'Liked') {
                            return <HandThumbUpIcon className="w-5 h-5 text-green-400" />
                        } else if (list.name === 'Not For Me') {
                            return <HandThumbDownIcon className="w-5 h-5 text-red-400" />
                        } else if (list.name === 'Watchlist') {
                            return <EyeIcon className="w-5 h-5 text-blue-400" />
                        }
                        return <EyeIcon className="w-5 h-5 text-white" />
                    }

                    const handleListToggle = () => {
                        console.log('🎬 Modal handleListToggle called for list:', list.name)
                        console.log('🎬 isInList:', isInList)

                        // Handle default watchlist separately (just like ListSelectionModal)
                        if (list.id === 'default-watchlist') {
                            const inWatchlist = isInWatchlist(currentMovie.id)
                            if (inWatchlist) {
                                console.log('🎬 Removing from watchlist...')
                                removeFromWatchlist(currentMovie.id)
                                showWatchlistRemove(
                                    `Removed ${getTitle(currentMovie as Content)} from ${list.name}`
                                )
                            } else {
                                console.log('🎬 Adding to watchlist...')
                                addToWatchlist(currentMovie as Content)
                                showWatchlistAdd(
                                    `Added ${getTitle(currentMovie as Content)} to ${list.name}`
                                )
                            }
                        } else {
                            // Handle custom lists
                            if (isInList) {
                                console.log('🎬 Removing from list...')
                                removeFromList(list.id, currentMovie.id)
                                showSuccess(
                                    'Removed from list',
                                    `Removed ${getTitle(currentMovie as Content)} from "${list.name}"`
                                )
                            } else {
                                console.log('🎬 Adding to list...')
                                addToList(list.id, currentMovie as Content)
                                showSuccess(
                                    'Added to list',
                                    `Added ${getTitle(currentMovie as Content)} to "${list.name}"`
                                )
                            }
                        }
                    }

                    const listColor = list.color || '#6b7280'

                    return (
                        <button
                            key={list.id}
                            onClick={handleListToggle}
                            className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all duration-200 border-l-[6px] border-t border-r border-b ${
                                isInList
                                    ? 'ring-1 ring-green-400 hover:brightness-110'
                                    : 'hover:brightness-125'
                            }`}
                            style={{
                                borderLeftColor: listColor,
                                borderTopColor: isInList
                                    ? hexToRgba(listColor, 0.5)
                                    : hexToRgba(listColor, 0.3),
                                borderRightColor: isInList
                                    ? hexToRgba(listColor, 0.5)
                                    : hexToRgba(listColor, 0.3),
                                borderBottomColor: isInList
                                    ? hexToRgba(listColor, 0.5)
                                    : hexToRgba(listColor, 0.3),
                                backgroundColor: isInList
                                    ? hexToRgba(listColor, 0.25)
                                    : hexToRgba(listColor, 0.15),
                            }}
                        >
                            <div className="flex items-center space-x-4">
                                <div>{getListIcon()}</div>
                                <span
                                    className={`font-semibold ${isInList ? 'text-white' : 'text-gray-200'}`}
                                >
                                    {list.name}
                                </span>
                            </div>
                        </button>
                    )
                })}
            </div>
        </div>
    )
}

export default InlineWatchlistDropdown

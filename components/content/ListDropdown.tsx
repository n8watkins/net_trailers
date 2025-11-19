import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Content, getTitle } from '../../typings'
import useUserData from '../../hooks/useUserData'
import { useToast } from '../../hooks/useToast'
import { useAuthStatus } from '../../hooks/useAuthStatus'
import { useModalStore } from '../../stores/modalStore'
import { EyeIcon, PlusIcon, CheckIcon, LockClosedIcon } from '@heroicons/react/24/solid'
import { uiLog } from '../../utils/debugLogger'

interface ListDropdownProps {
    content: Content
    isOpen: boolean
    onClose: () => void
    position: { x: number; y: number }
    variant?: 'dropdown' | 'dropup'
    onMouseEnter?: () => void
    onMouseLeave?: () => void
}

function ListDropdown({
    content,
    isOpen,
    onClose,
    position,
    variant = 'dropdown',
    onMouseEnter,
    onMouseLeave,
}: ListDropdownProps) {
    const {
        getListsContaining,
        createList,
        isInWatchlist,
        addToWatchlist,
        removeFromWatchlist,
        defaultWatchlist,
    } = useUserData()

    const { showSuccess, showWatchlistAdd, showWatchlistRemove } = useToast()
    const { openAuthModal, openListModal } = useModalStore()
    const { isGuest } = useAuthStatus()

    const [_showCreateInput, setShowCreateInput] = useState(false)
    const [newListName, setNewListName] = useState('')
    const dropdownRef = useRef<HTMLDivElement>(null)

    const listsContaining = getListsContaining(content.id)
    const inWatchlist = isInWatchlist(content.id)

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                onClose()
                setShowCreateInput(false)
                setNewListName('')
            }
        }

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside)
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [isOpen, onClose])

    if (!isOpen) return null

    // Don't render on server side
    if (typeof window === 'undefined') return null

    const handleWatchlistToggle = (e: React.MouseEvent) => {
        e.stopPropagation()
        uiLog('📋 [ListDropdown] handleWatchlistToggle called')
        uiLog('📋 [ListDropdown] Content:', content)
        uiLog('📋 [ListDropdown] Content ID:', content.id)
        uiLog('📋 [ListDropdown] Content Title:', getTitle(content))
        uiLog('📋 [ListDropdown] inWatchlist (cached):', inWatchlist)
        uiLog('📋 [ListDropdown] Current watchlist:', defaultWatchlist)
        uiLog('📋 [ListDropdown] Rechecking isInWatchlist:', isInWatchlist(content.id))

        // Use fresh check instead of cached value
        const currentlyInWatchlist = isInWatchlist(content.id)
        uiLog('📋 [ListDropdown] Currently in watchlist:', currentlyInWatchlist)

        if (currentlyInWatchlist) {
            uiLog('📋 [ListDropdown] Removing from watchlist...')
            removeFromWatchlist(content.id)
            uiLog(
                '📋 [ListDropdown] After removeFromWatchlist, checking again:',
                isInWatchlist(content.id)
            )
            showWatchlistRemove(`Removed ${getTitle(content)} from My List`)
        } else {
            uiLog('📋 [ListDropdown] Adding to watchlist...')
            addToWatchlist(content)
            uiLog(
                '📋 [ListDropdown] After addToWatchlist, checking again:',
                isInWatchlist(content.id)
            )
            showWatchlistAdd(`Added ${getTitle(content)} to My List`)
        }
        // Don't close - keep dropdown open
    }

    const handleCreateList = (e?: React.MouseEvent) => {
        e?.stopPropagation()
        if (newListName.trim()) {
            createList({
                name: newListName.trim(),
                collectionType: 'manual',
            })
            showSuccess('List created', `Created "${newListName.trim()}" list`)
            setNewListName('')
            setShowCreateInput(false)
            onClose()
        }
    }

    const handleManageAllLists = (e: React.MouseEvent) => {
        e.stopPropagation()
        openListModal(content)
        onClose()
    }

    const _handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleCreateList()
        } else if (e.key === 'Escape') {
            setShowCreateInput(false)
            setNewListName('')
        }
    }

    // Render dropdown using portal to escape parent transforms (scale, etc.)
    return createPortal(
        <div
            ref={dropdownRef}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            style={{
                position: 'fixed',
                left: Math.max(8, Math.min(position.x, window.innerWidth - 264)),
                ...(variant === 'dropup'
                    ? { bottom: window.innerHeight - position.y } // Even lower
                    : { top: position.y + 8 }),
                width: '256px',
                zIndex: 100, // Much higher z-index
            }}
        >
            {/* Actual dropdown content */}
            <div className="bg-[#141414] border border-gray-600 rounded-lg shadow-2xl overflow-hidden">
                {/* My List Option */}
                <button
                    onClick={handleWatchlistToggle}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-700/50 transition-colors text-left border-b border-gray-600"
                >
                    <div className="flex items-center space-x-3">
                        <EyeIcon className="w-5 h-5 text-blue-400" />
                        <span className="text-white font-medium">My List</span>
                    </div>

                    <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-400">{defaultWatchlist.length}</span>
                        {inWatchlist ? (
                            <CheckIcon className="w-4 h-4 text-green-400" />
                        ) : (
                            <PlusIcon className="w-4 h-4 text-gray-400" />
                        )}
                    </div>
                </button>

                {/* Create New List - Auth Gate */}
                {isGuest ? (
                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            onClose()
                            openAuthModal('signup')
                        }}
                        className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-700/50 transition-colors text-left border-b border-gray-600"
                    >
                        <LockClosedIcon className="w-5 h-5 text-gray-400" />
                        <span className="text-white font-medium">Sign In to Create Lists</span>
                    </button>
                ) : (
                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            handleManageAllLists(e)
                        }}
                        className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-700/50 transition-colors text-left border-b border-gray-600"
                    >
                        <PlusIcon className="w-5 h-5 text-green-400" />
                        <span className="text-white font-medium">Create New List</span>
                    </button>
                )}

                {/* Manage All Lists */}
                <button
                    onClick={handleManageAllLists}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-700/50 transition-colors text-left"
                >
                    <span className="text-white font-medium">Manage All Lists</span>
                    {listsContaining.length > 0 && (
                        <div className="flex items-center space-x-2">
                            <span className="text-xs text-gray-400">
                                In {listsContaining.length} list
                                {listsContaining.length > 1 ? 's' : ''}
                            </span>
                            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                        </div>
                    )}
                </button>
            </div>

            {/* Hover bridge - right-aligned, button-width */}
            {variant === 'dropup' && (
                <div
                    style={{
                        width: '44px', // Button width (p-3 + icon)
                        height: '16px', // Thinner bridge
                        backgroundColor: 'rgba(255, 0, 0, 0.5)', // Visible red for debugging
                        marginLeft: 'auto', // Right-align
                    }}
                />
            )}
        </div>,
        document.body
    )
}

export default ListDropdown

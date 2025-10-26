import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Content, getTitle } from '../typings'
import useUserData from '../hooks/useUserData'
import { useToast } from '../hooks/useToast'
import { useSetRecoilState } from 'recoil'
import { listModalState } from '../atoms/listModalAtom'
import { useAuthStatus } from '../hooks/useAuthStatus'
import { useAppStore } from '../stores/appStore'
import { EyeIcon, PlusIcon, CheckIcon, MinusIcon, LockClosedIcon } from '@heroicons/react/24/solid'

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
    const setListModal = useSetRecoilState(listModalState)
    const { openAuthModal } = useAppStore()
    const { isGuest } = useAuthStatus()

    const [showCreateInput, setShowCreateInput] = useState(false)
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

    const handleWatchlistToggle = () => {
        console.log('📋 [ListDropdown] handleWatchlistToggle called')
        console.log('📋 [ListDropdown] Content:', content)
        console.log('📋 [ListDropdown] Content ID:', content.id)
        console.log('📋 [ListDropdown] Content Title:', getTitle(content))
        console.log('📋 [ListDropdown] inWatchlist (cached):', inWatchlist)
        console.log('📋 [ListDropdown] Current watchlist:', defaultWatchlist)
        console.log('📋 [ListDropdown] Rechecking isInWatchlist:', isInWatchlist(content.id))

        // Use fresh check instead of cached value
        const currentlyInWatchlist = isInWatchlist(content.id)
        console.log('📋 [ListDropdown] Currently in watchlist:', currentlyInWatchlist)

        if (currentlyInWatchlist) {
            console.log('📋 [ListDropdown] Removing from watchlist...')
            removeFromWatchlist(content.id)
            console.log(
                '📋 [ListDropdown] After removeFromWatchlist, checking again:',
                isInWatchlist(content.id)
            )
            showWatchlistRemove(`Removed ${getTitle(content)} from My List`)
        } else {
            console.log('📋 [ListDropdown] Adding to watchlist...')
            addToWatchlist(content)
            console.log(
                '📋 [ListDropdown] After addToWatchlist, checking again:',
                isInWatchlist(content.id)
            )
            showWatchlistAdd(`Added ${getTitle(content)} to My List`)
        }
        onClose()
    }

    const handleCreateList = () => {
        if (newListName.trim()) {
            createList({
                name: newListName.trim(),
                isPublic: false,
            })
            showSuccess('List created', `Created "${newListName.trim()}" list`)
            setNewListName('')
            setShowCreateInput(false)
            onClose()
        }
    }

    const handleManageAllLists = () => {
        setListModal({
            isOpen: true,
            content: content,
        })
        onClose()
    }

    const handleKeyPress = (e: React.KeyboardEvent) => {
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
                    ? { bottom: window.innerHeight - position.y - 16 } // Extend down by 16px to overlap with button area
                    : { top: position.y + 8 }),
                width: '256px',
                zIndex: 1400,
            }}
        >
            {/* Invisible hover bridge */}
            {variant === 'dropup' && <div className="h-5 w-full" />}

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
                        onClick={() => {
                            onClose()
                            openAuthModal('signup')
                        }}
                        className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-700/50 transition-colors text-left border-b border-gray-600"
                    >
                        <LockClosedIcon className="w-5 h-5 text-gray-400" />
                        <span className="text-white font-medium">Sign In to Create Lists</span>
                    </button>
                ) : !showCreateInput ? (
                    <button
                        onClick={() => setShowCreateInput(true)}
                        className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-700/50 transition-colors text-left border-b border-gray-600"
                    >
                        <PlusIcon className="w-5 h-5 text-green-400" />
                        <span className="text-white font-medium">Create New List</span>
                    </button>
                ) : (
                    <div className="p-4 border-b border-gray-600">
                        <input
                            type="text"
                            placeholder="List name..."
                            value={newListName}
                            onChange={(e) => setNewListName(e.target.value)}
                            onKeyDown={handleKeyPress}
                            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            autoFocus
                        />
                        <div className="flex space-x-2 mt-3">
                            <button
                                onClick={handleCreateList}
                                disabled={!newListName.trim()}
                                className="flex-1 px-3 py-1.5 bg-green-600 text-white rounded text-sm font-medium transition-colors hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Create
                            </button>
                            <button
                                onClick={() => {
                                    setShowCreateInput(false)
                                    setNewListName('')
                                }}
                                className="flex-1 px-3 py-1.5 bg-gray-600 text-white rounded text-sm font-medium transition-colors hover:bg-gray-700"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
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
        </div>,
        document.body
    )
}

export default ListDropdown

import React, { useState, useRef, useEffect } from 'react'
import { Content, getTitle } from '../typings'
import useUserData from '../hooks/useUserData'
import { useToast } from '../hooks/useToast'
import { useSetRecoilState } from 'recoil'
import { listModalState } from '../atoms/listModalAtom'
import { EyeIcon, PlusIcon, CheckIcon, MinusIcon } from '@heroicons/react/24/solid'

interface ListDropdownProps {
    content: Content
    isOpen: boolean
    onClose: () => void
    position: { x: number; y: number }
    variant?: 'dropdown' | 'dropup'
}

function ListDropdown({
    content,
    isOpen,
    onClose,
    position,
    variant = 'dropdown',
}: ListDropdownProps) {
    const { getDefaultLists, getListsContaining, addToList, removeFromList, createList } =
        useUserData()

    const { showSuccess, showWatchlistAdd, showWatchlistRemove } = useToast()
    const setListModal = useSetRecoilState(listModalState)

    const [showCreateInput, setShowCreateInput] = useState(false)
    const [newListName, setNewListName] = useState('')
    const dropdownRef = useRef<HTMLDivElement>(null)

    const defaultLists = getDefaultLists()
    const watchlist = defaultLists.watchlist
    const listsContaining = getListsContaining(content.id)
    const isInWatchlist = watchlist ? watchlist.items.some((item) => item.id === content.id) : false

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

    const handleWatchlistToggle = () => {
        if (isInWatchlist && watchlist) {
            removeFromList(watchlist.id, content.id)
            showWatchlistRemove(`Removed ${getTitle(content)} from My List`)
        } else if (watchlist) {
            addToList(watchlist.id, content)
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

    return (
        <div
            ref={dropdownRef}
            className={`fixed w-64 bg-[#141414] border border-gray-600 rounded-lg shadow-2xl z-[1400] overflow-hidden`}
            style={{
                left: Math.max(0, Math.min(position.x, window.innerWidth - 256)), // Keep within viewport
                ...(variant === 'dropup'
                    ? { bottom: window.innerHeight - position.y + 8 } // 8px gap above button
                    : { top: position.y + 8 }), // 8px gap below button
            }}
        >
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
                    {watchlist && (
                        <span className="text-xs text-gray-400">{watchlist.items.length}</span>
                    )}
                    {isInWatchlist ? (
                        <CheckIcon className="w-4 h-4 text-green-400" />
                    ) : (
                        <PlusIcon className="w-4 h-4 text-gray-400" />
                    )}
                </div>
            </button>

            {/* Create New List */}
            {!showCreateInput ? (
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
                            In {listsContaining.length} list{listsContaining.length > 1 ? 's' : ''}
                        </span>
                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    </div>
                )}
            </button>
        </div>
    )
}

export default ListDropdown

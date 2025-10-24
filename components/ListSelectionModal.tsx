import React, { useState } from 'react'
import { useRecoilState } from 'recoil'
import { listModalState } from '../atoms/listModalAtom'
import { authModalState } from '../atoms/authModalAtom'
import useUserData from '../hooks/useUserData'
import { useAuthStatus } from '../hooks/useAuthStatus'
import { Content, getTitle } from '../typings'
import { UserList } from '../types/userLists'
import Image from 'next/image'
import IconPickerModal from './IconPickerModal'
import ColorPickerModal from './ColorPickerModal'
import { useToast } from '../hooks/useToast'
import { listNameSchema, validateListNameUnique } from '../schemas/listSchema'
import { z } from 'zod'
import {
    XMarkIcon,
    PlusIcon,
    CheckIcon,
    EyeIcon,
    PencilIcon,
    TrashIcon,
    Cog6ToothIcon,
    LockClosedIcon,
} from '@heroicons/react/24/solid'

function ListSelectionModal() {
    const [listModal, setListModal] = useRecoilState(listModalState)
    const [authModal, setAuthModal] = useRecoilState(authModalState)
    const { isGuest, isAuthenticated } = useAuthStatus()
    const { showError } = useToast()
    const {
        getAllLists,
        addToList,
        removeFromList,
        isContentInList,
        createList,
        updateList,
        deleteList,
        addToWatchlist,
        removeFromWatchlist,
        isInWatchlist,
    } = useUserData()

    const [showCreateList, setShowCreateList] = useState(false)
    const [newListName, setNewListName] = useState('')
    const [selectedEmoji, setSelectedEmoji] = useState('🎬')
    const [selectedColor, setSelectedColor] = useState('#ef4444')
    const [editingList, setEditingList] = useState<UserList | null>(null)
    const [deletingList, setDeletingList] = useState<UserList | null>(null)
    const [showIconPicker, setShowIconPicker] = useState(false)
    const [showColorPicker, setShowColorPicker] = useState(false)

    const targetContent = listModal.content
    const allLists = getAllLists()
    const isManagementMode = !targetContent

    // Count custom lists (exclude default lists)
    const customLists = allLists.filter(
        (list) => !['Liked', 'Not For Me', 'Watchlist'].includes(list.name)
    )
    const hasNoCustomLists = customLists.length === 0

    if (!listModal.isOpen) return null

    const onClose = () => {
        setListModal({ isOpen: false, content: null })
        setShowCreateList(false)
        setNewListName('')
        setSelectedEmoji('🎬')
        setSelectedColor('#ef4444')
        setEditingList(null)
        setDeletingList(null)
        setShowIconPicker(false)
        setShowColorPicker(false)
    }

    const getListIcon = (list: UserList) => {
        const iconClass = 'w-5 h-5 text-white'

        // Return emoji if the list has one (custom lists)
        if (list.emoji) {
            return <span className="text-lg">{list.emoji}</span>
        }

        // Default icons for system lists
        if (list.name === 'Watchlist') {
            return <EyeIcon className={iconClass} />
        }

        return <EyeIcon className={iconClass} />
    }

    const handleToggleList = (list: UserList) => {
        if (!targetContent) return

        // Handle default watchlist separately
        if (list.id === 'default-watchlist') {
            const inWatchlist = isInWatchlist(targetContent.id)
            if (inWatchlist) {
                removeFromWatchlist(targetContent.id)
            } else {
                addToWatchlist(targetContent)
            }
        } else {
            // Handle custom lists
            const isInList = isContentInList(list.id, targetContent.id)
            if (isInList) {
                removeFromList(list.id, targetContent.id)
            } else {
                addToList(list.id, targetContent)
            }
        }
    }

    const handleCreateList = () => {
        // Validate with Zod schema
        try {
            const validatedName = listNameSchema.parse(newListName)

            // Check for duplicate name
            const existingNames = allLists.map((list) => list.name)
            const uniqueCheck = validateListNameUnique(validatedName, existingNames)

            if (!uniqueCheck.isValid) {
                showError('Duplicate List Name', uniqueCheck.error || '')
                return
            }

            createList({
                name: validatedName,
                isPublic: false,
                emoji: selectedEmoji,
                color: selectedColor,
            })
            setNewListName('')
            setSelectedEmoji('🎬')
            setSelectedColor('#ef4444')
            setShowCreateList(false)
        } catch (error) {
            if (error instanceof z.ZodError) {
                showError('Invalid List Name', error.errors[0].message)
            }
        }
    }

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            if (editingList) {
                handleUpdateList()
            } else {
                handleCreateList()
            }
        } else if (e.key === 'Escape') {
            setShowCreateList(false)
            setNewListName('')
            setSelectedEmoji('🎬')
            setSelectedColor('#ef4444')
            setEditingList(null)
        }
    }

    const handleEditList = (list: UserList) => {
        setEditingList(list)
        setNewListName(list.name)
        setSelectedEmoji(list.emoji || '🎬')
        setSelectedColor(list.color || '#ef4444')
        setShowCreateList(true)
    }

    const handleUpdateList = () => {
        if (!editingList) return

        // Validate with Zod schema
        try {
            const validatedName = listNameSchema.parse(newListName)

            // Check for duplicate name (excluding current list being edited)
            const existingNames = allLists.map((list) => list.name)
            const uniqueCheck = validateListNameUnique(
                validatedName,
                existingNames,
                editingList.name
            )

            if (!uniqueCheck.isValid) {
                showError('Duplicate List Name', uniqueCheck.error || '')
                return
            }

            updateList(editingList.id, {
                name: validatedName,
                emoji: selectedEmoji,
                color: selectedColor,
            })
            setEditingList(null)
            setNewListName('')
            setSelectedEmoji('🎬')
            setSelectedColor('#ef4444')
            setShowCreateList(false)
        } catch (error) {
            if (error instanceof z.ZodError) {
                showError('Invalid List Name', error.errors[0].message)
            }
        }
    }

    const handleDeleteList = (list: UserList) => {
        setDeletingList(list)
    }

    const confirmDeleteList = () => {
        if (deletingList) {
            deleteList(deletingList.id)
            setDeletingList(null)
        }
    }

    const cancelDeleteList = () => {
        setDeletingList(null)
    }

    return (
        <div className="fixed inset-0 z-[55000] flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className="relative bg-[#141414] rounded-lg shadow-2xl max-w-md w-full mx-4 max-h-[80vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-700">
                    <div>
                        <h2 className="text-xl font-semibold text-white">
                            {isManagementMode ? 'My Lists' : 'Add to Lists'}
                        </h2>
                        {!isManagementMode && (
                            <p className="text-sm text-gray-400 mt-1">
                                Click any list to add or remove
                            </p>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-700 rounded-full transition-colors"
                    >
                        <XMarkIcon className="w-5 h-5 text-white" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {/* Target Content Info - Only show when adding content to lists */}
                    {!isManagementMode && targetContent && (
                        <div className="mb-6 p-4 bg-gradient-to-r from-gray-800/80 to-gray-900/50 rounded-lg border border-gray-700/50">
                            <div className="flex items-start space-x-4">
                                {/* Larger poster image */}
                                <div className="relative w-24 h-36 flex-shrink-0">
                                    <Image
                                        src={`https://image.tmdb.org/t/p/w342${targetContent.poster_path}`}
                                        alt={getTitle(targetContent)}
                                        fill
                                        className="object-cover rounded-lg shadow-lg"
                                        sizes="(max-width: 96px) 100vw, 96px"
                                    />
                                </div>
                                {/* Content details */}
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-white font-bold text-lg leading-tight mb-2 line-clamp-2">
                                        {getTitle(targetContent)}
                                    </h3>
                                    <div className="flex items-center space-x-2 mb-2">
                                        <span className="inline-block px-2 py-1 bg-gray-700 rounded text-xs text-gray-300 font-medium">
                                            {targetContent.media_type === 'movie'
                                                ? 'Movie'
                                                : 'TV Show'}
                                        </span>
                                        {targetContent.release_date && (
                                            <span className="text-gray-400 text-sm">
                                                {new Date(targetContent.release_date).getFullYear()}
                                            </span>
                                        )}
                                        {targetContent.first_air_date && (
                                            <span className="text-gray-400 text-sm">
                                                {new Date(
                                                    targetContent.first_air_date
                                                ).getFullYear()}
                                            </span>
                                        )}
                                    </div>
                                    {targetContent.overview && (
                                        <p className="text-gray-400 text-sm line-clamp-2 leading-relaxed">
                                            {targetContent.overview}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Empty State Message - Only show in management mode when no custom lists */}
                    {isManagementMode && hasNoCustomLists && (
                        <div className="mb-4 p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
                            <p className="text-gray-300 text-sm text-center">
                                You haven&apos;t created any custom lists yet.
                                <br />
                                <span className="text-gray-400">
                                    Create a list to organize your favorite content!
                                </span>
                            </p>
                        </div>
                    )}

                    {/* Lists */}
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                        {allLists.map((list) => {
                            if (isManagementMode) {
                                // Management mode - show edit/delete options
                                const isDefaultList = list.id === 'default-watchlist'

                                return (
                                    <div
                                        key={list.id}
                                        className="w-full flex items-center justify-between p-3 rounded-lg bg-gray-800/50 border-l-4"
                                        style={{ borderLeftColor: list.color || '#6b7280' }}
                                    >
                                        <div className="flex items-center space-x-3">
                                            {getListIcon(list)}
                                            <div className="text-left">
                                                <div className="text-white font-medium">
                                                    {list.name}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center space-x-2">
                                            <span className="text-xs text-gray-400">
                                                {list.items.length} items
                                            </span>

                                            {/* Only show edit/delete for custom lists */}
                                            {!isDefaultList && (
                                                <>
                                                    <button
                                                        onClick={() => handleEditList(list)}
                                                        className="p-1.5 hover:bg-gray-600 rounded transition-colors"
                                                        title="Edit list"
                                                    >
                                                        <PencilIcon className="w-4 h-4 text-gray-400 hover:text-white" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteList(list)}
                                                        className="p-1.5 hover:bg-gray-600 rounded transition-colors"
                                                        title="Delete list"
                                                    >
                                                        <TrashIcon className="w-4 h-4 text-gray-400 hover:text-red-400" />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )
                            } else {
                                // Content addition mode - show toggle functionality
                                const isInList =
                                    list.id === 'default-watchlist'
                                        ? isInWatchlist(targetContent.id)
                                        : isContentInList(list.id, targetContent.id)
                                const isDefaultList = list.id === 'default-watchlist'

                                return (
                                    <div
                                        key={list.id}
                                        className={`w-full flex items-center justify-between p-3 rounded-lg transition-all duration-200 border-l-4 ${
                                            isInList
                                                ? 'bg-white/10 border-t border-r border-b border-white/20'
                                                : 'bg-gray-800/50 hover:bg-gray-700/50'
                                        }`}
                                        style={{ borderLeftColor: list.color || '#6b7280' }}
                                    >
                                        <button
                                            onClick={() => handleToggleList(list)}
                                            className="flex items-center space-x-3 flex-1 text-left"
                                        >
                                            {getListIcon(list)}
                                            <div>
                                                <div className="text-white font-medium">
                                                    {list.name}
                                                </div>
                                            </div>
                                        </button>

                                        <div className="flex items-center space-x-2">
                                            <span className="text-xs text-gray-400">
                                                {list.items.length}
                                            </span>
                                            {isInList && (
                                                <CheckIcon className="w-5 h-5 text-green-400" />
                                            )}

                                            {/* Show edit/delete for custom lists */}
                                            {!isDefaultList && (
                                                <>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            handleEditList(list)
                                                        }}
                                                        className="p-1.5 hover:bg-gray-600 rounded transition-colors"
                                                        title="Edit list"
                                                    >
                                                        <PencilIcon className="w-4 h-4 text-gray-400 hover:text-white" />
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            handleDeleteList(list)
                                                        }}
                                                        className="p-1.5 hover:bg-gray-600 rounded transition-colors"
                                                        title="Delete list"
                                                    >
                                                        <TrashIcon className="w-4 h-4 text-gray-400 hover:text-red-400" />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )
                            }
                        })}
                    </div>

                    {/* Create New List - Authenticated Users Only */}
                    <div className="mt-4 pt-4 border-t border-gray-700">
                        {isGuest ? (
                            <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/50">
                                <div className="flex items-center space-x-3 mb-2">
                                    <LockClosedIcon className="w-5 h-5 text-gray-400" />
                                    <h3 className="text-white font-medium">Custom Lists</h3>
                                </div>
                                <p className="text-gray-400 text-sm mb-3">
                                    Sign in to create and manage your own custom watchlists
                                </p>
                                <button
                                    onClick={() => {
                                        onClose()
                                        // Open auth modal with signup mode
                                        setAuthModal({ isOpen: true, mode: 'signup' })
                                    }}
                                    className="w-full px-4 py-2 bg-white text-black rounded-lg font-medium transition-all duration-200 hover:bg-gray-200"
                                >
                                    Sign In to Create Lists
                                </button>
                            </div>
                        ) : !showCreateList ? (
                            <button
                                onClick={() => setShowCreateList(true)}
                                className="w-full flex items-center justify-center space-x-2 p-3 bg-gray-800/50 hover:bg-gray-700/50 rounded-lg transition-all duration-200"
                            >
                                <PlusIcon className="w-5 h-5 text-white" />
                                <span className="text-white font-medium">Create New List</span>
                            </button>
                        ) : (
                            <div className="space-y-3">
                                {/* Icon selector and form inputs */}
                                <div className="flex items-start space-x-3">
                                    {/* Icon selector */}
                                    <div className="relative flex-shrink-0">
                                        <button
                                            onClick={() => setShowIconPicker(true)}
                                            className="w-12 h-12 bg-gray-800 border border-gray-600 rounded-lg flex items-center justify-center text-2xl transition-all duration-200 hover:bg-gray-700 hover:border-gray-500"
                                            title="Choose an icon"
                                        >
                                            {selectedEmoji}
                                        </button>

                                        {/* Icon Picker Dropdown */}
                                        <IconPickerModal
                                            isOpen={showIconPicker}
                                            selectedIcon={selectedEmoji}
                                            onSelectIcon={setSelectedEmoji}
                                            onClose={() => setShowIconPicker(false)}
                                        />
                                    </div>

                                    {/* Color selector */}
                                    <div className="relative flex-shrink-0">
                                        <button
                                            onClick={() => setShowColorPicker(true)}
                                            className="w-12 h-12 bg-gray-800 border-2 border-gray-700 rounded-lg transition-all duration-200 hover:bg-gray-700 hover:border-gray-600"
                                            title="Choose a color"
                                        >
                                            <div
                                                className="w-full h-full rounded-md"
                                                style={{ backgroundColor: selectedColor }}
                                            />
                                        </button>

                                        {/* Color Picker Dropdown */}
                                        <ColorPickerModal
                                            isOpen={showColorPicker}
                                            selectedColor={selectedColor}
                                            onSelectColor={setSelectedColor}
                                            onClose={() => setShowColorPicker(false)}
                                        />
                                    </div>

                                    {/* Form inputs */}
                                    <div className="flex-1">
                                        <input
                                            type="text"
                                            placeholder="List name"
                                            value={newListName}
                                            onChange={(e) => setNewListName(e.target.value)}
                                            onKeyDown={handleKeyPress}
                                            className="w-full h-12 px-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent"
                                            autoFocus
                                        />
                                    </div>
                                </div>

                                <div className="flex space-x-2">
                                    <button
                                        onClick={editingList ? handleUpdateList : handleCreateList}
                                        disabled={!newListName.trim()}
                                        className="flex-1 px-4 py-2 bg-white text-black rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200"
                                    >
                                        {editingList ? 'Update' : 'Create'}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowCreateList(false)
                                            setNewListName('')
                                            setSelectedEmoji('🎬')
                                            setSelectedColor('#ef4444')
                                            setEditingList(null)
                                            setShowIconPicker(false)
                                            setShowColorPicker(false)
                                        }}
                                        className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg font-medium transition-all duration-200 hover:bg-gray-600"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Delete Confirmation Modal */}
                    {deletingList && (
                        <div className="fixed inset-0 z-[56000] flex items-center justify-center">
                            <div
                                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                                onClick={cancelDeleteList}
                            />
                            <div className="relative bg-[#141414] rounded-lg p-6 max-w-sm mx-4">
                                <h3 className="text-lg font-semibold text-white mb-3">
                                    Delete List
                                </h3>
                                <p className="text-gray-300 mb-4">
                                    Are you sure you want to delete &ldquo;{deletingList.name}
                                    &rdquo;? This action cannot be undone.
                                </p>
                                <div className="flex space-x-3">
                                    <button
                                        onClick={confirmDeleteList}
                                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium transition-all duration-200 hover:bg-red-700"
                                    >
                                        Delete
                                    </button>
                                    <button
                                        onClick={cancelDeleteList}
                                        className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg font-medium transition-all duration-200 hover:bg-gray-600"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default ListSelectionModal

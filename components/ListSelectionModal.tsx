import React, { useState } from 'react'
import { useRecoilState } from 'recoil'
import { listModalState } from '../atoms/listModalAtom'
import useUserData from '../hooks/useUserData'
import { Content, getTitle } from '../typings'
import { UserList } from '../types/userLists'
import Image from 'next/image'
import IconPickerModal from './IconPickerModal'
import {
    XMarkIcon,
    PlusIcon,
    CheckIcon,
    EyeIcon,
    PencilIcon,
    TrashIcon,
    Cog6ToothIcon,
} from '@heroicons/react/24/solid'

function ListSelectionModal() {
    const [listModal, setListModal] = useRecoilState(listModalState)
    const {
        getAllLists,
        addToList,
        removeFromList,
        isContentInList,
        createList,
        updateList,
        deleteList,
    } = useUserData()

    const [showCreateList, setShowCreateList] = useState(false)
    const [newListName, setNewListName] = useState('')
    const [newListDescription, setNewListDescription] = useState('')
    const [selectedEmoji, setSelectedEmoji] = useState('🎬')
    const [editingList, setEditingList] = useState<UserList | null>(null)
    const [deletingList, setDeletingList] = useState<UserList | null>(null)
    const [showIconPicker, setShowIconPicker] = useState(false)

    const targetContent = listModal.content
    const allLists = getAllLists()
    const isManagementMode = !targetContent

    if (!listModal.isOpen) return null

    const onClose = () => {
        setListModal({ isOpen: false, content: null })
        setShowCreateList(false)
        setNewListName('')
        setNewListDescription('')
        setSelectedEmoji('🎬')
        setEditingList(null)
        setDeletingList(null)
        setShowIconPicker(false)
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

        const isInList = isContentInList(list.id, targetContent.id)

        if (isInList) {
            removeFromList(list.id, targetContent.id)
        } else {
            addToList(list.id, targetContent)
        }
    }

    const handleCreateList = () => {
        if (newListName.trim()) {
            createList({
                name: newListName.trim(),
                isPublic: false,
                emoji: selectedEmoji,
            })
            setNewListName('')
            setNewListDescription('')
            setSelectedEmoji('🎬')
            setShowCreateList(false)
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
            setNewListDescription('')
            setEditingList(null)
        }
    }

    const handleEditList = (list: UserList) => {
        setEditingList(list)
        setNewListName(list.name)
        setNewListDescription(list.description || '')
        setSelectedEmoji(list.emoji || '🎬')
        setShowCreateList(true)
    }

    const handleUpdateList = () => {
        if (editingList && newListName.trim()) {
            updateList(editingList.id, {
                name: newListName.trim(),
                emoji: selectedEmoji,
            })
            setEditingList(null)
            setNewListName('')
            setNewListDescription('')
            setSelectedEmoji('🎬')
            setShowCreateList(false)
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
        <div className="fixed inset-0 z-[300] flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className="relative bg-[#141414] rounded-lg shadow-2xl max-w-md w-full mx-4 max-h-[80vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-700">
                    <h2 className="text-xl font-semibold text-white">
                        {isManagementMode ? 'Manage Lists' : 'Add to Lists'}
                    </h2>
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
                        <div className="flex items-center space-x-3 mb-6 p-3 bg-gray-800/50 rounded-lg">
                            <div className="relative w-12 h-18">
                                <Image
                                    src={`https://image.tmdb.org/t/p/w185${targetContent.poster_path}`}
                                    alt=""
                                    fill
                                    className="object-cover rounded"
                                />
                            </div>
                            <div>
                                <h3 className="text-white font-medium">
                                    {getTitle(targetContent)}
                                </h3>
                                <p className="text-gray-400 text-sm">
                                    {targetContent.media_type === 'movie' ? 'Movie' : 'TV Show'}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Lists */}
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                        {allLists.map((list) => {
                            if (isManagementMode) {
                                // Management mode - show edit/delete options
                                const isDefaultList = ['Liked', 'Not For Me', 'Watchlist'].includes(
                                    list.name
                                )

                                return (
                                    <div
                                        key={list.id}
                                        className="w-full flex items-center justify-between p-3 rounded-lg bg-gray-800/50"
                                    >
                                        <div className="flex items-center space-x-3">
                                            {getListIcon(list)}
                                            <div className="text-left">
                                                <div className="text-white font-medium">
                                                    {list.name}
                                                </div>
                                                {list.description && (
                                                    <div className="text-gray-400 text-sm">
                                                        {list.description}
                                                    </div>
                                                )}
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
                                const isInList = isContentInList(list.id, targetContent.id)

                                return (
                                    <button
                                        key={list.id}
                                        onClick={() => handleToggleList(list)}
                                        className={`w-full flex items-center justify-between p-3 rounded-lg transition-all duration-200 ${
                                            isInList
                                                ? 'bg-white/10 border border-white/20'
                                                : 'bg-gray-800/50 hover:bg-gray-700/50'
                                        }`}
                                    >
                                        <div className="flex items-center space-x-3">
                                            {getListIcon(list)}
                                            <div className="text-left">
                                                <div className="text-white font-medium">
                                                    {list.name}
                                                </div>
                                                {list.description && (
                                                    <div className="text-gray-400 text-sm">
                                                        {list.description}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center space-x-2">
                                            <span className="text-xs text-gray-400">
                                                {list.items.length}
                                            </span>
                                            {isInList && (
                                                <CheckIcon className="w-5 h-5 text-green-400" />
                                            )}
                                        </div>
                                    </button>
                                )
                            }
                        })}
                    </div>

                    {/* Create New List */}
                    <div className="mt-4 pt-4 border-t border-gray-700">
                        {!showCreateList ? (
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
                                    <button
                                        onClick={() => setShowIconPicker(true)}
                                        className="flex-shrink-0 w-12 h-12 bg-gray-800 border border-gray-600 rounded-lg flex items-center justify-center text-2xl transition-all duration-200 hover:bg-gray-700 hover:border-gray-500"
                                        title="Choose an icon"
                                    >
                                        {selectedEmoji}
                                    </button>

                                    {/* Form inputs */}
                                    <div className="flex-1 space-y-3">
                                        <input
                                            type="text"
                                            placeholder="List name"
                                            value={newListName}
                                            onChange={(e) => setNewListName(e.target.value)}
                                            onKeyDown={handleKeyPress}
                                            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent"
                                            autoFocus
                                        />
                                        <input
                                            type="text"
                                            placeholder="Description (optional)"
                                            value={newListDescription}
                                            onChange={(e) => setNewListDescription(e.target.value)}
                                            onKeyDown={handleKeyPress}
                                            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent"
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
                                            setNewListDescription('')
                                            setSelectedEmoji('🎬')
                                            setEditingList(null)
                                            setShowIconPicker(false)
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
                        <div className="fixed inset-0 z-[400] flex items-center justify-center">
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

                    {/* Icon Picker Modal */}
                    <IconPickerModal
                        isOpen={showIconPicker}
                        selectedIcon={selectedEmoji}
                        onSelectIcon={setSelectedEmoji}
                        onClose={() => setShowIconPicker(false)}
                    />
                </div>
            </div>
        </div>
    )
}

export default ListSelectionModal

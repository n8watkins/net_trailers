'use client'

import { useState } from 'react'
import { useAppStore } from '../../stores/appStore'
import { useSessionStore } from '../../stores/sessionStore'
import { useToast } from '../../hooks/useToast'
import { XMarkIcon, PlusIcon } from '@heroicons/react/24/outline'
import IconPickerModal from './IconPickerModal'
import ColorPickerModal from './ColorPickerModal'
import useUserData from '../../hooks/useUserData'

export default function WatchlistCreatorModal() {
    const { watchlistCreatorModal, closeWatchlistCreatorModal, setWatchlistCreatorName } =
        useAppStore()
    const getUserId = useSessionStore((state) => state.getUserId)
    const getSessionType = useSessionStore((state) => state.getSessionType)
    const { createList, addToList } = useUserData()
    const { showSuccess, showError } = useToast()

    const [selectedEmoji, setSelectedEmoji] = useState('📺')
    const [selectedColor, setSelectedColor] = useState('#3b82f6') // blue-500
    const [showIconPicker, setShowIconPicker] = useState(false)
    const [showColorPicker, setShowColorPicker] = useState(false)
    const [isCreating, setIsCreating] = useState(false)

    if (!watchlistCreatorModal.isOpen) return null

    const handleClose = () => {
        closeWatchlistCreatorModal()
        setSelectedEmoji('📺')
        setSelectedColor('#3b82f6')
        setShowIconPicker(false)
        setShowColorPicker(false)
    }

    const handleCreate = async () => {
        const userId = getUserId()
        const sessionType = getSessionType()

        if (!userId) {
            showError('Please sign in to create watchlists')
            return
        }

        if (!watchlistCreatorModal.name.trim()) {
            showError('Please enter a watchlist name')
            return
        }

        setIsCreating(true)

        try {
            // Create the list using useUserData hook
            const newList = createList({
                name: watchlistCreatorModal.name.trim(),
                isPublic: false,
                emoji: selectedEmoji,
                color: selectedColor,
            })

            // Add all content items to the list
            watchlistCreatorModal.content.forEach((contentItem) => {
                addToList(newList.id, contentItem)
            })

            showSuccess(
                'Watchlist created!',
                `"${watchlistCreatorModal.name}" with ${watchlistCreatorModal.content.length} titles`
            )

            handleClose()
        } catch (error: any) {
            console.error('Create watchlist error:', error)
            showError('Failed to create watchlist', error.message)
        } finally {
            setIsCreating(false)
        }
    }

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && watchlistCreatorModal.name.trim()) {
            handleCreate()
        } else if (e.key === 'Escape') {
            handleClose()
        }
    }

    return (
        <div className="fixed inset-0 z-[55000] flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

            {/* Modal */}
            <div className="relative bg-[#141414] rounded-lg shadow-2xl max-w-md w-full mx-4">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-700">
                    <div>
                        <h2 className="text-xl font-semibold text-white">Create Watchlist</h2>
                        <p className="text-sm text-gray-400 mt-1">
                            {watchlistCreatorModal.content.length} title
                            {watchlistCreatorModal.content.length !== 1 ? 's' : ''} selected
                        </p>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-2 hover:bg-gray-700 rounded-full transition-colors"
                    >
                        <XMarkIcon className="w-5 h-5 text-white" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    <div className="space-y-4">
                        {/* Icon and Color Pickers */}
                        <div className="flex items-center space-x-3">
                            {/* Icon Picker */}
                            <div className="relative flex-shrink-0">
                                <button
                                    onClick={() => setShowIconPicker(true)}
                                    className="w-14 h-14 bg-gray-800 border border-gray-600 rounded-lg flex items-center justify-center text-3xl transition-all duration-200 hover:bg-gray-700 hover:border-gray-500"
                                    title="Choose an icon"
                                >
                                    {selectedEmoji}
                                </button>

                                <IconPickerModal
                                    isOpen={showIconPicker}
                                    selectedIcon={selectedEmoji}
                                    onSelectIcon={(emoji) => {
                                        setSelectedEmoji(emoji)
                                        setShowIconPicker(false)
                                    }}
                                    onClose={() => setShowIconPicker(false)}
                                />
                            </div>

                            {/* Color Picker */}
                            <div className="relative flex-shrink-0">
                                <button
                                    onClick={() => setShowColorPicker(true)}
                                    className="w-14 h-14 bg-gray-800 border-2 border-gray-700 rounded-lg transition-all duration-200 hover:bg-gray-700 hover:border-gray-600 p-2 flex items-center justify-center"
                                    title="Choose a color"
                                >
                                    <div
                                        className="w-full h-full rounded-md"
                                        style={{ backgroundColor: selectedColor }}
                                    />
                                </button>

                                <ColorPickerModal
                                    isOpen={showColorPicker}
                                    selectedColor={selectedColor}
                                    onSelectColor={(color) => {
                                        setSelectedColor(color)
                                        setShowColorPicker(false)
                                    }}
                                    onClose={() => setShowColorPicker(false)}
                                />
                            </div>

                            {/* Name Input */}
                            <div className="flex-1">
                                <input
                                    type="text"
                                    placeholder="Watchlist name"
                                    value={watchlistCreatorModal.name}
                                    onChange={(e) => setWatchlistCreatorName(e.target.value)}
                                    onKeyDown={handleKeyPress}
                                    className="w-full h-14 px-4 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    autoFocus
                                />
                            </div>
                        </div>

                        {/* Info Text */}
                        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                            <p className="text-sm text-gray-300">
                                This watchlist will contain {watchlistCreatorModal.content.length}{' '}
                                title{watchlistCreatorModal.content.length !== 1 ? 's' : ''} from
                                your smart search results.
                            </p>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex space-x-3 pt-2">
                            <button
                                onClick={handleCreate}
                                disabled={!watchlistCreatorModal.name.trim() || isCreating}
                                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold transition-all duration-200 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <PlusIcon className="w-5 h-5" />
                                {isCreating ? 'Creating...' : 'Create Watchlist'}
                            </button>
                            <button
                                onClick={handleClose}
                                className="px-6 py-3 bg-gray-700 text-white rounded-lg font-semibold transition-all duration-200 hover:bg-gray-600"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

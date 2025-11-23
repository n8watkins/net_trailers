import React, { useState } from 'react'
import { useModalStore } from '../../stores/modalStore'
import useUserData from '../../hooks/useUserData'
import { useAuthStatus } from '../../hooks/useAuthStatus'
import { getTitle } from '../../typings'
import { UserList } from '../../types/collections'
import { useToast } from '../../hooks/useToast'
import { listNameSchema, validateListNameUnique } from '../../schemas/listSchema'
import { z } from 'zod'
import { EyeIcon } from '@heroicons/react/24/solid'
import CollectionEditorModal from './CollectionEditorModal'
import ListModalHeader from './list-selection/ListModalHeader'
import ContentInfoCard from './list-selection/ContentInfoCard'
import EmptyStateMessage from './list-selection/EmptyStateMessage'
import ListItemsContainer from './list-selection/ListItemsContainer'
import CreateListSection from './list-selection/CreateListSection'
import DeleteConfirmationModal from './list-selection/DeleteConfirmationModal'

function ListSelectionModal() {
    const { listModal, closeListModal, openAuthModal, openCollectionBuilderModal } = useModalStore()
    const { isGuest } = useAuthStatus()
    const { showError, showWatchlistAdd, showWatchlistRemove, showSuccess } = useToast()
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

    // State
    const [showCreateList, setShowCreateList] = useState(false)
    const [newListName, setNewListName] = useState('')
    const [selectedEmoji, setSelectedEmoji] = useState('🎬')
    const [selectedColor, setSelectedColor] = useState('#ef4444')
    const [editingListId, setEditingListId] = useState<string | null>(null)
    const [editingListName, setEditingListName] = useState('')
    const [editingListEmoji, setEditingListEmoji] = useState('')
    const [editingListColor, setEditingListColor] = useState('')
    const [editingIsPublic, setEditingIsPublic] = useState(false)
    const [editingDisplayAsRow, setEditingDisplayAsRow] = useState(true)
    const [deletingList, setDeletingList] = useState<UserList | null>(null)
    const [deleteConfirmationInput, setDeleteConfirmationInput] = useState('')
    const [showIconPicker, setShowIconPicker] = useState(false)
    const [showColorPicker, setShowColorPicker] = useState(false)
    const [showEditIconPicker, setShowEditIconPicker] = useState(false)
    const [showEditColorPicker, setShowEditColorPicker] = useState(false)
    const [editorCollection, setEditorCollection] = useState<UserList | null>(null)
    const [showEditor, setShowEditor] = useState(false)

    // Derived state
    const targetContent = listModal.content
    const allLists = getAllLists()
    const isManagementMode = !targetContent

    // Count custom lists (exclude default lists)
    const customLists = allLists.filter(
        (list) => !['Liked', 'Not For Me', 'Watchlist'].includes(list.name)
    )
    const hasNoCustomLists = customLists.length === 0

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

    const getListIcon = (list: UserList) => {
        const iconClass = 'w-6 h-6 text-white'

        // Return emoji if the list has one (custom lists)
        if (list.emoji) {
            return <span className="text-xl">{list.emoji}</span>
        }

        // Default icons for system lists
        if (list.name === 'Watchlist') {
            return <EyeIcon className={iconClass} />
        }

        return <EyeIcon className={iconClass} />
    }

    // Handlers
    const onClose = () => {
        closeListModal()
        setShowCreateList(false)
        setNewListName('')
        setSelectedEmoji('🎬')
        setSelectedColor('#ef4444')
        setEditingListId(null)
        setEditingListName('')
        setEditingListEmoji('')
        setEditingListColor('')
        setEditingIsPublic(false)
        setEditingDisplayAsRow(true)
        setDeletingList(null)
        setShowIconPicker(false)
        setShowColorPicker(false)
        setShowEditIconPicker(false)
        setShowEditColorPicker(false)
    }

    const handleToggleList = (list: UserList) => {
        if (!targetContent) return

        const contentTitle = getTitle(targetContent)

        // Handle default watchlist separately
        if (list.id === 'default-watchlist') {
            const inWatchlist = isInWatchlist(targetContent.id)
            if (inWatchlist) {
                removeFromWatchlist(targetContent.id)
                showWatchlistRemove(`Removed "${contentTitle}" from ${list.name}`)
            } else {
                addToWatchlist(targetContent)
                showWatchlistAdd(`Added "${contentTitle}" to ${list.name}`)
            }
        } else {
            // Handle custom lists
            const isInList = isContentInList(list.id, targetContent.id)
            if (isInList) {
                removeFromList(list.id, targetContent.id)
                showSuccess('Removed from List', `Removed "${contentTitle}" from "${list.name}"`)
            } else {
                addToList(list.id, targetContent)
                showSuccess('Added to List', `Added "${contentTitle}" to "${list.name}"`)
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
                emoji: selectedEmoji,
                color: selectedColor,
                collectionType: 'manual', // Required for CreateListRequest
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
            handleCreateList()
        } else if (e.key === 'Escape') {
            setShowCreateList(false)
            setNewListName('')
            setSelectedEmoji('🎬')
            setSelectedColor('#ef4444')
        }
    }

    const handleEditList = (list: UserList) => {
        // For custom collections with content, use comprehensive editor
        const isDefaultList = list.id === 'default-watchlist'
        const hasContent = list.items && list.items.length > 0
        const isCustomCollection =
            !isDefaultList && (hasContent || list.collectionType === 'ai-generated')

        if (isCustomCollection) {
            // Open comprehensive editor
            setEditorCollection(list)
            setShowEditor(true)
        } else {
            // Use inline edit for simple lists
            setEditingListId(list.id)
            setEditingListName(list.name)
            setEditingListEmoji(list.emoji || '🎬')
            setEditingListColor(list.color || '#ef4444')
            setEditingIsPublic(false) // Collections are private
            setEditingDisplayAsRow(list.displayAsRow ?? true)
        }
    }

    const handleSaveEdit = (listId: string, originalName: string) => {
        // Validate with Zod schema
        try {
            const validatedName = listNameSchema.parse(editingListName)

            // Check for duplicate name (excluding current list being edited)
            const existingNames = allLists.map((list) => list.name)
            const uniqueCheck = validateListNameUnique(validatedName, existingNames, originalName)

            if (!uniqueCheck.isValid) {
                showError('Duplicate List Name', uniqueCheck.error || '')
                return
            }

            updateList(listId, {
                name: validatedName,
                emoji: editingListEmoji,
                color: editingListColor,
            })
            setEditingListId(null)
            setEditingListName('')
            setEditingListEmoji('')
            setEditingListColor('')
            setEditingIsPublic(false)
            setEditingDisplayAsRow(true)
        } catch (error) {
            if (error instanceof z.ZodError) {
                showError('Invalid List Name', error.errors[0].message)
            }
        }
    }

    const handleCancelEdit = () => {
        setEditingListId(null)
        setEditingListName('')
        setEditingListEmoji('')
        setEditingListColor('')
        setEditingIsPublic(false)
        setEditingDisplayAsRow(true)
        setShowEditIconPicker(false)
        setShowEditColorPicker(false)
    }

    const handleDeleteList = (list: UserList) => {
        setDeletingList(list)
    }

    const confirmDeleteList = () => {
        if (deletingList) {
            deleteList(deletingList.id)
            setDeletingList(null)
            // Also cancel edit if deleting the list being edited
            if (editingListId === deletingList.id) {
                handleCancelEdit()
            }
        }
    }

    const cancelDeleteList = () => {
        setDeletingList(null)
        setDeleteConfirmationInput('')
    }

    const handleSignIn = () => {
        onClose()
        openAuthModal('signup')
    }

    const handleNewCollection = () => {
        openCollectionBuilderModal()
    }

    if (!listModal.isOpen) return null

    return (
        <div className="fixed inset-0 z-[55000] flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className="relative bg-[#141414] rounded-lg shadow-2xl max-w-xl w-full mx-4 max-h-[90vh] overflow-hidden">
                <ListModalHeader isManagementMode={isManagementMode} onClose={onClose} />

                {/* Content */}
                <div className="p-6 max-h-[calc(90vh-100px)] overflow-y-auto modal-scrollbar-blue">
                    {!isManagementMode && targetContent && (
                        <ContentInfoCard targetContent={targetContent} />
                    )}

                    {isManagementMode && hasNoCustomLists && <EmptyStateMessage />}

                    {/* New Collection button at the top */}
                    {!isManagementMode && (
                        <CreateListSection
                            isGuest={isGuest}
                            onSignIn={handleSignIn}
                            onNewCollection={handleNewCollection}
                        />
                    )}

                    <ListItemsContainer
                        allLists={allLists}
                        isManagementMode={isManagementMode}
                        targetContent={targetContent}
                        isContentInList={isContentInList}
                        isInWatchlist={isInWatchlist}
                        getListIcon={getListIcon}
                        hexToRgba={hexToRgba}
                        editingListId={editingListId}
                        editingListName={editingListName}
                        editingListEmoji={editingListEmoji}
                        editingListColor={editingListColor}
                        editingIsPublic={editingIsPublic}
                        editingDisplayAsRow={editingDisplayAsRow}
                        setEditingListName={setEditingListName}
                        setEditingListEmoji={setEditingListEmoji}
                        setEditingListColor={setEditingListColor}
                        setEditingIsPublic={setEditingIsPublic}
                        setEditingDisplayAsRow={setEditingDisplayAsRow}
                        showEditIconPicker={showEditIconPicker}
                        showEditColorPicker={showEditColorPicker}
                        setShowEditIconPicker={setShowEditIconPicker}
                        setShowEditColorPicker={setShowEditColorPicker}
                        handleToggleList={handleToggleList}
                        handleEditList={handleEditList}
                        handleSaveEdit={handleSaveEdit}
                        handleCancelEdit={handleCancelEdit}
                        handleDeleteList={handleDeleteList}
                    />

                    {/* Show CreateListSection at bottom only in management mode */}
                    {isManagementMode && (
                        <CreateListSection
                            isGuest={isGuest}
                            onSignIn={handleSignIn}
                            onNewCollection={handleNewCollection}
                            position="bottom"
                        />
                    )}
                </div>
            </div>

            <DeleteConfirmationModal
                deletingList={deletingList}
                deleteConfirmationInput={deleteConfirmationInput}
                setDeleteConfirmationInput={setDeleteConfirmationInput}
                confirmDeleteList={confirmDeleteList}
                cancelDeleteList={cancelDeleteList}
            />

            <CollectionEditorModal
                collection={editorCollection}
                isOpen={showEditor}
                onClose={() => {
                    setShowEditor(false)
                    setEditorCollection(null)
                }}
            />
        </div>
    )
}

export default ListSelectionModal

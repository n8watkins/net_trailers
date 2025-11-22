import React from 'react'
import { UserList } from '../../../types/collections'
import { Content } from '../../../typings'
import ListItem from './ListItem'

interface ListItemsContainerProps {
    allLists: UserList[]
    isManagementMode: boolean
    targetContent: Content | null
    isContentInList: (listId: string, contentId: number) => boolean
    isInWatchlist: (contentId: number) => boolean
    getListIcon: (list: UserList) => React.ReactNode
    hexToRgba: (hex: string, opacity: number) => string
    editingListId: string | null
    editingListName: string
    editingListEmoji: string
    editingListColor: string
    editingIsPublic: boolean
    editingDisplayAsRow: boolean
    setEditingListName: (name: string) => void
    setEditingListEmoji: (emoji: string) => void
    setEditingListColor: (color: string) => void
    setEditingIsPublic: (isPublic: boolean) => void
    setEditingDisplayAsRow: (displayAsRow: boolean) => void
    showEditIconPicker: boolean
    showEditColorPicker: boolean
    setShowEditIconPicker: (show: boolean) => void
    setShowEditColorPicker: (show: boolean) => void
    handleToggleList: (list: UserList) => void
    handleEditList: (list: UserList) => void
    handleSaveEdit: (listId: string, originalName: string) => void
    handleCancelEdit: () => void
    handleDeleteList: (list: UserList) => void
}

function ListItemsContainer({
    allLists,
    isManagementMode,
    targetContent,
    isContentInList,
    isInWatchlist,
    getListIcon,
    hexToRgba,
    editingListId,
    editingListName,
    editingListEmoji,
    editingListColor,
    editingIsPublic,
    editingDisplayAsRow,
    setEditingListName,
    setEditingListEmoji,
    setEditingListColor,
    setEditingIsPublic,
    setEditingDisplayAsRow,
    showEditIconPicker,
    showEditColorPicker,
    setShowEditIconPicker,
    setShowEditColorPicker,
    handleToggleList,
    handleEditList,
    handleSaveEdit,
    handleCancelEdit,
    handleDeleteList,
}: ListItemsContainerProps) {
    // Create edit state handler
    const handleUpdateEditState = (
        updates: Partial<{
            name: string
            emoji: string
            color: string
            isPublic: boolean
            displayAsRow: boolean
        }>
    ) => {
        if (updates.name !== undefined) setEditingListName(updates.name)
        if (updates.emoji !== undefined) setEditingListEmoji(updates.emoji)
        if (updates.color !== undefined) setEditingListColor(updates.color)
        if (updates.isPublic !== undefined) setEditingIsPublic(updates.isPublic)
        if (updates.displayAsRow !== undefined) setEditingDisplayAsRow(updates.displayAsRow)
    }

    return (
        <div className="space-y-2">
            {allLists.map((list) => {
                const isEditing = editingListId === list.id
                const isDefaultList = list.id === 'default-watchlist'
                const mode = isManagementMode ? 'management' : 'content-addition'

                // Calculate isInList for content-addition mode
                const isInList =
                    !isManagementMode && targetContent
                        ? list.id === 'default-watchlist'
                            ? isInWatchlist(targetContent.id)
                            : isContentInList(list.id, targetContent.id)
                        : false

                return (
                    <ListItem
                        key={list.id}
                        list={list}
                        mode={mode}
                        isEditing={isEditing}
                        isDefaultList={isDefaultList}
                        isInList={isInList}
                        editingState={
                            isEditing
                                ? {
                                      name: editingListName,
                                      emoji: editingListEmoji,
                                      color: editingListColor,
                                      isPublic: editingIsPublic,
                                      displayAsRow: editingDisplayAsRow,
                                  }
                                : undefined
                        }
                        onToggle={!isManagementMode ? handleToggleList : undefined}
                        onEdit={handleEditList}
                        onDelete={handleDeleteList}
                        onSaveEdit={handleSaveEdit}
                        onCancelEdit={handleCancelEdit}
                        onUpdateEditState={isEditing ? handleUpdateEditState : undefined}
                        hexToRgba={hexToRgba}
                        getListIcon={getListIcon}
                    />
                )
            })}
        </div>
    )
}

export default ListItemsContainer

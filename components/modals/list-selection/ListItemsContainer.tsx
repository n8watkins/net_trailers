import React from 'react'
import { UserList } from '../../../types/userLists'
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
    return (
        <div className="space-y-2">
            {allLists.map((list) => (
                <ListItem
                    key={list.id}
                    list={list}
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
            ))}
        </div>
    )
}

export default ListItemsContainer

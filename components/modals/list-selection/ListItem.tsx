import React from 'react'
import { UserList } from '../../../types/userLists'
import InlineListEditor from './InlineListEditor'
import ManagementModeListItem from './ManagementModeListItem'
import ContentAdditionListItem from './ContentAdditionListItem'

interface ListItemProps {
    list: UserList
    mode: 'management' | 'content-addition'
    isEditing: boolean
    isDefaultList: boolean
    isInList?: boolean
    editingState?: {
        name: string
        emoji: string
        color: string
        isPublic: boolean
        displayAsRow: boolean
    }
    onToggle?: (list: UserList) => void
    onEdit: (list: UserList) => void
    onDelete: (list: UserList) => void
    onSaveEdit: (listId: string, originalName: string) => void
    onCancelEdit: () => void
    onUpdateEditState?: (
        updates: Partial<{
            name: string
            emoji: string
            color: string
            isPublic: boolean
            displayAsRow: boolean
        }>
    ) => void
    hexToRgba: (hex: string, opacity: number) => string
    getListIcon: (list: UserList) => React.ReactNode
}

export default function ListItem({
    list,
    mode,
    isEditing,
    isDefaultList,
    isInList = false,
    editingState,
    onToggle,
    onEdit,
    onDelete,
    onSaveEdit,
    onCancelEdit,
    onUpdateEditState,
    hexToRgba,
    getListIcon,
}: ListItemProps) {
    // If editing, show the inline editor
    if (isEditing && editingState && onUpdateEditState) {
        return (
            <InlineListEditor
                list={list}
                editingState={editingState}
                onUpdateState={onUpdateEditState}
                onSave={onSaveEdit}
                onCancel={onCancelEdit}
                hexToRgba={hexToRgba}
            />
        )
    }

    // Otherwise, show the appropriate display mode
    if (mode === 'management') {
        return (
            <ManagementModeListItem
                list={list}
                isDefaultList={isDefaultList}
                onEdit={onEdit}
                onDelete={onDelete}
                hexToRgba={hexToRgba}
                getListIcon={getListIcon}
            />
        )
    } else {
        // content-addition mode
        if (!onToggle) {
            throw new Error('onToggle is required for content-addition mode')
        }

        return (
            <ContentAdditionListItem
                list={list}
                isDefaultList={isDefaultList}
                isInList={isInList}
                onToggle={onToggle}
                onEdit={onEdit}
                onDelete={onDelete}
                hexToRgba={hexToRgba}
                getListIcon={getListIcon}
            />
        )
    }
}

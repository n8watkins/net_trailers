import React from 'react'
import { PencilIcon, TrashIcon } from '@heroicons/react/24/solid'
import { UserList } from '../../../types/collections'

interface ManagementModeListItemProps {
    list: UserList
    isDefaultList: boolean
    onEdit: (list: UserList) => void
    onDelete: (list: UserList) => void
    hexToRgba: (hex: string, opacity: number) => string
    getListIcon: (list: UserList) => React.ReactNode
}

export default function ManagementModeListItem({
    list,
    isDefaultList,
    onEdit,
    onDelete,
    hexToRgba,
    getListIcon,
}: ManagementModeListItemProps) {
    const listColor = list.color || '#6b7280'

    return (
        <div
            className="w-full flex items-center justify-between p-4 rounded-lg border-l-[6px] border-t border-r border-b transition-all duration-200"
            style={{
                borderLeftColor: listColor,
                borderTopColor: hexToRgba(listColor, 0.3),
                borderRightColor: hexToRgba(listColor, 0.3),
                borderBottomColor: hexToRgba(listColor, 0.3),
                backgroundColor: hexToRgba(listColor, 0.15),
            }}
        >
            <div className="flex items-center space-x-4">
                {getListIcon(list)}
                <div className="text-left">
                    <div className="text-white font-medium text-base">{list.name}</div>
                </div>
            </div>

            <div className="flex items-center space-x-2">
                {/* Only show edit/delete for custom lists */}
                {!isDefaultList && (
                    <>
                        <button
                            onClick={() => onEdit(list)}
                            className="p-1.5 hover:bg-gray-600 rounded transition-colors"
                            title="Edit list"
                        >
                            <PencilIcon className="w-4 h-4 text-gray-400 hover:text-white" />
                        </button>
                        <button
                            onClick={() => onDelete(list)}
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

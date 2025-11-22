import React from 'react'
import { PencilIcon, TrashIcon } from '@heroicons/react/24/solid'
import { UserList } from '../../../types/collections'

interface ContentAdditionListItemProps {
    list: UserList
    isDefaultList: boolean
    isInList: boolean
    onToggle: (list: UserList) => void
    onEdit: (list: UserList) => void
    onDelete: (list: UserList) => void
    hexToRgba: (hex: string, opacity: number) => string
    getListIcon: (list: UserList) => React.ReactNode
}

export default function ContentAdditionListItem({
    list,
    isDefaultList,
    isInList,
    onToggle,
    onEdit,
    onDelete,
    hexToRgba,
    getListIcon,
}: ContentAdditionListItemProps) {
    const listColor = list.color || '#6b7280'

    return (
        <div
            className={`w-full flex items-center justify-between p-4 rounded-lg transition-all duration-200 border-l-[6px] border-t border-r border-b ${
                isInList ? 'ring-1 ring-green-400 hover:brightness-110' : 'hover:brightness-125'
            }`}
            style={{
                borderLeftColor: listColor,
                borderTopColor: isInList ? hexToRgba(listColor, 0.5) : hexToRgba(listColor, 0.3),
                borderRightColor: isInList ? hexToRgba(listColor, 0.5) : hexToRgba(listColor, 0.3),
                borderBottomColor: isInList ? hexToRgba(listColor, 0.5) : hexToRgba(listColor, 0.3),
                backgroundColor: isInList ? hexToRgba(listColor, 0.25) : hexToRgba(listColor, 0.15),
            }}
        >
            <button
                onClick={() => onToggle(list)}
                className="flex items-center space-x-4 flex-1 text-left"
            >
                <div>{getListIcon(list)}</div>
                <div>
                    <div className="text-white font-medium text-base">{list.name}</div>
                </div>
            </button>

            <div className="flex items-center space-x-2">
                {/* Show edit/delete for custom lists */}
                {!isDefaultList && (
                    <>
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                onEdit(list)
                            }}
                            className="p-1.5 hover:bg-gray-600 rounded transition-colors"
                            title="Edit list"
                        >
                            <PencilIcon className="w-4 h-4 text-gray-400 hover:text-white" />
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                onDelete(list)
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

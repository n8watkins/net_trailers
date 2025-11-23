import React from 'react'
import { UserList } from '../../../types/collections'

interface ContentAdditionListItemProps {
    list: UserList
    isDefaultList: boolean
    isInList: boolean
    onToggle: (list: UserList) => void
    hexToRgba: (hex: string, opacity: number) => string
    getListIcon: (list: UserList) => React.ReactNode
}

export default function ContentAdditionListItem({
    list,
    isInList,
    onToggle,
    hexToRgba,
    getListIcon,
}: ContentAdditionListItemProps) {
    const listColor = list.color || '#6b7280'

    return (
        <button
            onClick={() => onToggle(list)}
            className={`w-full flex items-center p-3 rounded-lg transition-all duration-200 border-l-[6px] border-t border-r border-b ${
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
            <div className="flex items-center space-x-3 flex-1 text-left">
                <div className="flex-shrink-0">{getListIcon(list)}</div>
                <div className="text-white font-medium text-sm truncate">{list.name}</div>
            </div>
        </button>
    )
}

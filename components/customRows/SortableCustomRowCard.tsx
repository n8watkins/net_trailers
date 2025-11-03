'use client'

import React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { CustomRowCard } from './CustomRowCard'
import { DisplayRow } from '../../types/customRows'

interface SortableCustomRowCardProps {
    row: DisplayRow
    onEdit: (row: DisplayRow) => void
    onDelete: (row: DisplayRow) => void
    onToggleEnabled: (row: DisplayRow) => void
}

/**
 * Sortable wrapper for CustomRowCard
 * Enables drag and drop reordering for custom rows
 */
export function SortableCustomRowCard({
    row,
    onEdit,
    onDelete,
    onToggleEnabled,
}: SortableCustomRowCardProps) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: row.id,
        disabled: row.isSystemRow, // System rows cannot be dragged
    })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        cursor: row.isSystemRow ? 'default' : 'grab',
    }

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
            <CustomRowCard
                row={row}
                onEdit={onEdit}
                onDelete={onDelete}
                onToggleEnabled={onToggleEnabled}
            />
        </div>
    )
}

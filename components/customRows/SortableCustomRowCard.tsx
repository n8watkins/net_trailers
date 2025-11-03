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
 * Uses setActivatorNodeRef to only enable dragging from the drag handle
 */
export function SortableCustomRowCard({
    row,
    onEdit,
    onDelete,
    onToggleEnabled,
}: SortableCustomRowCardProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        setActivatorNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: row.id,
        disabled: false,
    })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    }

    return (
        <div ref={setNodeRef} style={style}>
            <CustomRowCard
                row={row}
                onEdit={onEdit}
                onDelete={onDelete}
                onToggleEnabled={onToggleEnabled}
                dragHandleProps={{ ref: setActivatorNodeRef, ...attributes, ...listeners }}
            />
        </div>
    )
}

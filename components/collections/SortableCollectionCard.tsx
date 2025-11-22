'use client'

import React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { CollectionCard } from './CollectionCard'
import { DisplayRow } from '../../types/collections'

interface SortableCollectionCardProps {
    row: DisplayRow
    onEdit: (row: DisplayRow) => void
    onDelete: (row: DisplayRow) => void
    onMoveUp?: (row: DisplayRow) => void
    onMoveDown?: (row: DisplayRow) => void
}

/**
 * Sortable wrapper for CollectionCard
 * Enables drag and drop reordering for custom rows
 * Uses setActivatorNodeRef to only enable dragging from the drag handle
 */
export function SortableCollectionCard({
    row,
    onEdit,
    onDelete,
    onMoveUp,
    onMoveDown,
}: SortableCollectionCardProps) {
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
            <CollectionCard
                row={row}
                onEdit={onEdit}
                onDelete={onDelete}
                onMoveUp={onMoveUp}
                onMoveDown={onMoveDown}
                dragHandleProps={{ ref: setActivatorNodeRef, ...attributes, ...listeners }}
            />
        </div>
    )
}

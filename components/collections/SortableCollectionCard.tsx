'use client'

import React, { memo, useMemo } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { CollectionCard } from './CollectionCard'
import { DisplayRow } from '../../types/collections'

interface SortableCollectionCardProps {
    row: DisplayRow
    onEdit: (row: DisplayRow) => void
    onDelete: (row: DisplayRow) => void
    onToggle?: (row: DisplayRow) => void
    onTogglePublicDisplay?: (row: DisplayRow) => void
    onMoveUp?: (row: DisplayRow) => void
    onMoveDown?: (row: DisplayRow) => void
    isFirst?: boolean
    isLast?: boolean
}

/**
 * Sortable wrapper for CollectionCard
 * Enables drag and drop reordering for custom rows
 * Uses setActivatorNodeRef to only enable dragging from the drag handle
 * Memoized to prevent unnecessary re-renders during drag operations
 */
export const SortableCollectionCard = memo(function SortableCollectionCard({
    row,
    onEdit,
    onDelete,
    onToggle,
    onTogglePublicDisplay,
    onMoveUp,
    onMoveDown,
    isFirst,
    isLast,
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

    const style = useMemo(
        () => ({
            transform: CSS.Transform.toString(transform),
            transition,
            opacity: isDragging ? 0.5 : 1,
        }),
        [transform, transition, isDragging]
    )

    const dragHandleProps = useMemo(
        () => ({
            ref: setActivatorNodeRef,
            ...attributes,
            ...listeners,
        }),
        [setActivatorNodeRef, attributes, listeners]
    )

    return (
        <div ref={setNodeRef} style={style}>
            <CollectionCard
                row={row}
                onEdit={onEdit}
                onDelete={onDelete}
                onTogglePublicDisplay={onTogglePublicDisplay}
                onMoveUp={onMoveUp}
                onMoveDown={onMoveDown}
                dragHandleProps={dragHandleProps}
            />
        </div>
    )
})

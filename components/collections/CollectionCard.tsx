'use client'

import React, { useState, memo } from 'react'
import { PencilIcon, TrashIcon, Bars3Icon, BellIcon } from '@heroicons/react/24/outline'
import { DisplayRow } from '../../types/collections'
import { getUnifiedGenresByMediaType } from '../../constants/unifiedGenres'
import { DeleteConfirmationModal } from '../modals/DeleteConfirmationModal'

/**
 * Format timestamp to relative time (e.g., "2 hours ago")
 */
function formatRelativeTime(timestamp: number): string {
    const now = Date.now()
    const diff = now - timestamp
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    if (minutes > 0) return `${minutes}m ago`
    return 'Just now'
}

interface CollectionCardProps {
    row: DisplayRow
    onEdit: (row: DisplayRow) => void
    onDelete: (row: DisplayRow) => void
    onMoveUp?: (row: DisplayRow) => void
    onMoveDown?: (row: DisplayRow) => void
    dragHandleProps?: any
}

/**
 * CollectionCard Component
 *
 * Displays a single row (system or custom) with management controls.
 * System rows: Can only be enabled/disabled
 * Custom rows: Full CRUD operations (edit, delete, enable/disable)
 * Memoized to prevent unnecessary re-renders during drag operations
 */
export const CollectionCard = memo(function CollectionCard({
    row,
    onEdit,
    onDelete,
    onMoveUp,
    onMoveDown,
    dragHandleProps,
}: CollectionCardProps) {
    const [showDeleteModal, setShowDeleteModal] = useState(false)

    // Get unified genres and map to names
    const allGenres = getUnifiedGenresByMediaType(row.mediaType || 'both')
    const genreNames = row.genres
        .map((genreId) => allGenres.find((g) => g.id === genreId)?.name)
        .filter(Boolean)

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowUp' && onMoveUp) {
            e.preventDefault()
            onMoveUp(row)
        } else if (e.key === 'ArrowDown' && onMoveDown) {
            e.preventDefault()
            onMoveDown(row)
        }
    }

    return (
        <>
            <div
                className="bg-[#1a1a1a] border rounded-lg p-3 transition-all min-h-[72px]"
                style={{
                    borderColor: row.color ? `${row.color}50` : '#374151',
                    backgroundColor: row.color ? `${row.color}10` : '#1a1a1a',
                }}
            >
                <div className="flex items-center justify-between gap-3 h-full">
                    {/* Drag Handle */}
                    <button
                        {...dragHandleProps}
                        onKeyDown={handleKeyDown}
                        className="flex items-center justify-center p-1.5 cursor-grab active:cursor-grabbing hover:bg-gray-800 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
                        title="Drag to reorder or use arrow keys"
                        aria-label={`Drag to reorder ${row.name} or use arrow keys to move up or down`}
                        tabIndex={0}
                    >
                        <Bars3Icon className="w-5 h-5 text-gray-400" />
                    </button>
                    {/* Row Info */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                            {row.emoji && <span className="text-xl">{row.emoji}</span>}
                            <h3 className="text-lg font-semibold text-white truncate">
                                {row.name}
                            </h3>
                            {!row.isSystemCollection && row.autoUpdateEnabled && (
                                <span
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-600/20 text-blue-400 rounded text-xs font-medium shrink-0"
                                    title={`Auto-updating ${row.updateFrequency || 'weekly'}`}
                                >
                                    <BellIcon className="w-3 h-3" />
                                    Auto
                                </span>
                            )}
                            {/* Genres Display - Inline with title */}
                            {genreNames.length > 0 && (
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    {genreNames.map((genre) => (
                                        <span
                                            key={genre}
                                            className="inline-block px-2 py-0.5 bg-red-900/30 text-red-300 rounded text-xs"
                                        >
                                            {genre}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                        {/* Edit */}
                        <button
                            onClick={() => onEdit(row)}
                            className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors shrink-0"
                            title="Edit collection"
                        >
                            <PencilIcon className="w-5 h-5 text-gray-300" />
                        </button>

                        {/* Delete - All collections are deletable */}
                        <button
                            onClick={() => setShowDeleteModal(true)}
                            className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors shrink-0"
                            title="Delete collection"
                        >
                            <TrashIcon className="w-5 h-5 text-gray-300" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            <DeleteConfirmationModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={() => onDelete(row)}
                itemName={row.name}
                emoji={row.emoji}
                isSystemItem={row.isSystemCollection}
            />
        </>
    )
})

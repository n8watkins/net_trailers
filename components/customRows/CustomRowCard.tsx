'use client'

import React, { useState } from 'react'
import {
    PencilIcon,
    TrashIcon,
    FilmIcon,
    TvIcon,
    SparklesIcon,
    Bars3Icon,
    BellIcon,
    ClockIcon,
} from '@heroicons/react/24/outline'
import { DisplayRow } from '../../types/customRows'
import { MOVIE_GENRES, TV_GENRES } from '../../constants/genres'

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

interface CustomRowCardProps {
    row: DisplayRow
    onEdit: (row: DisplayRow) => void
    onDelete: (row: DisplayRow) => void
    onMoveUp?: (row: DisplayRow) => void
    onMoveDown?: (row: DisplayRow) => void
    dragHandleProps?: any
}

/**
 * CustomRowCard Component
 *
 * Displays a single row (system or custom) with management controls.
 * System rows: Can only be enabled/disabled
 * Custom rows: Full CRUD operations (edit, delete, enable/disable)
 */
export function CustomRowCard({
    row,
    onEdit,
    onDelete,
    onMoveUp,
    onMoveDown,
    dragHandleProps,
}: CustomRowCardProps) {
    const [isDeleting, setIsDeleting] = useState(false)

    const genres = row.mediaType === 'movie' || row.mediaType === 'both' ? MOVIE_GENRES : TV_GENRES
    const genreNames = row.genres.map((id) => genres.find((g) => g.id === id)?.name).filter(Boolean)

    const handleDelete = () => {
        if (isDeleting) {
            onDelete(row)
        } else {
            setIsDeleting(true)
            // Reset after 3 seconds
            setTimeout(() => setIsDeleting(false), 3000)
        }
    }

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
        <div
            className={`bg-[#1a1a1a] border rounded-lg p-3 transition-all border-gray-700 hover:border-gray-600 ${row.isSystemRow ? 'border-l-4 border-l-purple-500' : ''}`}
        >
            <div className="flex items-center justify-between gap-3">
                {/* Drag Handle */}
                <button
                    {...dragHandleProps}
                    onKeyDown={handleKeyDown}
                    className="flex items-center justify-center p-1.5 cursor-grab active:cursor-grabbing hover:bg-gray-800 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
                    title="Drag to reorder or use arrow keys"
                    aria-label={`Drag to reorder ${row.name} or use arrow keys to move up or down`}
                    tabIndex={0}
                >
                    <Bars3Icon className="w-4 h-4 text-gray-400" />
                </button>
                {/* Row Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-semibold text-white truncate">{row.name}</h3>
                        {row.isSystemRow && (
                            <span
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-purple-600/20 text-purple-400 rounded text-xs font-medium shrink-0"
                                title="System collection"
                            >
                                <SparklesIcon className="w-3 h-3" />
                                System
                            </span>
                        )}
                        {!row.isSystemRow && row.autoUpdateEnabled && (
                            <span
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-600/20 text-blue-400 rounded text-xs font-medium shrink-0"
                                title={`Auto-updating ${row.updateFrequency || 'weekly'}`}
                            >
                                <BellIcon className="w-3 h-3" />
                                Auto
                            </span>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-1.5">
                    {/* Edit */}
                    <button
                        onClick={() => onEdit(row)}
                        className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors shrink-0"
                        title={row.isSystemRow ? 'Edit collection name' : 'Edit collection'}
                    >
                        <PencilIcon className="w-4 h-4 text-gray-300" />
                    </button>

                    {/* Delete - All collections are deletable */}
                    <button
                        onClick={handleDelete}
                        className={`p-1.5 rounded-lg transition-colors shrink-0 ${
                            isDeleting
                                ? 'bg-red-600 hover:bg-red-700'
                                : 'bg-gray-800 hover:bg-gray-700'
                        }`}
                        title={isDeleting ? 'Click again to confirm' : 'Delete collection'}
                    >
                        <TrashIcon
                            className={`w-4 h-4 ${isDeleting ? 'text-white' : 'text-gray-300'}`}
                        />
                    </button>
                </div>
            </div>

            {/* Delete Confirmation Message */}
            {isDeleting && (
                <div className="mt-2 p-2 bg-red-600/20 border border-red-600/50 rounded-lg">
                    <p className="text-xs text-red-400">
                        {row.isSystemRow
                            ? 'Click delete again to remove (can be restored with "Reset Defaults")'
                            : 'Click delete again to permanently remove'}
                    </p>
                </div>
            )}
        </div>
    )
}

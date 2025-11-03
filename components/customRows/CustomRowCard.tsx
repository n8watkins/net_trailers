'use client'

import React, { useState } from 'react'
import {
    PencilIcon,
    TrashIcon,
    EyeIcon,
    EyeSlashIcon,
    FilmIcon,
    TvIcon,
} from '@heroicons/react/24/outline'
import { CustomRow } from '../../types/customRows'
import { MOVIE_GENRES, TV_GENRES } from '../../constants/genres'

interface CustomRowCardProps {
    row: CustomRow
    onEdit: (row: CustomRow) => void
    onDelete: (row: CustomRow) => void
    onToggleEnabled: (row: CustomRow) => void
}

/**
 * CustomRowCard Component
 *
 * Displays a single custom row with management controls.
 * Shows row name, genres, media type, display pages, and actions.
 */
export function CustomRowCard({ row, onEdit, onDelete, onToggleEnabled }: CustomRowCardProps) {
    const [isDeleting, setIsDeleting] = useState(false)

    const genres = row.mediaType === 'movie' ? MOVIE_GENRES : TV_GENRES
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

    return (
        <div
            className={`bg-[#1a1a1a] border rounded-lg p-5 transition-all ${
                row.enabled ? 'border-gray-700 hover:border-gray-600' : 'border-gray-800 opacity-60'
            }`}
        >
            <div className="flex items-start justify-between gap-4">
                {/* Row Info */}
                <div className="flex-1 space-y-3">
                    {/* Name and Status */}
                    <div className="flex items-start gap-3">
                        <div className="flex-1">
                            <h3 className="text-lg font-semibold text-white">{row.name}</h3>
                            {!row.enabled && (
                                <span className="inline-block mt-1 text-xs text-gray-500">
                                    (Disabled)
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Media Type */}
                    <div className="flex items-center gap-2 text-sm">
                        {row.mediaType === 'movie' ? (
                            <FilmIcon className="w-4 h-4 text-gray-400" />
                        ) : (
                            <TvIcon className="w-4 h-4 text-gray-400" />
                        )}
                        <span className="text-gray-400">
                            {row.mediaType === 'movie' ? 'Movies' : 'TV Shows'}
                        </span>
                    </div>

                    {/* Genres */}
                    <div className="flex flex-wrap gap-2">
                        {genreNames.map((name, index) => (
                            <React.Fragment key={index}>
                                <span className="px-2 py-1 bg-red-600/20 text-red-400 rounded text-xs font-medium">
                                    {name}
                                </span>
                                {index < genreNames.length - 1 && row.genres.length > 1 && (
                                    <span className="text-gray-500 text-xs flex items-center">
                                        {row.genreLogic}
                                    </span>
                                )}
                            </React.Fragment>
                        ))}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2">
                    {/* Toggle Enabled */}
                    <button
                        onClick={() => onToggleEnabled(row)}
                        className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
                        title={row.enabled ? 'Disable row' : 'Enable row'}
                    >
                        {row.enabled ? (
                            <EyeIcon className="w-5 h-5 text-gray-300" />
                        ) : (
                            <EyeSlashIcon className="w-5 h-5 text-gray-500" />
                        )}
                    </button>

                    {/* Edit */}
                    <button
                        onClick={() => onEdit(row)}
                        className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
                        title="Edit row"
                    >
                        <PencilIcon className="w-5 h-5 text-gray-300" />
                    </button>

                    {/* Delete */}
                    <button
                        onClick={handleDelete}
                        className={`p-2 rounded-lg transition-colors ${
                            isDeleting
                                ? 'bg-red-600 hover:bg-red-700'
                                : 'bg-gray-800 hover:bg-gray-700'
                        }`}
                        title={isDeleting ? 'Click again to confirm' : 'Delete row'}
                    >
                        <TrashIcon
                            className={`w-5 h-5 ${isDeleting ? 'text-white' : 'text-gray-300'}`}
                        />
                    </button>
                </div>
            </div>

            {/* Delete Confirmation Message */}
            {isDeleting && (
                <div className="mt-3 p-3 bg-red-600/20 border border-red-600/50 rounded-lg">
                    <p className="text-sm text-red-400">
                        Click delete again to permanently remove this row
                    </p>
                </div>
            )}
        </div>
    )
}

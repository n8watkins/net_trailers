'use client'

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { XMarkIcon, PlusIcon } from '@heroicons/react/24/outline'
import Image from 'next/image'
import { AdvancedFilters } from '../../types/collections'
import { YearPicker } from './YearPicker'

interface Person {
    id: number
    name: string
    profile_path: string | null
    known_for_department: string
}

interface AdvancedFiltersModalProps {
    isOpen: boolean
    filters: AdvancedFilters
    onClose: () => void
    onChange: (filters: AdvancedFilters) => void
}

// Popularity scale mapping
const POPULARITY_SCALE = [
    { label: 'Any', value: 0 },
    { label: 'Low', value: 10 },
    { label: 'Medium', value: 50 },
    { label: 'High', value: 100 },
    { label: 'Very High', value: 200 },
]

// Vote count scale mapping
const VOTE_COUNT_SCALE = [
    { label: 'Any', value: 0 },
    { label: 'Few (100+)', value: 100 },
    { label: 'Some (1K+)', value: 1000 },
    { label: 'Many (5K+)', value: 5000 },
    { label: 'Tons (10K+)', value: 10000 },
]

export function AdvancedFiltersModal({
    isOpen,
    filters,
    onClose,
    onChange,
}: AdvancedFiltersModalProps) {
    const [localFilters, setLocalFilters] = useState<AdvancedFilters>(filters)
    const [mounted, setMounted] = useState(false)
    const [showActorInput, setShowActorInput] = useState(false)
    const [showDirectorInput, setShowDirectorInput] = useState(false)
    const [actorInput, setActorInput] = useState('')
    const [directorInput, setDirectorInput] = useState('')
    const [actorSearchResults, setActorSearchResults] = useState<Person[]>([])
    const [directorSearchResults, setDirectorSearchResults] = useState<Person[]>([])
    const [isSearchingActors, setIsSearchingActors] = useState(false)
    const [isSearchingDirector, setIsSearchingDirector] = useState(false)
    const [selectedActorIndex, setSelectedActorIndex] = useState(0)
    const [selectedDirectorIndex, setSelectedDirectorIndex] = useState(0)

    const currentYear = new Date().getFullYear()

    useEffect(() => {
        setMounted(true)
        return () => setMounted(false)
    }, [])

    useEffect(() => {
        if (isOpen) {
            setLocalFilters(filters)
            setShowActorInput(false)
            setShowDirectorInput(false)
            setActorInput('')
            setDirectorInput('')
            setActorSearchResults([])
            setDirectorSearchResults([])
        }
    }, [isOpen, filters])

    const mouseDownTargetRef = React.useRef<EventTarget | null>(null)

    if (!isOpen || !mounted || typeof window === 'undefined') return null

    // Search for people
    const searchPeople = async (query: string): Promise<Person[]> => {
        if (query.trim().length < 2) return []

        try {
            const response = await fetch(`/api/search/people?query=${encodeURIComponent(query)}`)
            if (!response.ok) throw new Error('Search failed')
            const data = await response.json()
            return data.results || []
        } catch (error) {
            console.error('Person search error:', error)
            return []
        }
    }

    const handleActorInputChange = async (value: string) => {
        setActorInput(value)

        if (value.trim().length >= 2) {
            setIsSearchingActors(true)
            const results = await searchPeople(value.trim())
            setActorSearchResults(results.filter((p) => p.known_for_department === 'Acting'))
            setSelectedActorIndex(0)
            setIsSearchingActors(false)
        } else {
            setActorSearchResults([])
            setSelectedActorIndex(0)
        }
    }

    const handleDirectorInputChange = async (value: string) => {
        setDirectorInput(value)

        if (value.trim().length >= 2) {
            setIsSearchingDirector(true)
            const results = await searchPeople(value.trim())
            setDirectorSearchResults(results.filter((p) => p.known_for_department === 'Directing'))
            setSelectedDirectorIndex(0)
            setIsSearchingDirector(false)
        } else {
            setDirectorSearchResults([])
            setSelectedDirectorIndex(0)
        }
    }

    const addActor = (actor: Person) => {
        const currentActors = localFilters.withCast || []
        const currentActorIds = localFilters.withCastIds || []
        if (!currentActors.includes(actor.name)) {
            const newFilters = {
                ...localFilters,
                withCast: [...currentActors, actor.name],
                withCastIds: [...currentActorIds, actor.id],
            }
            setLocalFilters(newFilters)
            onChange(newFilters) // Auto-save
        }
        setActorInput('')
        setActorSearchResults([])
        setShowActorInput(false)
    }

    const removeActor = (actorName: string) => {
        const currentActors = localFilters.withCast || []
        const currentActorIds = localFilters.withCastIds || []
        const actorIndex = currentActors.indexOf(actorName)

        const newFilters = {
            ...localFilters,
            withCast: currentActors.filter((name) => name !== actorName),
            withCastIds: currentActorIds.filter((_, index) => index !== actorIndex),
        }
        setLocalFilters(newFilters)
        onChange(newFilters) // Auto-save
    }

    const addDirector = (director: Person) => {
        const currentDirectors = localFilters.withDirector || []
        const currentDirectorIds = localFilters.withDirectorIds || []
        if (!currentDirectors.includes(director.name)) {
            const newFilters = {
                ...localFilters,
                withDirector: [...currentDirectors, director.name],
                withDirectorIds: [...currentDirectorIds, director.id],
            }
            setLocalFilters(newFilters)
            onChange(newFilters) // Auto-save
        }
        setDirectorInput('')
        setDirectorSearchResults([])
        setShowDirectorInput(false)
    }

    const removeDirector = (directorName: string) => {
        const currentDirectors = localFilters.withDirector || []
        const currentDirectorIds = localFilters.withDirectorIds || []
        const directorIndex = currentDirectors.indexOf(directorName)

        const newFilters = {
            ...localFilters,
            withDirector: currentDirectors.filter((name) => name !== directorName),
            withDirectorIds: currentDirectorIds.filter((_, index) => index !== directorIndex),
        }
        setLocalFilters(newFilters)
        onChange(newFilters) // Auto-save
    }

    const updateFilter = (key: keyof AdvancedFilters, value: any) => {
        const newFilters = {
            ...localFilters,
            [key]: value,
        }
        setLocalFilters(newFilters)
        // Auto-save: immediately propagate changes to parent
        onChange(newFilters)
    }

    const handleClearAll = () => {
        setLocalFilters({})
        // Auto-save: immediately propagate cleared filters to parent
        onChange({})
    }

    const hasActiveFilters =
        localFilters.yearMin ||
        localFilters.yearMax ||
        localFilters.ratingMin !== undefined ||
        localFilters.ratingMax !== undefined ||
        localFilters.popularity ||
        localFilters.voteCount

    const modalContent = (
        <div className="fixed inset-0 z-modal-editor-inner overflow-y-auto">
            {/* Backdrop */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" />
            </div>

            {/* Modal */}
            <div
                className="relative min-h-screen flex items-center justify-center p-4"
                onMouseDown={(e) => {
                    if (e.target === e.currentTarget) {
                        mouseDownTargetRef.current = e.target
                    }
                }}
                onMouseUp={(e) => {
                    if (e.target === e.currentTarget && mouseDownTargetRef.current === e.target) {
                        onClose()
                    }
                    mouseDownTargetRef.current = null
                }}
            >
                <div
                    className="relative bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] rounded-2xl shadow-2xl max-w-3xl w-full border border-gray-700"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="relative z-10 flex items-center justify-between p-6 border-b border-zinc-800/50">
                        <div>
                            <h2 className="text-xl font-bold text-white">Advanced Filters</h2>
                            <p className="text-sm text-gray-400 mt-1">
                                Fine-tune your collection criteria
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-white transition-colors"
                        >
                            <XMarkIcon className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 max-h-[calc(90vh-200px)] overflow-y-auto space-y-6">
                        {/* Year Range */}
                        <div>
                            <label className="block text-sm font-medium text-gray-200 mb-3">
                                Release Year
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                <YearPicker
                                    value={localFilters.yearMin}
                                    onChange={(year) => updateFilter('yearMin', year)}
                                    label="From"
                                    placeholder="1990"
                                    minYear={1880}
                                    maxYear={currentYear}
                                />
                                <YearPicker
                                    value={localFilters.yearMax}
                                    onChange={(year) => updateFilter('yearMax', year)}
                                    label="To"
                                    placeholder={currentYear.toString()}
                                    minYear={1880}
                                    maxYear={currentYear}
                                />
                            </div>
                        </div>

                        {/* Rating Range */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <label className="text-sm font-medium text-gray-200">
                                    Rating Range
                                </label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        min="0"
                                        max="10"
                                        step="0.1"
                                        value={localFilters.ratingMin ?? ''}
                                        onChange={(e) => {
                                            const val = e.target.value
                                            updateFilter(
                                                'ratingMin',
                                                val === '' ? undefined : parseFloat(val)
                                            )
                                        }}
                                        placeholder="0"
                                        className="w-16 px-2 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-center text-base focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                                    />
                                    <span className="text-gray-400">to</span>
                                    <input
                                        type="number"
                                        min="0"
                                        max="10"
                                        step="0.1"
                                        value={localFilters.ratingMax ?? ''}
                                        onChange={(e) => {
                                            const val = e.target.value
                                            updateFilter(
                                                'ratingMax',
                                                val === '' ? undefined : parseFloat(val)
                                            )
                                        }}
                                        placeholder="10"
                                        className="w-16 px-2 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-center text-base focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                                    />
                                </div>
                            </div>
                            <div className="space-y-3">
                                {/* Min Rating Slider */}
                                <div>
                                    <div className="flex justify-between text-xs text-gray-400 mb-2">
                                        <span>Minimum Rating</span>
                                        <span className="text-red-400 font-semibold text-sm">
                                            {localFilters.ratingMin !== undefined
                                                ? `${localFilters.ratingMin}/10`
                                                : 'Any'}
                                        </span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="10"
                                        step="0.1"
                                        value={localFilters.ratingMin ?? 0}
                                        onChange={(e) =>
                                            updateFilter(
                                                'ratingMin',
                                                parseFloat(e.target.value) || undefined
                                            )
                                        }
                                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-red-600 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:hover:bg-red-500 [&::-webkit-slider-thumb]:transition-colors"
                                    />
                                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                                        <span>0</span>
                                        <span>10</span>
                                    </div>
                                </div>

                                {/* Max Rating Slider */}
                                <div>
                                    <div className="flex justify-between text-xs text-gray-400 mb-2">
                                        <span>Maximum Rating</span>
                                        <span className="text-red-400 font-semibold text-sm">
                                            {localFilters.ratingMax !== undefined
                                                ? `${localFilters.ratingMax}/10`
                                                : 'Any'}
                                        </span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="10"
                                        step="0.1"
                                        value={localFilters.ratingMax ?? 10}
                                        onChange={(e) =>
                                            updateFilter(
                                                'ratingMax',
                                                parseFloat(e.target.value) || undefined
                                            )
                                        }
                                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-red-600 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:hover:bg-red-500 [&::-webkit-slider-thumb]:transition-colors"
                                    />
                                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                                        <span>0</span>
                                        <span>10</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Cast (Actors) */}
                        <div>
                            <label className="block text-sm font-medium text-gray-200 mb-3">
                                Cast (Actors)
                            </label>
                            {localFilters.withCast && localFilters.withCast.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-3">
                                    {localFilters.withCast.map((actorName, index) => (
                                        <div
                                            key={index}
                                            className="flex items-center gap-2 bg-gray-700 rounded-lg px-3 py-2"
                                        >
                                            <span className="text-sm text-white">{actorName}</span>
                                            <button
                                                onClick={() => removeActor(actorName)}
                                                className="text-gray-400 hover:text-red-400 transition-colors"
                                            >
                                                <XMarkIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {!showActorInput && (
                                <button
                                    onClick={() => setShowActorInput(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                                >
                                    <PlusIcon className="w-4 h-4" />
                                    <span className="text-sm">Add Actor</span>
                                </button>
                            )}
                            {showActorInput && (
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={actorInput}
                                        onChange={(e) => handleActorInputChange(e.target.value)}
                                        placeholder="Search for an actor..."
                                        className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                                        autoFocus
                                    />
                                    {actorSearchResults.length > 0 && (
                                        <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-h-60 overflow-y-auto z-10">
                                            {actorSearchResults.map((actor) => (
                                                <button
                                                    key={actor.id}
                                                    onClick={() => addActor(actor)}
                                                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-700 transition-colors text-left"
                                                >
                                                    {actor.profile_path ? (
                                                        <Image
                                                            src={`https://image.tmdb.org/t/p/w185${actor.profile_path}`}
                                                            alt={actor.name}
                                                            width={40}
                                                            height={40}
                                                            className="rounded-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">
                                                            <span className="text-gray-400 text-xs">
                                                                N/A
                                                            </span>
                                                        </div>
                                                    )}
                                                    <span className="text-white text-sm">
                                                        {actor.name}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Directors */}
                        <div>
                            <label className="block text-sm font-medium text-gray-200 mb-3">
                                Directors
                            </label>
                            {localFilters.withDirector && localFilters.withDirector.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-3">
                                    {localFilters.withDirector.map((directorName, index) => (
                                        <div
                                            key={index}
                                            className="flex items-center gap-2 bg-gray-700 rounded-lg px-3 py-2"
                                        >
                                            <span className="text-sm text-white">
                                                {directorName}
                                            </span>
                                            <button
                                                onClick={() => removeDirector(directorName)}
                                                className="text-gray-400 hover:text-red-400 transition-colors"
                                            >
                                                <XMarkIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {!showDirectorInput && (
                                <button
                                    onClick={() => setShowDirectorInput(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                                >
                                    <PlusIcon className="w-4 h-4" />
                                    <span className="text-sm">Add Director</span>
                                </button>
                            )}
                            {showDirectorInput && (
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={directorInput}
                                        onChange={(e) => handleDirectorInputChange(e.target.value)}
                                        placeholder="Search for a director..."
                                        className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                                        autoFocus
                                    />
                                    {directorSearchResults.length > 0 && (
                                        <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-h-60 overflow-y-auto z-10">
                                            {directorSearchResults.map((director) => (
                                                <button
                                                    key={director.id}
                                                    onClick={() => addDirector(director)}
                                                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-700 transition-colors text-left"
                                                >
                                                    {director.profile_path ? (
                                                        <Image
                                                            src={`https://image.tmdb.org/t/p/w185${director.profile_path}`}
                                                            alt={director.name}
                                                            width={40}
                                                            height={40}
                                                            className="rounded-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">
                                                            <span className="text-gray-400 text-xs">
                                                                N/A
                                                            </span>
                                                        </div>
                                                    )}
                                                    <span className="text-white text-sm">
                                                        {director.name}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-6 border-t border-gray-700 flex items-center justify-between">
                        <button
                            onClick={handleClearAll}
                            disabled={!hasActiveFilters}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                hasActiveFilters
                                    ? 'bg-gray-700 text-white hover:bg-gray-600'
                                    : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                            }`}
                        >
                            Clear Advanced Filters
                        </button>
                        <div className="text-xs text-gray-400 italic">Changes auto-save</div>
                    </div>
                </div>
            </div>
        </div>
    )

    return createPortal(modalContent, document.body)
}

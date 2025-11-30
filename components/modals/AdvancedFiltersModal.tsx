'use client'

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { XMarkIcon, PlusIcon } from '@heroicons/react/24/outline'
import Image from 'next/image'
import { AdvancedFilters } from '../../types/collections'

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
        if (!currentActors.includes(actor.name)) {
            updateFilter('withCast', [...currentActors, actor.name])
        }
        setActorInput('')
        setActorSearchResults([])
        setShowActorInput(false)
    }

    const removeActor = (actorName: string) => {
        const currentActors = localFilters.withCast || []
        updateFilter(
            'withCast',
            currentActors.filter((name) => name !== actorName)
        )
    }

    const setDirector = (director: Person) => {
        updateFilter('withDirector', director.name)
        setDirectorInput('')
        setDirectorSearchResults([])
        setShowDirectorInput(false)
    }

    const removeDirector = () => {
        updateFilter('withDirector', undefined)
    }

    const updateFilter = (key: keyof AdvancedFilters, value: any) => {
        setLocalFilters({
            ...localFilters,
            [key]: value,
        })
    }

    const handleSave = () => {
        onChange(localFilters)
        onClose()
    }

    const handleClearAll = () => {
        setLocalFilters({})
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
                    <div className="flex items-center justify-between p-6 border-b border-zinc-800/50">
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
                                <div>
                                    <label className="text-xs text-gray-400 mb-1.5 block">
                                        From
                                    </label>
                                    <input
                                        type="number"
                                        min="1900"
                                        max={currentYear}
                                        placeholder="1990"
                                        value={localFilters.yearMin || ''}
                                        onChange={(e) =>
                                            updateFilter(
                                                'yearMin',
                                                e.target.value
                                                    ? parseInt(e.target.value)
                                                    : undefined
                                            )
                                        }
                                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-400 mb-1.5 block">To</label>
                                    <input
                                        type="number"
                                        min="1900"
                                        max={currentYear}
                                        placeholder={currentYear.toString()}
                                        value={localFilters.yearMax || ''}
                                        onChange={(e) =>
                                            updateFilter(
                                                'yearMax',
                                                e.target.value
                                                    ? parseInt(e.target.value)
                                                    : undefined
                                            )
                                        }
                                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Rating Range */}
                        <div>
                            <label className="block text-sm font-medium text-gray-200 mb-3">
                                Rating Range
                            </label>
                            <div className="space-y-4">
                                {/* Min Rating */}
                                <div>
                                    <div className="flex justify-between text-xs text-gray-400 mb-2">
                                        <span>Minimum</span>
                                        <span className="text-red-400 font-medium">
                                            {localFilters.ratingMin !== undefined
                                                ? `${localFilters.ratingMin}/10`
                                                : 'Any'}
                                        </span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="10"
                                        step="1"
                                        value={localFilters.ratingMin ?? 0}
                                        onChange={(e) =>
                                            updateFilter(
                                                'ratingMin',
                                                parseInt(e.target.value) || undefined
                                            )
                                        }
                                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-red-600 [&::-webkit-slider-thumb]:cursor-pointer"
                                    />
                                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                                        <span>0</span>
                                        <span>10</span>
                                    </div>
                                </div>

                                {/* Max Rating */}
                                <div>
                                    <div className="flex justify-between text-xs text-gray-400 mb-2">
                                        <span>Maximum</span>
                                        <span className="text-red-400 font-medium">
                                            {localFilters.ratingMax !== undefined
                                                ? `${localFilters.ratingMax}/10`
                                                : 'Any'}
                                        </span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="10"
                                        step="1"
                                        value={localFilters.ratingMax ?? 10}
                                        onChange={(e) =>
                                            updateFilter(
                                                'ratingMax',
                                                parseInt(e.target.value) || undefined
                                            )
                                        }
                                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-red-600 [&::-webkit-slider-thumb]:cursor-pointer"
                                    />
                                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                                        <span>0</span>
                                        <span>10</span>
                                    </div>
                                </div>
                            </div>
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
                            Clear All
                        </button>
                        <button
                            onClick={handleSave}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                        >
                            Done
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )

    return createPortal(modalContent, document.body)
}

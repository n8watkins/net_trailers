'use client'

import React, { useState, useEffect } from 'react'
import {
    ChevronDownIcon,
    ChevronUpIcon,
    SparklesIcon,
    XMarkIcon,
} from '@heroicons/react/24/outline'
import Image from 'next/image'
import { AdvancedFilters } from '../../types/customRows'

interface Person {
    id: number
    name: string
    profile_path: string | null
    known_for_department: string
}

interface AdvancedFiltersSectionProps {
    filters: AdvancedFilters
    onChange: (filters: AdvancedFilters) => void
}

// Popularity scale mapping (user-friendly labels -> TMDB values)
const POPULARITY_SCALE = [
    { label: 'Any', value: 0 },
    { label: 'Low', value: 10 },
    { label: 'Medium', value: 50 },
    { label: 'High', value: 100 },
    { label: 'Very High', value: 200 },
]

// Vote count scale mapping (user-friendly labels -> actual counts)
// Based on research: Starship Troopers (cult classic) has ~5,227 votes
const VOTE_COUNT_SCALE = [
    { label: 'Any', value: 0 },
    { label: 'Few (100+)', value: 100 },
    { label: 'Some (1K+)', value: 1000 },
    { label: 'Many (5K+)', value: 5000 }, // Good for cult classics
    { label: 'Tons (10K+)', value: 10000 },
]

/**
 * AdvancedFiltersSection Component
 *
 * Accordion-style advanced filtering for collections with smooth animations.
 * Features sliders for ratings/popularity, and searchable cast/director cards.
 */
export function AdvancedFiltersSection({ filters, onChange }: AdvancedFiltersSectionProps) {
    const [peopleInput, setPeopleInput] = useState('')
    const [peopleSearchResults, setPeopleSearchResults] = useState<Person[]>([])
    const [selectedPeople, setSelectedPeople] = useState<Person[]>([])
    const [isSearchingPeople, setIsSearchingPeople] = useState(false)
    const [selectedIndex, setSelectedIndex] = useState(0)
    const [showHint, setShowHint] = useState(true)

    const currentYear = new Date().getFullYear()

    // Reset selectedPeople when filters are cleared
    useEffect(() => {
        if (!filters.withCast && !filters.withDirector) {
            setSelectedPeople([])
            setPeopleInput('')
            setPeopleSearchResults([])
        }
    }, [filters.withCast, filters.withDirector])

    // Search for people (actors/directors) using TMDB API
    const searchPeople = async (query: string): Promise<Person[]> => {
        if (query.trim().length < 2) return []

        try {
            const response = await fetch(
                `/api/search?query=${encodeURIComponent(query)}&type=person`
            )
            if (!response.ok) throw new Error('Search failed')
            const data = await response.json()
            return data.results || []
        } catch (error) {
            console.error('Person search error:', error)
            return []
        }
    }

    const updateFilter = (key: keyof AdvancedFilters, value: any) => {
        onChange({
            ...filters,
            [key]: value,
        })
    }

    // Handle people input change with search
    const handlePeopleInputChange = async (value: string) => {
        setPeopleInput(value)
        setShowHint(false)

        // Extract search term (remove @ if present)
        const searchTerm = value.startsWith('@') ? value.slice(1).trim() : value.trim()

        if (searchTerm.length >= 2) {
            setIsSearchingPeople(true)
            const results = await searchPeople(searchTerm)
            setPeopleSearchResults(results)
            setSelectedIndex(0)
            setIsSearchingPeople(false)
        } else {
            setPeopleSearchResults([])
            setSelectedIndex(0)
        }
    }

    // Handle keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (peopleSearchResults.length === 0) return

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault()
                setSelectedIndex((prev) => (prev < peopleSearchResults.length - 1 ? prev + 1 : prev))
                break
            case 'ArrowUp':
                e.preventDefault()
                setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0))
                break
            case 'Enter':
                e.preventDefault()
                if (peopleSearchResults[selectedIndex]) {
                    addPerson(peopleSearchResults[selectedIndex])
                }
                break
            case 'Escape':
                e.preventDefault()
                setPeopleSearchResults([])
                setSelectedIndex(0)
                break
        }
    }

    // Add person (actor or director)
    const addPerson = (person: Person) => {
        if (selectedPeople.find(p => p.id === person.id)) return
        const newPeople = [...selectedPeople, person]
        setSelectedPeople(newPeople)

        // Separate actors and directors
        const actors = newPeople.filter(p => p.known_for_department === 'Acting')
        const directors = newPeople.filter(p => p.known_for_department === 'Directing')

        updateFilter('withCast', actors.length > 0 ? actors.map(p => p.name) : undefined)
        updateFilter('withDirector', directors.length > 0 ? directors[0].name : undefined)

        setPeopleInput('')
        setPeopleSearchResults([])
    }

    // Remove person
    const removePerson = (personId: number) => {
        const newPeople = selectedPeople.filter(p => p.id !== personId)
        setSelectedPeople(newPeople)

        // Separate actors and directors
        const actors = newPeople.filter(p => p.known_for_department === 'Acting')
        const directors = newPeople.filter(p => p.known_for_department === 'Directing')

        updateFilter('withCast', actors.length > 0 ? actors.map(p => p.name) : undefined)
        updateFilter('withDirector', directors.length > 0 ? directors[0].name : undefined)
    }

    return (
        <div className="space-y-6">
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
                                        value={filters.yearMin || ''}
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
                                        value={filters.yearMax || ''}
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

                        {/* Rating Range (Sliders) */}
                        <div>
                            <label className="block text-sm font-medium text-gray-200 mb-3">
                                Rating Range
                            </label>
                            <div className="space-y-4">
                                {/* Min Rating Slider */}
                                <div>
                                    <div className="flex justify-between text-xs text-gray-400 mb-2">
                                        <span>Minimum</span>
                                        <span className="text-red-400 font-medium">
                                            {filters.ratingMin !== undefined
                                                ? `${filters.ratingMin}/10`
                                                : 'Any'}
                                        </span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="10"
                                        step="1"
                                        value={filters.ratingMin ?? 0}
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

                                {/* Max Rating Slider */}
                                <div>
                                    <div className="flex justify-between text-xs text-gray-400 mb-2">
                                        <span>Maximum</span>
                                        <span className="text-red-400 font-medium">
                                            {filters.ratingMax !== undefined
                                                ? `${filters.ratingMax}/10`
                                                : 'Any'}
                                        </span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="10"
                                        step="1"
                                        value={filters.ratingMax ?? 10}
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
                                <p className="text-xs text-gray-500 mt-2">
                                    💡 Tip: 2-5 rating for "so bad they're good" movies
                                </p>
                            </div>
                        </div>

                        {/* Cast & Crew Filter with Cards */}
                        <div>
                            <label className="block text-sm font-medium text-gray-200 mb-2">
                                Cast & Crew
                            </label>
                            {showHint && (
                                <p className="text-xs text-gray-400 mb-2 flex items-center gap-1">
                                    💡 Type <code className="px-1 py-0.5 bg-gray-700 rounded text-blue-400">@</code> to tag actors or directors
                                </p>
                            )}
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Type @ to search for people..."
                                    value={peopleInput}
                                    onChange={(e) => handlePeopleInputChange(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                                />

                                {/* Search Results Dropdown */}
                                {peopleSearchResults.length > 0 && (
                                    <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden">
                                        <div className="max-h-64 overflow-y-auto">
                                            {peopleSearchResults.slice(0, 5).map((person, index) => (
                                                <button
                                                    key={person.id}
                                                    type="button"
                                                    onClick={() => addPerson(person)}
                                                    className={`w-full flex items-center gap-3 p-3 transition-colors text-left ${
                                                        index === selectedIndex
                                                            ? 'bg-red-600/20 border-l-2 border-red-500'
                                                            : 'hover:bg-gray-700'
                                                    }`}
                                                >
                                                    <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-700 flex-shrink-0">
                                                        {person.profile_path ? (
                                                            <Image
                                                                src={`https://image.tmdb.org/t/p/w185${person.profile_path}`}
                                                                alt={person.name}
                                                                width={40}
                                                                height={40}
                                                                className="object-cover"
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">
                                                                ?
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-white font-medium truncate">{person.name}</p>
                                                        <p className="text-xs text-gray-400">{person.known_for_department}</p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                        {/* Keyboard Shortcuts Hint */}
                                        <div className="px-3 py-2 bg-gray-900 border-t border-gray-700 flex items-center justify-between text-xs text-gray-400">
                                            <span>↑↓ Navigate</span>
                                            <span>Enter Select</span>
                                            <span>Esc Close</span>
                                        </div>
                                    </div>
                                )}

                                {isSearchingPeople && (
                                    <div className="absolute right-3 top-2.5">
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-600"></div>
                                    </div>
                                )}
                            </div>

                            {/* Selected People Cards */}
                            {selectedPeople.length > 0 && (
                                <div className="grid grid-cols-2 gap-2 mt-3">
                                    {selectedPeople.map((person) => (
                                        <div
                                            key={person.id}
                                            className="relative bg-gray-800/50 border border-gray-700 rounded-lg p-2 flex items-center gap-2 group"
                                        >
                                            <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-700 flex-shrink-0">
                                                {person.profile_path ? (
                                                    <Image
                                                        src={`https://image.tmdb.org/t/p/w185${person.profile_path}`}
                                                        alt={person.name}
                                                        width={48}
                                                        height={48}
                                                        className="object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-500">
                                                        ?
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-white text-sm font-medium truncate">{person.name}</p>
                                                <p className={`text-xs ${person.known_for_department === 'Acting' ? 'text-blue-400' : 'text-purple-400'}`}>
                                                    {person.known_for_department === 'Acting' ? 'Actor' : 'Director'}
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removePerson(person.id)}
                                                className="absolute top-1 right-1 p-1 bg-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <XMarkIcon className="w-3 h-3 text-white" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

        </div>
    )
}

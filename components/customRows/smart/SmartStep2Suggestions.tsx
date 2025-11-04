'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import { PlusIcon, XMarkIcon, SparklesIcon } from '@heroicons/react/24/solid'
import type { Entity } from './SmartInput'

interface SmartStep2SuggestionsProps {
    inputData: {
        entities: Entity[]
        rawText: string
    }
    onBack: () => void
    onContinue: (data: {
        selectedSuggestions: any[]
        selectedRowName: string
        mediaType: 'movie' | 'tv' | 'both'
    }) => void
}

// TMDB Genre mapping
const GENRE_MAP: Record<number, string> = {
    28: 'Action',
    12: 'Adventure',
    16: 'Animation',
    35: 'Comedy',
    80: 'Crime',
    99: 'Documentary',
    18: 'Drama',
    10751: 'Family',
    14: 'Fantasy',
    36: 'History',
    27: 'Horror',
    10402: 'Music',
    9648: 'Mystery',
    10749: 'Romance',
    878: 'Science Fiction',
    53: 'Thriller',
    10752: 'War',
    37: 'Western',
    10759: 'Action & Adventure',
    10762: 'Kids',
    10763: 'News',
    10764: 'Reality',
    10765: 'Sci-Fi & Fantasy',
    10766: 'Soap',
    10767: 'Talk',
    10768: 'War & Politics',
}

/**
 * SmartStep2Suggestions - Configure filters before preview
 */
export function SmartStep2Suggestions({
    inputData,
    onBack,
    onContinue,
}: SmartStep2SuggestionsProps) {
    const [rowName, setRowName] = useState('')
    const [genreIds, setGenreIds] = useState<number[]>([])
    const [mediaType, setMediaType] = useState<'movie' | 'tv' | 'both'>('both')
    const [people, setPeople] = useState<
        Array<{
            id: number
            name: string
            type: 'actor' | 'director'
            required: boolean
            image?: string
        }>
    >([])
    const [isLoading, setIsLoading] = useState(true)
    const [isRefreshingName, setIsRefreshingName] = useState(false)
    const [showGenreModal, setShowGenreModal] = useState(false)
    const [nameSeed, setNameSeed] = useState(0)

    useEffect(() => {
        loadInitialData()
    }, [])

    const loadInitialData = async () => {
        setIsLoading(true)
        try {
            // Call Gemini to analyze and get genre IDs
            const response = await fetch('/api/smart-suggestions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...inputData, seed: 0 }),
            })

            if (!response.ok) throw new Error('Failed to generate suggestions')

            const data = await response.json()

            // Extract genre IDs from suggestions
            const genreSuggestion = data.suggestions?.find((s: any) => s.type === 'genre')
            const ids = genreSuggestion?.value || []

            // Extract tagged people from entities
            const taggedPeople = inputData.entities
                .filter((e) => e.type === 'person')
                .map((e) => ({
                    id: e.id as number,
                    name: e.name,
                    type: (e.subtitle?.toLowerCase().includes('direct') ? 'director' : 'actor') as
                        | 'actor'
                        | 'director',
                    required: false, // Default to optional (OR logic) - Gemini will decide if they should be required
                    image: e.image, // TMDB profile image path
                }))

            setRowName(data.rowNames?.[0] || 'My Custom Row')
            setGenreIds(ids)
            setPeople(taggedPeople)
            setMediaType(data.mediaType || 'both')
        } catch (error) {
            console.error('Load error:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const refreshName = async () => {
        setIsRefreshingName(true)
        const newSeed = nameSeed + 1
        setNameSeed(newSeed)

        try {
            const response = await fetch('/api/smart-suggestions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...inputData, seed: newSeed }),
            })

            if (!response.ok) throw new Error('Failed to generate name')

            const data = await response.json()
            setRowName(data.rowNames?.[0] || rowName)
        } catch (error) {
            console.error('Name refresh error:', error)
        } finally {
            setIsRefreshingName(false)
        }
    }

    const addGenre = (genreId: number) => {
        if (!genreIds.includes(genreId)) {
            setGenreIds([...genreIds, genreId])
        }
        setShowGenreModal(false)
    }

    const removeGenre = (genreId: number) => {
        setGenreIds(genreIds.filter((id) => id !== genreId))
    }

    const togglePersonRequired = (personId: number) => {
        setPeople(people.map((p) => (p.id === personId ? { ...p, required: !p.required } : p)))
    }

    const removePerson = (personId: number) => {
        setPeople(people.filter((p) => p.id !== personId))
    }

    const handleContinue = () => {
        const suggestions: any[] = []

        // Add genres
        if (genreIds.length > 0) {
            suggestions.push({ type: 'genre', value: genreIds, confidence: 95 })
        }

        // Add people (directors/actors)
        const requiredPeople = people.filter((p) => p.required)
        const optionalPeople = people.filter((p) => p.required === false)

        if (requiredPeople.length > 0) {
            // Group by type
            const directors = requiredPeople.filter((p) => p.type === 'director').map((p) => p.id)
            const actors = requiredPeople.filter((p) => p.type === 'actor').map((p) => p.id)

            if (directors.length > 0) {
                suggestions.push({
                    type: 'director',
                    value: directors,
                    confidence: 100,
                    required: true,
                })
            }

            if (actors.length > 0) {
                suggestions.push({
                    type: 'actor',
                    value: actors,
                    confidence: 100,
                    required: true,
                })
            }
        }

        if (optionalPeople.length > 0) {
            const directors = optionalPeople.filter((p) => p.type === 'director').map((p) => p.id)
            const actors = optionalPeople.filter((p) => p.type === 'actor').map((p) => p.id)

            if (directors.length > 0) {
                suggestions.push({
                    type: 'director',
                    value: directors,
                    confidence: 80,
                    required: false,
                })
            }

            if (actors.length > 0) {
                suggestions.push({
                    type: 'actor',
                    value: actors,
                    confidence: 80,
                    required: false,
                })
            }
        }

        onContinue({
            selectedSuggestions: suggestions,
            selectedRowName: rowName,
            mediaType,
        })
    }

    if (isLoading) {
        const loadingMessages = [
            { emoji: '🤖', text: 'Consulting the AI overlords...', sub: 'They know what you like' },
            {
                emoji: '🎬',
                text: 'Analyzing cinematic masterpieces...',
                sub: 'From Spielberg to Scorsese',
            },
            {
                emoji: '🔮',
                text: 'Predicting your next binge...',
                sub: 'Crystal ball not included',
            },
            { emoji: '🧠', text: 'Teaching robots to love movies...', sub: 'Beep boop... ACTION!' },
            { emoji: '✨', text: 'Sprinkling AI magic dust...', sub: 'This is how rows are born' },
            { emoji: '🎭', text: 'Curating peak cinema...', sub: 'No film bros were harmed' },
        ]
        const randomMessage = loadingMessages[Math.floor(Math.random() * loadingMessages.length)]

        return (
            <div className="flex flex-col items-center justify-center py-20">
                {/* Netflix-style animated logo */}
                <div className="relative mb-8">
                    <div className="text-9xl animate-pulse">{randomMessage.emoji}</div>
                    <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
                        <div className="flex gap-1">
                            <div
                                className="w-2 h-2 bg-red-600 rounded-full animate-bounce"
                                style={{ animationDelay: '0ms' }}
                            ></div>
                            <div
                                className="w-2 h-2 bg-red-600 rounded-full animate-bounce"
                                style={{ animationDelay: '150ms' }}
                            ></div>
                            <div
                                className="w-2 h-2 bg-red-600 rounded-full animate-bounce"
                                style={{ animationDelay: '300ms' }}
                            ></div>
                        </div>
                    </div>
                </div>

                {/* Geeky loading text */}
                <p className="text-white text-2xl font-bold mb-2 animate-pulse">
                    {randomMessage.text}
                </p>
                <p className="text-gray-400 text-sm italic">{randomMessage.sub}</p>
                <p className="text-gray-500 text-xs mt-4">// Building your perfect row...</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header with Title and AI Rename */}
            <div className="space-y-4">
                <div className="flex items-center justify-center gap-3">
                    <h2 className="text-3xl font-bold text-white text-center">{rowName}</h2>
                    <button
                        onClick={refreshName}
                        disabled={isRefreshingName}
                        className="p-2 bg-gray-700 text-gray-200 rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Generate new name"
                    >
                        <SparklesIcon
                            className={`w-5 h-5 ${isRefreshingName ? 'animate-spin' : ''}`}
                        />
                    </button>
                </div>

                {/* Editable Filters */}
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 space-y-4">
                    {/* Media Type Selector */}
                    <div>
                        <label className="block text-sm font-medium text-gray-200 mb-2">
                            Media Type:
                        </label>
                        <div className="flex gap-2">
                            {(['movie', 'tv', 'both'] as const).map((type) => (
                                <button
                                    key={type}
                                    onClick={() => setMediaType(type)}
                                    className={`px-4 py-2 rounded-lg transition-colors ${
                                        mediaType === type
                                            ? 'bg-red-600 text-white'
                                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                    }`}
                                >
                                    {type === 'movie'
                                        ? '🎬 Movies'
                                        : type === 'tv'
                                          ? '📺 TV Shows'
                                          : '🎭 Both'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* People (Directors/Actors) */}
                    {people.length > 0 && (
                        <div>
                            <label className="block text-sm font-medium text-gray-200 mb-2">
                                Directors & Actors:
                            </label>
                            <div className="space-y-2">
                                {people.map((person) => (
                                    <div
                                        key={person.id}
                                        className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg hover:bg-gray-700/70 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            {/* Profile Image */}
                                            {person.image ? (
                                                <div className="relative w-12 h-12 rounded-full overflow-hidden bg-gray-800 flex-shrink-0">
                                                    <Image
                                                        src={`https://image.tmdb.org/t/p/w185${person.image}`}
                                                        alt={person.name}
                                                        fill
                                                        className="object-cover"
                                                    />
                                                </div>
                                            ) : (
                                                <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center flex-shrink-0">
                                                    <span className="text-gray-500 text-xl">
                                                        {person.name.charAt(0).toUpperCase()}
                                                    </span>
                                                </div>
                                            )}

                                            {/* Name and Type */}
                                            <div>
                                                <span className="text-white font-medium block">
                                                    {person.name}
                                                </span>
                                                <span className="text-xs text-gray-400">
                                                    {person.type === 'director'
                                                        ? '🎬 Director'
                                                        : '🎭 Actor'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-2">
                                            {/* Improved Required/Optional Toggle */}
                                            <button
                                                onClick={() => togglePersonRequired(person.id)}
                                                className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                                                    person.required
                                                        ? 'bg-red-600 text-white hover:bg-red-700 shadow-md'
                                                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600'
                                                }`}
                                                title={
                                                    person.required
                                                        ? 'Must be in ALL results (AND logic)'
                                                        : 'Can be in ANY results (OR logic)'
                                                }
                                            >
                                                {person.required ? '✓ Must Include' : '~ Suggested'}
                                            </button>
                                            <button
                                                onClick={() => removePerson(person.id)}
                                                className="text-gray-400 hover:text-red-400 transition-colors p-1"
                                            >
                                                <XMarkIcon className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                                💡 Tip: <strong>Must Include</strong> = content MUST feature this
                                person (AND), <strong>Suggested</strong> = include similar
                                actors/directors (OR)
                            </p>
                        </div>
                    )}

                    {/* Genre Bubbles */}
                    <div>
                        <label className="block text-sm font-medium text-gray-200 mb-2">
                            Genres:
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {genreIds.map((id) => (
                                <span
                                    key={id}
                                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-600/20 text-red-400 rounded-full border border-red-600/50"
                                >
                                    {GENRE_MAP[id] || `Genre ${id}`}
                                    <button
                                        onClick={() => removeGenre(id)}
                                        className="hover:text-red-300 transition-colors"
                                    >
                                        <XMarkIcon className="w-4 h-4" />
                                    </button>
                                </span>
                            ))}
                            <button
                                onClick={() => setShowGenreModal(true)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-700 text-gray-300 rounded-full hover:bg-gray-600 transition-colors"
                            >
                                <PlusIcon className="w-4 h-4" />
                                Add Genre
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <div className="flex gap-3 pt-4">
                <button
                    onClick={onBack}
                    className="px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
                >
                    ← Back
                </button>
                <button
                    onClick={handleContinue}
                    className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold text-lg"
                >
                    Preview Row →
                </button>
            </div>

            {/* Genre Selection Modal */}
            {showGenreModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-900 rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-white">Add Genre</h3>
                            <button
                                onClick={() => setShowGenreModal(false)}
                                className="text-gray-400 hover:text-white"
                            >
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {Object.entries(GENRE_MAP)
                                .filter(([id]) => !genreIds.includes(Number(id)))
                                .map(([id, name]) => (
                                    <button
                                        key={id}
                                        onClick={() => addGenre(Number(id))}
                                        className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-red-600 hover:text-white transition-colors text-sm"
                                    >
                                        {name}
                                    </button>
                                ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

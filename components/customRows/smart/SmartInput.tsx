'use client'

import React, { useState, useRef, useEffect, useMemo } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { debounce } from 'lodash'

// Entity types that can be tagged
export interface Entity {
    id: number | string
    type: 'genre' | 'person' | 'movie' | 'tv' | 'company'
    name: string
    subtitle?: string // "Director", "Actor", "Movie • 2010"
    image?: string // TMDB image path
    metadata?: {
        popularity?: number
        knownFor?: string[]
        rating?: number
        originCountry?: string
    }
}

interface SmartInputProps {
    onEntitiesChange: (entities: Entity[]) => void
    onTextChange: (text: string) => void
    placeholder?: string
    className?: string
}

/**
 * SmartInput - Intelligent autocomplete input for tagging entities
 *
 * Features:
 * - Real-time search across genres, people, movies, TV, companies
 * - Keyboard navigation (↑/↓/Enter/Esc)
 * - Entity tagging with visual chips
 * - Debounced search (300ms)
 * - Image support for people/movies/companies
 */
export function SmartInput({
    onEntitiesChange,
    onTextChange,
    placeholder = 'Describe your row: genres, actors, directors, movies, studios...',
    className = '',
}: SmartInputProps) {
    const [rawText, setRawText] = useState('')
    const [cursorPos, setCursorPos] = useState(0)
    const [currentWord, setCurrentWord] = useState('')
    const [suggestions, setSuggestions] = useState<Entity[]>([])
    const [selectedIndex, setSelectedIndex] = useState(0)
    const [taggedEntities, setTaggedEntities] = useState<Entity[]>([])
    const [showDropdown, setShowDropdown] = useState(false)
    const [isSearching, setIsSearching] = useState(false)
    const inputRef = useRef<HTMLTextAreaElement>(null)

    // Extract phrase at cursor position (supports multi-word like "christopher nolan")
    useEffect(() => {
        const textBeforeCursor = rawText.slice(0, cursorPos)

        // Find the last phrase after @ or after a sentence boundary (., !, ?)
        // This allows multi-word searches like "christopher nolan"
        const lastAtIndex = textBeforeCursor.lastIndexOf('@')
        const lastPuncIndex = Math.max(
            textBeforeCursor.lastIndexOf('.'),
            textBeforeCursor.lastIndexOf('!'),
            textBeforeCursor.lastIndexOf('?'),
            textBeforeCursor.lastIndexOf(',')
        )

        // Start from either @ symbol or after last punctuation
        const startIndex = Math.max(lastAtIndex + 1, lastPuncIndex + 1, 0)
        const phrase = textBeforeCursor.slice(startIndex).trim()

        if (phrase.length >= 2 && !phrase.startsWith('@')) {
            setCurrentWord(phrase)
            debouncedSearch(phrase)
        } else {
            setShowDropdown(false)
            setSuggestions([])
            setCurrentWord('')
        }
    }, [rawText, cursorPos])

    // Debounced search function
    const debouncedSearch = useMemo(
        () =>
            debounce(async (query: string) => {
                setIsSearching(true)
                try {
                    const results = await searchAll(query)
                    setSuggestions(results)
                    setShowDropdown(results.length > 0)
                    setSelectedIndex(0)
                } catch (error) {
                    console.error('Search error:', error)
                    setSuggestions([])
                    setShowDropdown(false)
                } finally {
                    setIsSearching(false)
                }
            }, 300),
        []
    )

    // Unified search across all entity types
    const searchAll = async (query: string): Promise<Entity[]> => {
        try {
            const response = await fetch(`/api/smart-search?q=${encodeURIComponent(query)}`)
            if (!response.ok) throw new Error('Search failed')

            const data = await response.json()
            return data.results || []
        } catch (error) {
            console.error('Search API error:', error)
            return []
        }
    }

    // Handle entity selection
    const selectEntity = (entity: Entity) => {
        // Replace current word with entity tag
        const beforeWord = rawText.slice(0, cursorPos - currentWord.length)
        const afterWord = rawText.slice(cursorPos)
        const newText = `${beforeWord}@${entity.name} ${afterWord}`

        setRawText(newText)
        const newEntities = [...taggedEntities, entity]
        setTaggedEntities(newEntities)
        onEntitiesChange(newEntities)
        onTextChange(newText)
        setShowDropdown(false)

        // Focus back to input
        setTimeout(() => {
            inputRef.current?.focus()
            const newCursorPos = beforeWord.length + entity.name.length + 2 // +2 for @ and space
            inputRef.current?.setSelectionRange(newCursorPos, newCursorPos)
        }, 0)
    }

    // Remove entity
    const removeEntity = (entityId: number | string) => {
        const updated = taggedEntities.filter((e) => e.id !== entityId)
        setTaggedEntities(updated)
        onEntitiesChange(updated)

        // Remove from text as well
        const entity = taggedEntities.find((e) => e.id === entityId)
        if (entity) {
            const updatedText = rawText.replace(`@${entity.name}`, '')
            setRawText(updatedText)
            onTextChange(updatedText)
        }
    }

    // Keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!showDropdown) return

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault()
                setSelectedIndex((prev) => (prev + 1) % suggestions.length)
                break
            case 'ArrowUp':
                e.preventDefault()
                setSelectedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length)
                break
            case 'Enter':
                e.preventDefault()
                if (suggestions[selectedIndex]) {
                    selectEntity(suggestions[selectedIndex])
                }
                break
            case 'Escape':
                setShowDropdown(false)
                break
        }
    }

    return (
        <div className={`space-y-4 ${className}`}>
            {/* Main Input */}
            <div className="relative">
                <textarea
                    ref={inputRef}
                    value={rawText}
                    onChange={(e) => {
                        setRawText(e.target.value)
                        onTextChange(e.target.value)
                    }}
                    onKeyUp={(e) => setCursorPos(e.currentTarget.selectionStart)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    className="w-full min-h-[120px] p-4 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 resize-none"
                    rows={4}
                />

                {/* Search indicator */}
                {isSearching && (
                    <div className="absolute top-4 right-4">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                    </div>
                )}

                {/* Autocomplete Dropdown */}
                {showDropdown && suggestions.length > 0 && (
                    <div className="absolute z-50 w-full mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-2xl max-h-80 overflow-y-auto">
                        {suggestions.map((entity, index) => (
                            <SuggestionItem
                                key={`${entity.type}-${entity.id}`}
                                entity={entity}
                                isSelected={index === selectedIndex}
                                onClick={() => selectEntity(entity)}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Tagged Entities Display */}
            {taggedEntities.length > 0 && (
                <div className="space-y-2">
                    <p className="text-gray-400 text-sm font-medium">Tagged Entities:</p>
                    <div className="flex flex-wrap gap-2">
                        {taggedEntities.map((entity) => (
                            <EntityChip
                                key={`${entity.type}-${entity.id}`}
                                entity={entity}
                                onRemove={() => removeEntity(entity.id)}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

/**
 * SuggestionItem - Individual dropdown item
 */
interface SuggestionItemProps {
    entity: Entity
    isSelected: boolean
    onClick: () => void
}

function SuggestionItem({ entity, isSelected, onClick }: SuggestionItemProps) {
    const getIcon = () => {
        switch (entity.type) {
            case 'genre':
                return '🎭'
            case 'person':
                return '👤'
            case 'movie':
                return '🎬'
            case 'tv':
                return '📺'
            case 'company':
                return '🏢'
        }
    }

    const getImage = () => {
        if (!entity.image) return null
        const baseUrl = 'https://image.tmdb.org/t/p/'
        const size = 'w92'
        return `${baseUrl}${size}${entity.image}`
    }

    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center gap-3 p-3 transition-colors ${
                isSelected ? 'bg-red-600' : 'hover:bg-gray-700'
            }`}
        >
            {/* Image or Icon */}
            {entity.image ? (
                <img
                    src={getImage()!}
                    alt={entity.name}
                    className={`${
                        entity.type === 'person' ? 'rounded-full' : 'rounded'
                    } w-10 h-10 object-cover flex-shrink-0`}
                />
            ) : (
                <div className="w-10 h-10 flex items-center justify-center bg-gray-700 rounded-full text-xl flex-shrink-0">
                    {getIcon()}
                </div>
            )}

            {/* Text Info */}
            <div className="flex-1 text-left min-w-0">
                <div className="text-white font-medium truncate">{entity.name}</div>
                {entity.subtitle && (
                    <div className="text-gray-400 text-sm truncate">{entity.subtitle}</div>
                )}
            </div>

            {/* Type Badge */}
            <span className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded capitalize flex-shrink-0">
                {entity.type}
            </span>
        </button>
    )
}

/**
 * EntityChip - Tagged entity display chip
 */
interface EntityChipProps {
    entity: Entity
    onRemove: () => void
}

function EntityChip({ entity, onRemove }: EntityChipProps) {
    const getIcon = () => {
        switch (entity.type) {
            case 'genre':
                return '🎭'
            case 'person':
                return '👤'
            case 'movie':
                return '🎬'
            case 'tv':
                return '📺'
            case 'company':
                return '🏢'
        }
    }

    return (
        <div className="inline-flex items-center gap-2 px-3 py-2 bg-red-600/20 border border-red-500/30 rounded-lg">
            <span className="text-lg">{getIcon()}</span>
            <div className="flex flex-col">
                <span className="text-white text-sm font-medium">{entity.name}</span>
                {entity.subtitle && (
                    <span className="text-gray-400 text-xs">{entity.subtitle}</span>
                )}
            </div>
            <button
                onClick={onRemove}
                className="ml-2 text-gray-400 hover:text-white transition-colors"
            >
                <XMarkIcon className="w-4 h-4" />
            </button>
        </div>
    )
}

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
    const [triggerChar, setTriggerChar] = useState<string>('')
    const inputRef = useRef<HTMLTextAreaElement>(null)

    // Extract phrase after trigger character (@ for people, : for content)
    // Everything else will be analyzed by Gemini for semantic understanding
    useEffect(() => {
        const textBeforeCursor = rawText.slice(0, cursorPos)

        // Look for trigger characters: @ (people), : (movies/TV)
        const triggers = ['@', ':']
        let triggerIndex = -1
        let foundTrigger = ''

        // Find the most recent trigger character
        for (const trigger of triggers) {
            const index = textBeforeCursor.lastIndexOf(trigger)
            if (index > triggerIndex) {
                triggerIndex = index
                foundTrigger = trigger
            }
        }

        // If no trigger found or trigger too far back, hide dropdown
        if (triggerIndex === -1 || cursorPos - triggerIndex > 50) {
            setShowDropdown(false)
            setSuggestions([])
            setCurrentWord('')
            setTriggerChar('')
            return
        }

        // Extract the query after the trigger
        const query = textBeforeCursor.slice(triggerIndex + 1).trim()

        // Only search if we have 2+ characters after trigger
        if (query.length >= 2) {
            setCurrentWord(query)
            setTriggerChar(foundTrigger)
            debouncedSearch(query)
        } else if (query.length === 0 && foundTrigger) {
            // Just typed trigger, show empty state or instructions
            setCurrentWord('')
            setTriggerChar(foundTrigger)
            setShowDropdown(false)
        } else {
            setShowDropdown(false)
            setSuggestions([])
        }
    }, [rawText, cursorPos])

    // Debounced search function with trigger-based filtering
    const debouncedSearch = useMemo(
        () =>
            debounce(async (query: string) => {
                setIsSearching(true)
                try {
                    const results = await searchAll(query)

                    // Filter by trigger character
                    const filtered = results.filter((entity) => {
                        switch (triggerChar) {
                            case '@':
                                return entity.type === 'person'
                            case ':':
                                return entity.type === 'movie' || entity.type === 'tv'
                            default:
                                return true
                        }
                    })

                    setSuggestions(filtered)
                    setShowDropdown(filtered.length > 0)
                    setSelectedIndex(0)
                } catch (error) {
                    console.error('Search error:', error)
                    setSuggestions([])
                    setShowDropdown(false)
                } finally {
                    setIsSearching(false)
                }
            }, 300),
        [triggerChar]
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
        // Find the trigger character position
        const textBeforeCursor = rawText.slice(0, cursorPos)
        const triggerIndex = Math.max(
            textBeforeCursor.lastIndexOf('@'),
            textBeforeCursor.lastIndexOf('#'),
            textBeforeCursor.lastIndexOf('&'),
            textBeforeCursor.lastIndexOf('!')
        )

        if (triggerIndex === -1) return

        // Replace from trigger to cursor with trigger + entity name
        const beforeTrigger = rawText.slice(0, triggerIndex)
        const afterCursor = rawText.slice(cursorPos)
        const newText = `${beforeTrigger}${triggerChar}${entity.name} ${afterCursor}`

        setRawText(newText)
        const newEntities = [...taggedEntities, { ...entity, triggerChar }]
        setTaggedEntities(newEntities)
        onEntitiesChange(newEntities)
        onTextChange(newText)
        setShowDropdown(false)

        // Focus back to input
        setTimeout(() => {
            inputRef.current?.focus()
            const newCursorPos = beforeTrigger.length + triggerChar.length + entity.name.length + 1
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

                {/* Autocomplete Dropdown - Compact */}
                {showDropdown && suggestions.length > 0 && (
                    <div className="absolute z-50 left-0 mt-1 bg-gray-800 border border-gray-700 rounded-md shadow-xl max-h-48 overflow-y-auto min-w-[280px] max-w-[400px]">
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

    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center gap-2 px-3 py-2 transition-colors text-sm ${
                isSelected ? 'bg-red-600 text-white' : 'hover:bg-gray-700 text-gray-200'
            }`}
        >
            {/* Icon Only */}
            <span className="text-base flex-shrink-0">{getIcon()}</span>

            {/* Name */}
            <span className="flex-1 text-left truncate font-medium">{entity.name}</span>

            {/* Subtitle (if exists) */}
            {entity.subtitle && (
                <span className="text-xs text-gray-400 truncate max-w-[100px]">
                    {entity.subtitle}
                </span>
            )}
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

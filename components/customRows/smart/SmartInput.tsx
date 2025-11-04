'use client'

import React, { useState, useRef, useEffect, useMemo } from 'react'
import Image from 'next/image'
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

        // Check if this query is already a tagged entity (prevent re-tagging)
        const isAlreadyTagged = taggedEntities.some(
            (entity) => entity.name.toLowerCase() === query.toLowerCase()
        )

        if (isAlreadyTagged) {
            setShowDropdown(false)
            setSuggestions([])
            setCurrentWord('')
            return
        }

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
    }, [rawText, cursorPos, taggedEntities])

    // Debounced search function with trigger-based filtering
    const debouncedSearch = useMemo(
        () =>
            debounce(async (query: string) => {
                setIsSearching(true)
                try {
                    const results = await searchAll(query)

                    // Filter by trigger character and exclude already-tagged entities
                    const filtered = results.filter((entity) => {
                        // Check if already tagged
                        const isTagged = taggedEntities.some(
                            (e) => e.id === entity.id && e.type === entity.type
                        )
                        if (isTagged) return false

                        // Filter by trigger
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
        [triggerChar, taggedEntities]
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
        // Check for duplicates
        const isDuplicate = taggedEntities.some((e) => e.id === entity.id && e.type === entity.type)
        if (isDuplicate) {
            setShowDropdown(false)
            return
        }

        // Find the trigger character position
        const textBeforeCursor = rawText.slice(0, cursorPos)
        const triggerIndex = Math.max(
            textBeforeCursor.lastIndexOf('@'),
            textBeforeCursor.lastIndexOf(':')
        )

        if (triggerIndex === -1) return

        // Replace from trigger to cursor with just entity name (no trigger char in display)
        const beforeTrigger = rawText.slice(0, triggerIndex)
        const afterCursor = rawText.slice(cursorPos)
        const newText = `${beforeTrigger}${entity.name} ${afterCursor}`

        setRawText(newText)
        const newEntities = [...taggedEntities, { ...entity, triggerChar }]
        setTaggedEntities(newEntities)
        onEntitiesChange(newEntities)
        onTextChange(newText)
        setShowDropdown(false)
        setSuggestions([])
        setCurrentWord('')

        // Focus back to input
        setTimeout(() => {
            inputRef.current?.focus()
            const newCursorPos = beforeTrigger.length + entity.name.length + 1
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

    // Render text with highlighted entities
    const renderHighlightedText = () => {
        if (!rawText) return null

        const parts: React.ReactNode[] = []
        let lastIndex = 0

        // Find all tagged entity names in the text
        taggedEntities.forEach((entity, idx) => {
            const entityIndex = rawText.indexOf(entity.name, lastIndex)
            if (entityIndex !== -1) {
                // Add text before entity
                if (entityIndex > lastIndex) {
                    parts.push(
                        <span key={`text-${idx}`}>{rawText.slice(lastIndex, entityIndex)}</span>
                    )
                }
                // Add highlighted entity
                parts.push(
                    <span key={`entity-${idx}`} className="text-blue-400 font-medium">
                        {entity.name}
                    </span>
                )
                lastIndex = entityIndex + entity.name.length
            }
        })

        // Add remaining text
        if (lastIndex < rawText.length) {
            parts.push(<span key="text-end">{rawText.slice(lastIndex)}</span>)
        }

        return parts
    }

    return (
        <div className={`space-y-4 ${className}`}>
            {/* Main Input */}
            <div className="relative">
                {/* Overlay for highlighting tagged entities */}
                {taggedEntities.length > 0 && (
                    <div className="pointer-events-none absolute inset-0 p-4 text-white whitespace-pre-wrap break-words font-mono text-sm leading-6 overflow-hidden z-20">
                        {renderHighlightedText()}
                    </div>
                )}

                <textarea
                    ref={inputRef}
                    value={rawText}
                    onChange={(e) => {
                        setRawText(e.target.value)
                        onTextChange(e.target.value)
                    }}
                    onKeyUp={(e) => setCursorPos(e.currentTarget.selectionStart)}
                    onKeyDown={handleKeyDown}
                    onClick={(e) => setCursorPos(e.currentTarget.selectionStart)}
                    placeholder={placeholder}
                    className="w-full min-h-[120px] p-4 bg-gray-800 border border-gray-700 rounded-lg placeholder-gray-500 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 resize-none font-mono text-sm leading-6 relative z-10"
                    style={{
                        backgroundColor: 'rgb(31 41 55)',
                        caretColor: 'white',
                        color: taggedEntities.length > 0 ? 'transparent' : 'white',
                    }}
                    rows={4}
                    spellCheck={false}
                />

                {/* Search indicator */}
                {isSearching && (
                    <div className="absolute top-4 right-4 z-20">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                    </div>
                )}

                {/* Autocomplete Dropdown - Compact */}
                {showDropdown && suggestions.length > 0 && (
                    <div className="absolute z-50 left-0 mt-1 bg-[#1a1a1a] border border-gray-600 rounded-md shadow-xl max-h-48 overflow-y-auto min-w-[280px] max-w-[400px] scrollbar-thin scrollbar-track-gray-800 scrollbar-thumb-red-600">
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
            className={`w-full flex items-center gap-3 px-3 py-2.5 transition-colors text-sm ${
                isSelected ? 'bg-red-600 text-white' : 'hover:bg-gray-700/50 text-white'
            }`}
        >
            {/* Image/Icon */}
            {entity.type === 'person' && entity.image ? (
                <div className="flex-shrink-0 w-8 h-8 rounded-full overflow-hidden bg-gray-700 ring-2 ring-gray-600">
                    <Image
                        src={`https://image.tmdb.org/t/p/w92${entity.image}`}
                        alt={entity.name}
                        width={32}
                        height={32}
                        className="object-cover w-full h-full"
                    />
                </div>
            ) : (
                <span className="text-base flex-shrink-0">{getIcon()}</span>
            )}

            {/* Name */}
            <span className="flex-1 text-left truncate font-medium">{entity.name}</span>

            {/* Subtitle (if exists) */}
            {entity.subtitle && (
                <span
                    className={`text-xs truncate max-w-[100px] ${isSelected ? 'text-red-100' : 'text-gray-400'}`}
                >
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
            {/* Image/Icon */}
            {entity.type === 'person' && entity.image ? (
                <div className="flex-shrink-0 w-8 h-8 rounded-full overflow-hidden bg-gray-700 ring-2 ring-red-500/50">
                    <Image
                        src={`https://image.tmdb.org/t/p/w92${entity.image}`}
                        alt={entity.name}
                        width={32}
                        height={32}
                        className="object-cover w-full h-full"
                    />
                </div>
            ) : (
                <span className="text-lg">{getIcon()}</span>
            )}

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

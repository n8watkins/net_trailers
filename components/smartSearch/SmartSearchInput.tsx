'use client'

import { useState, useRef, useEffect } from 'react'
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { useSmartSearchStore } from '../../stores/smartSearchStore'

export default function SmartSearchInput() {
    const { query, isActive, setQuery, setActive, reset } = useSmartSearchStore()

    const [localQuery, setLocalQuery] = useState(query)
    const inputRef = useRef<HTMLInputElement>(null)

    // Sync local query with store
    useEffect(() => {
        setLocalQuery(query)
    }, [query])

    const handleFocus = () => {
        setActive(true)
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value
        setLocalQuery(value)
    }

    const handleClear = () => {
        setLocalQuery('')
        setQuery('')
        reset()
        setActive(false)
        inputRef.current?.blur()
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (localQuery.trim()) {
            setQuery(localQuery.trim())
            // Trigger search logic will be handled by SmartSearchOverlay
        }
    }

    return (
        <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-20">
            <div className="w-full max-w-2xl px-4 pointer-events-auto">
                <form onSubmit={handleSubmit} className="relative">
                    <div
                        className={`
              relative flex items-center
              transition-all duration-300 ease-out
              rounded-md overflow-hidden
              ${
                  isActive
                      ? 'bg-black/50 backdrop-blur-xl shadow-2xl scale-105'
                      : 'bg-black/30 backdrop-blur-md shadow-lg'
              }
            `}
                    >
                        {/* Search Icon */}
                        <div className="absolute left-4 pointer-events-none">
                            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                        </div>

                        {/* Input */}
                        <input
                            ref={inputRef}
                            type="text"
                            value={localQuery}
                            onChange={handleChange}
                            onFocus={handleFocus}
                            placeholder="Search for movies, themes, or describe what you want to watch..."
                            className="
                w-full pl-12 pr-12 py-4
                bg-transparent text-white placeholder-gray-400
                focus:outline-none
                text-base sm:text-lg
              "
                        />

                        {/* Clear Button */}
                        {localQuery && (
                            <button
                                type="button"
                                onClick={handleClear}
                                className="
                  absolute right-4
                  p-1 rounded-full
                  hover:bg-white/10
                  transition-colors
                "
                                aria-label="Clear search"
                            >
                                <XMarkIcon className="h-5 w-5 text-gray-400 hover:text-white" />
                            </button>
                        )}
                    </div>

                    {/* Subtle hint text */}
                    {isActive && !localQuery && (
                        <p className="mt-2 text-center text-xs text-gray-400 animate-fade-in">
                            Try &quot;dark sci-fi thrillers&quot;, &quot;movies like
                            Inception&quot;, or &quot;Tarantino films&quot;
                        </p>
                    )}
                </form>
            </div>
        </div>
    )
}

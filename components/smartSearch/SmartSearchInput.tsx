'use client'

import { useState, useRef, useEffect } from 'react'
import { MagnifyingGlassIcon, XMarkIcon, SparklesIcon } from '@heroicons/react/24/outline'
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
            setActive(false)
            inputRef.current?.blur()
        }
    }

    return (
        <div className="w-full max-w-2xl mx-auto">
            <form onSubmit={handleSubmit} className="relative">
                <div
                    className={`
              relative flex items-center
              transition-all duration-300 ease-out
              rounded-md overflow-hidden border
              ${
                  isActive
                      ? 'bg-black/60 backdrop-blur-xl shadow-2xl border-red-500/50'
                      : 'bg-black/40 backdrop-blur-md shadow-lg border-white/10'
              }
            `}
                >
                    {/* AI Sparkles Icon */}
                    <div className="absolute left-3 sm:left-4 pointer-events-none">
                        <SparklesIcon className="h-4 w-4 sm:h-5 sm:w-5 text-red-400" />
                    </div>

                    {/* Input */}
                    <input
                        ref={inputRef}
                        type="text"
                        value={localQuery}
                        onChange={handleChange}
                        onFocus={handleFocus}
                        placeholder="Describe what you want to watch..."
                        className="
                w-full pl-10 sm:pl-12 pr-10 sm:pr-12 py-2.5 sm:py-3
                bg-transparent text-white placeholder-gray-400
                focus:outline-none
                text-sm sm:text-base
              "
                    />

                    {/* Clear Button OR Search Icon */}
                    {localQuery ? (
                        <button
                            type="button"
                            onClick={handleClear}
                            className="
                  absolute right-3 sm:right-4
                  p-1 rounded-full
                  hover:bg-white/10
                  transition-colors
                "
                            aria-label="Clear search"
                        >
                            <XMarkIcon className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 hover:text-white" />
                        </button>
                    ) : (
                        <div className="absolute right-3 sm:right-4 pointer-events-none">
                            <MagnifyingGlassIcon className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />
                        </div>
                    )}
                </div>

                {/* Hint text */}
                {isActive && !localQuery && (
                    <p className="mt-2 text-center text-xs text-gray-400/80 animate-fade-in">
                        Try &quot;dark sci-fi movies&quot; or use @actor :movie to tag
                    </p>
                )}
            </form>
        </div>
    )
}

'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MagnifyingGlassIcon, XMarkIcon, SparklesIcon } from '@heroicons/react/24/outline'
import { useSmartSearchStore } from '../../stores/smartSearchStore'
import { useTypewriter } from '../../hooks/useTypewriter'

export default function SmartSearchInput() {
    const router = useRouter()
    const { query, isActive, setQuery, setActive, reset } = useSmartSearchStore()

    const [localQuery, setLocalQuery] = useState(query)
    const inputRef = useRef<HTMLInputElement>(null)

    // 30 diverse search examples - dynamic parts after "I feel like watching"
    const searchExamples = [
        'neo-like characters',
        'Keanu Reeves comedies',
        'dark superheroes that find their way',
        'mind-bending time travel thrillers',
        'strong female leads in sci-fi',
        'quirky indie rom-coms',
        'heist movies with clever twists',
        'dystopian futures with hope',
        'true crime documentaries',
        'foreign films with subtitles',
        'coming-of-age stories set in the 80s',
        'Denzel Washington action films',
        'psychological thrillers that mess with your head',
        'space operas with epic battles',
        'underdog sports stories',
        'animated films that make adults cry',
        'detective mysteries with witty banter',
        'found footage horror',
        'historical dramas about royalty',
        'revenge stories with moral dilemmas',
        'buddy cop action comedies',
        'epic fantasy with dragons',
        'biographies of controversial figures',
        'romantic dramas set in Paris',
        'survival stories in extreme conditions',
        'tech thrillers about AI gone wrong',
        'feel-good movies about second chances',
        'noir films from the 40s',
        'musical biopics',
        'surreal art films that challenge reality',
    ]

    // Typing animation for the dynamic part after "I feel like watching"
    const typewriterText = useTypewriter({
        words: searchExamples,
        typeSpeed: 60,
        deleteSpeed: 30,
        delayBetweenWords: 2500,
        loop: true,
    })

    // Combine static prefix with dynamic typewriter text
    const placeholderText = typewriterText
        ? `I feel like watching ${typewriterText}...`
        : 'I feel like watching...'

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
        // Keep suggestions active, don't blur or deactivate
        inputRef.current?.focus()
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (localQuery.trim()) {
            setQuery(localQuery.trim())
            setActive(false)
            inputRef.current?.blur()
            // Navigate to smart search page with query
            router.push(`/smartsearch?q=${encodeURIComponent(localQuery.trim())}`)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="relative w-full">
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
                    <SparklesIcon className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 text-red-400" />
                </div>

                {/* Input */}
                <input
                    ref={inputRef}
                    type="text"
                    value={localQuery}
                    onChange={handleChange}
                    onFocus={handleFocus}
                    placeholder={
                        localQuery ? 'Describe what you want to watch...' : placeholderText
                    }
                    className="
                w-full pl-10 sm:pl-12 pr-10 sm:pr-12 py-4 sm:py-5
                bg-transparent text-white placeholder-gray-400
                focus:outline-none
                text-base sm:text-lg md:text-xl
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
                        <XMarkIcon className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 text-gray-400 hover:text-white" />
                    </button>
                ) : (
                    <div className="absolute right-3 sm:right-4 pointer-events-none">
                        <MagnifyingGlassIcon className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 text-gray-500" />
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
    )
}
